import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { databaseAvailable, query } from './database.js';
import type { AuthenticatedUser } from './auth.js';

export type ProjectRole = 'owner' | 'editor' | 'viewer';
export type ProjectMember = { projectId: string; openId: string; name: string; email?: string; role: ProjectRole; createdAt: string; updatedAt: string };

const root = path.resolve(process.cwd());
const localFile = path.join(root, '.kvant', 'project-members.json');
const roleRank: Record<ProjectRole, number> = { viewer: 1, editor: 2, owner: 3 };

async function readLocal(): Promise<ProjectMember[]> {
  try { return JSON.parse(await fs.readFile(localFile, 'utf8')) as ProjectMember[]; } catch { return []; }
}

async function writeLocal(members: ProjectMember[]) {
  await fs.mkdir(path.dirname(localFile), { recursive: true });
  await fs.writeFile(localFile, JSON.stringify(members, null, 2) + '\n', 'utf8');
}

function toMember(row: any): ProjectMember {
  return { projectId: String(row.project_id || row.projectId), openId: String(row.open_id || row.openId), name: String(row.name || row.openId || row.open_id), email: row.email ? String(row.email) : undefined, role: row.role as ProjectRole, createdAt: new Date(row.created_at || row.createdAt).toISOString(), updatedAt: new Date(row.updated_at || row.updatedAt).toISOString() };
}

export async function getProjectRole(projectId: string, user: AuthenticatedUser | null): Promise<ProjectRole | null> {
  if (!process.env.KOPILOT_JWT_SECRET) return 'owner';
  if (!user) return null;
  if (process.env.KOPILOT_PROJECT_OWNER_OPEN_ID && user.openId === process.env.KOPILOT_PROJECT_OWNER_OPEN_ID) return 'owner';
  if (databaseAvailable()) {
    const rows = await query<any[]>(`SELECT project_id, open_id, name, email, role, created_at, updated_at FROM project_members WHERE project_id = ? AND open_id = ? LIMIT 1`, [projectId, user.openId]);
    return rows[0]?.role || null;
  }
  const member = (await readLocal()).find((item) => item.projectId === projectId && item.openId === user.openId);
  return member?.role || null;
}

export function hasProjectRole(actual: ProjectRole | null, required: ProjectRole) {
  return Boolean(actual && roleRank[actual] >= roleRank[required]);
}

export async function listProjectMembers(projectId: string) {
  if (databaseAvailable()) {
    const rows = await query<any[]>(`SELECT project_id, open_id, name, email, role, created_at, updated_at FROM project_members WHERE project_id = ? ORDER BY FIELD(role, 'owner', 'editor', 'viewer'), name`, [projectId]);
    return rows.map(toMember);
  }
  return (await readLocal()).filter((item) => item.projectId === projectId);
}

export async function upsertProjectMember(projectId: string, user: { openId: string; name: string; email?: string }, role: ProjectRole) {
  const now = new Date().toISOString();
  if (databaseAvailable()) {
    await query(`INSERT INTO project_members (project_id, open_id, name, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), role = VALUES(role), updated_at = VALUES(updated_at)`, [projectId, user.openId, user.name || user.openId, user.email || null, role, now.slice(0, 19).replace('T', ' '), now.slice(0, 19).replace('T', ' ')]);
  } else {
    const members = await readLocal();
    const existing = members.find((item) => item.projectId === projectId && item.openId === user.openId);
    const member: ProjectMember = { projectId, openId: user.openId, name: user.name || user.openId, email: user.email, role, createdAt: existing?.createdAt || now, updatedAt: now };
    await writeLocal(existing ? members.map((item) => item === existing ? member : item) : [...members, member]);
  }
  return { projectId, openId: user.openId, role };
}

export async function removeProjectMember(projectId: string, openId: string) {
  if (databaseAvailable()) await query(`DELETE FROM project_members WHERE project_id = ? AND open_id = ? AND role <> 'owner'`, [projectId, openId]);
  else await writeLocal((await readLocal()).filter((item) => !(item.projectId === projectId && item.openId === openId && item.role !== 'owner')));
  return { removed: true, projectId, openId };
}

export async function ensureProjectOwner(projectId: string, user: AuthenticatedUser | null) {
  if (!user) return null;
  const current = await getProjectRole(projectId, user);
  if (!current) return upsertProjectMember(projectId, user, 'owner');
  return { projectId, openId: user.openId, role: current };
}

export async function auditProjectAction(projectId: string, user: AuthenticatedUser | null, action: string, targetPath?: string, metadata?: unknown) {
  const createdAt = new Date().toISOString();
  if (databaseAvailable()) {
    await query(`INSERT INTO project_audit_log (audit_id, project_id, open_id, action, target_path, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, [randomUUID(), projectId, user?.openId || null, action, targetPath || null, JSON.stringify(metadata || null), createdAt.slice(0, 19).replace('T', ' ')]);
  } else {
    const file = path.join(root, '.kvant', 'project-audit.jsonl');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify({ auditId: randomUUID(), projectId, openId: user?.openId || null, action, targetPath, metadata, createdAt }) + '\n', 'utf8');
  }
}

export async function listProjectAudit(projectId: string, limit = 100) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100));
  if (databaseAvailable()) {
    return query<any[]>(`SELECT audit_id AS auditId, project_id AS projectId, open_id AS openId, action, target_path AS targetPath, metadata_json AS metadata, created_at AS createdAt FROM project_audit_log WHERE project_id = ? ORDER BY created_at DESC LIMIT ${safeLimit}`, [projectId]);
  }
  try {
    const lines = (await fs.readFile(path.join(root, '.kvant', 'project-audit.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((item) => item.projectId === projectId);
    return lines.slice(-safeLimit).reverse();
  } catch { return []; }
}
