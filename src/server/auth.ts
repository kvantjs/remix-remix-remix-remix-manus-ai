import crypto from 'crypto';
import type { Request, Response } from 'express';
import { query, databaseAvailable } from './database.js';
import { redactSecrets } from './security.js';

export const APP_SESSION_COOKIE = 'webdev_app_session';
const OAUTH_STATE_COOKIE = 'kvant_oauth_state';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

type JwtClaims = {
  openId?: string;
  name?: string;
  email?: string;
  appId?: string;
  exp?: number;
  [key: string]: unknown;
};

export type AuthenticatedUser = {
  openId: string;
  name: string;
  email?: string;
  platforms?: unknown;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [part.trim(), ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

export function getCookie(req: Request, name: string) {
  return parseCookies(req.headers.cookie)[name] || '';
}

function serializeCookie(name: string, value: string, options: Record<string, string | number | boolean> = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyHs256Jwt(token: string, secret = process.env.MANUS_JWT_SECRET || ''): JwtClaims | null {
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (header.alg !== 'HS256') return null;
    const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
    const received = Buffer.from(parts[2], 'base64url');
    if (!safeEqual(expected, received)) return null;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtClaims;
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (process.env.MANUS_PROJECT_ID && claims.appId !== process.env.MANUS_PROJECT_ID) return null;
    return claims;
  } catch {
    return null;
  }
}

function signSession(user: AuthenticatedUser) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    openId: user.openId,
    name: user.name,
    email: user.email,
    appId: process.env.MANUS_PROJECT_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', process.env.MANUS_JWT_SECRET || '').update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

async function storeUser(user: AuthenticatedUser & { platforms?: unknown }) {
  if (!databaseAvailable()) return;
  await query(
    `INSERT INTO platform_users (open_id, name, email, platforms_json)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), platforms_json = VALUES(platforms_json)`,
    [user.openId, user.name || user.openId, user.email || null, JSON.stringify(user.platforms || null)]
  );
}

function getPublicOrigin(req: Request, requestedOrigin?: string) {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (requestedOrigin) {
    const parsed = new URL(requestedOrigin);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.origin;
  }
  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0];
  return `${forwardedProto}://${forwardedHost}`;
}

export function beginOAuth(req: Request, res: Response, requestedOrigin?: string) {
  const portal = process.env.MANUS_OAUTH_PORTAL_URL;
  const appId = process.env.MANUS_PROJECT_ID;
  if (!portal || !appId) throw new Error('MANUS_OAUTH_PORTAL_URL ou MANUS_PROJECT_ID indisponível.');
  const origin = getPublicOrigin(req, requestedOrigin);
  const redirectUri = `${origin}/api/auth/callback`;
  const nonce = crypto.randomBytes(24).toString('hex');
  const state = base64Url(JSON.stringify({ redirectUri, nonce, issuedAt: Date.now() }));
  res.setHeader('Set-Cookie', serializeCookie(OAUTH_STATE_COOKIE, state, {
    maxAge: 600, path: '/api/auth', httpOnly: true, secure: true, sameSite: 'None'
  }));
  const url = new URL(`${portal.replace(/\/$/, '')}/app-auth`);
  url.searchParams.set('appId', appId);
  url.searchParams.set('redirectUri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('responseType', 'code');
  return url.toString();
}

async function exchangeCode(code: string, redirectUri: string) {
  const base = process.env.MANUS_OAUTH_API_URL;
  const clientId = process.env.MANUS_PROJECT_ID;
  if (!base || !clientId) throw new Error('Configuração OAuth do Sparkle indisponível.');
  const exchange = await fetch(`${base.replace(/\/$/, '')}/webdev.v1.WebDevAuthPublicService/ExchangeToken`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId, grantType: 'authorization_code', code, redirectUri })
  });
  const exchangeBody: any = await exchange.json().catch(() => ({}));
  if (!exchange.ok || !exchangeBody.accessToken) throw new Error(redactSecrets(exchangeBody.error?.message || exchangeBody.error || 'Falha ao trocar o código OAuth.'));
  const identity = await fetch(`${base.replace(/\/$/, '')}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${exchangeBody.accessToken}` },
    body: JSON.stringify({ accessToken: exchangeBody.accessToken })
  });
  const userBody: any = await identity.json().catch(() => ({}));
  if (!identity.ok || !userBody.openId) throw new Error(redactSecrets(userBody.error?.message || userBody.error || 'Falha ao carregar identidade OAuth.'));
  return {
    user: { openId: userBody.openId, name: userBody.name || userBody.email || userBody.openId, email: userBody.email, platforms: userBody.platforms },
    refreshToken: exchangeBody.refreshToken
  };
}

export async function finishOAuth(req: Request, res: Response, code: string, state: string) {
  const cookies = parseCookies(req.headers.cookie);
  const expected = cookies[OAUTH_STATE_COOKIE];
  if (!expected || expected !== state) throw new Error('State OAuth inválido ou expirado.');
  const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { redirectUri: string; issuedAt: number };
  if (!decoded.redirectUri || Date.now() - decoded.issuedAt > 10 * 60 * 1000) throw new Error('State OAuth expirado.');
  const { user } = await exchangeCode(code, decoded.redirectUri);
  await storeUser(user);
  if (!process.env.MANUS_JWT_SECRET) throw new Error('MANUS_JWT_SECRET indisponível para criar a sessão.');
  const token = signSession(user);
  res.setHeader('Set-Cookie', [
    serializeCookie(APP_SESSION_COOKIE, token, { maxAge: SESSION_SECONDS, path: '/', httpOnly: true, secure: true, sameSite: 'None' }),
    serializeCookie(OAUTH_STATE_COOKIE, '', { maxAge: 0, path: '/api/auth', httpOnly: true, secure: true, sameSite: 'None' })
  ]);
  return user;
}

export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const cookies = parseCookies(req.headers.cookie);
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const claims = verifyHs256Jwt(cookies[APP_SESSION_COOKIE] || bearer);
  if (!claims?.openId) return null;
  return { openId: String(claims.openId), name: String(claims.name || claims.openId), email: claims.email ? String(claims.email) : undefined };
}

export function clearSession(res: Response) {
  res.setHeader('Set-Cookie', serializeCookie(APP_SESSION_COOKIE, '', { maxAge: 0, path: '/', httpOnly: true, secure: true, sameSite: 'None' }));
}

export function getScheduledClaims(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const claims = verifyHs256Jwt(cookies.app_session_id || '');
  if (!claims?.openId || !String(claims.openId).startsWith('cron_')) return null;
  return claims;
}

export async function resolveScheduledIdentity(jwt: string) {
  const base = process.env.MANUS_OAUTH_API_URL;
  const projectId = process.env.MANUS_PROJECT_ID;
  if (!base || !projectId) throw new Error('Configuração de identidade agendada indisponível.');
  const response = await fetch(`${base.replace(/\/$/, '')}/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jwt_token: jwt, project_id: projectId })
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || !body.taskUid) throw new Error(redactSecrets(body.error?.message || body.error || 'Não foi possível resolver a identidade agendada.'));
  return body as { openId: string; projectId: string; name?: string; taskUid: string };
}
