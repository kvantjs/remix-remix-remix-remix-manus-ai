import crypto from 'crypto';
import { databaseAvailable, query } from './database.js';
import { type AuthenticatedUser } from './auth.js';
import { redactSecrets } from './security.js';

function serviceConfig() {
  return { base: process.env.KOPILOT_API_URL?.replace(/\/$/, ''), key: process.env.KOPILOT_API_KEY };
}

function safeObjectKey(input: string) {
  const key = String(input || '').trim();
  if (!key || key.length > 480 || !/^[\x21-\x7e]+$/.test(key) || key.includes('..') || key.startsWith('/')) {
    throw new Error('Chave de Storage inválida. Use somente caracteres ASCII sem path traversal.');
  }
  return key;
}

async function presign(operation: 'put' | 'get', key: string) {
  const { base, key: apiKey } = serviceConfig();
  if (!base || !apiKey) throw new Error('KOPILOT_API_URL ou KOPILOT_API_KEY indisponível no servidor.');
  const response = await fetch(`${base}/v1/storage/presign/${operation}?path=${encodeURIComponent(key)}`, {
    headers: { authorization: `Bearer ${apiKey}` }
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) throw new Error(redactSecrets(body.error || `Falha no presign de Storage (${response.status}).`));
  return String(body.url);
}

export async function createUpload(user: AuthenticatedUser, requestedKey: string, metadata: { name?: string; mimeType?: string; sizeBytes?: number }) {
  const key = safeObjectKey(requestedKey);
  const uploadUrl = await presign('put', key);
  const stableUrl = `/kopilot-storage/${key}`;
  const objectId = crypto.randomUUID();
  if (databaseAvailable()) {
    await query(
      `INSERT INTO storage_objects (object_id, open_id, object_key, stable_url, original_name, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (object_key) DO UPDATE SET object_id = EXCLUDED.object_id, open_id = EXCLUDED.open_id, original_name = EXCLUDED.original_name, mime_type = EXCLUDED.mime_type, size_bytes = EXCLUDED.size_bytes, status = 'active', deleted_at = NULL`,
      [objectId, user.openId, key, stableUrl, metadata.name || null, metadata.mimeType || null, metadata.sizeBytes || null]
    );
  }
  return { objectId, key, stableUrl, uploadUrl, expiresInSeconds: 3600 };
}

export async function createDownloadUrl(requestedKey: string) {
  const key = safeObjectKey(requestedKey);
  return { key, stableUrl: `/kopilot-storage/${key}`, downloadUrl: await presign('get', key), expiresInSeconds: 3600 };
}

export async function listObjects(user: AuthenticatedUser) {
  if (!databaseAvailable()) return [];
  const rows: any[] = await query(
    `SELECT object_id AS "objectId", object_key AS "objectKey", stable_url AS "stableUrl", original_name AS "originalName", mime_type AS "mimeType", size_bytes AS "sizeBytes", status, created_at AS "createdAt"
     FROM storage_objects WHERE open_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 200`,
    [user.openId]
  );
  return rows.map((row) => ({ ...row, sizeBytes: row.sizeBytes == null ? null : Number(row.sizeBytes) }));
}

export async function softDeleteObject(user: AuthenticatedUser, objectId: string) {
  if (!databaseAvailable()) return false;
  const result: any = await query(
    `UPDATE storage_objects SET status = 'deleted', deleted_at = NOW() WHERE object_id = ? AND open_id = ? AND status = 'active'`,
    [objectId, user.openId]
  );
  return Number(result.affectedRows || 0) === 1;
}
