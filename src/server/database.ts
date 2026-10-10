import { Pool, type PoolClient } from 'pg';
import { readFile } from 'node:fs/promises';

let pool: Pool | null = null;

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL || '';
}

export function databaseAvailable() {
  return Boolean(getDatabaseUrl());
}

function getPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return null;
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    throw new Error('DATABASE_URL precisa ser uma URL PostgreSQL (postgres:// ou postgresql://).');
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 6,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });
    pool.on('error', () => {
      // Driver errors may contain a connection string; never print them verbatim.
      console.warn('[Database] Erro numa conexão ociosa do PostgreSQL.');
    });
  }
  return pool;
}

/** Convert MySQL-style parameter markers to PostgreSQL markers without touching quoted text/comments. */
export function toPostgresPlaceholders(sql: string) {
  let result = '';
  let index = 0;
  let parameterIndex = 0;
  let singleQuoted = false;
  let doubleQuoted = false;
  let lineComment = false;
  let blockComment = 0;

  while (index < sql.length) {
    const current = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      result += current;
      if (current === '\n') lineComment = false;
      index += 1;
      continue;
    }
    if (blockComment > 0) {
      if (current === '/' && next === '*') {
        result += '/*';
        blockComment += 1;
        index += 2;
      } else if (current === '*' && next === '/') {
        result += '*/';
        blockComment -= 1;
        index += 2;
      } else {
        result += current;
        index += 1;
      }
      continue;
    }
    if (!singleQuoted && !doubleQuoted && current === '-' && next === '-') {
      result += '--';
      lineComment = true;
      index += 2;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && current === '/' && next === '*') {
      result += '/*';
      blockComment = 1;
      index += 2;
      continue;
    }
    if (singleQuoted && current === "'" && next === "'") {
      result += "''";
      index += 2;
      continue;
    }
    if (doubleQuoted && current === '"' && next === '"') {
      result += '""';
      index += 2;
      continue;
    }
    if (!doubleQuoted && current === "'") singleQuoted = !singleQuoted;
    else if (!singleQuoted && current === '"') doubleQuoted = !doubleQuoted;

    const nextToken = current === '?' ? sql.slice(index + 1).match(/\S/)?.[0] : undefined;
    const isJsonOperator = current === '?' && (next === '|' || next === '&' || nextToken === "'" || nextToken === '"');
    if (!singleQuoted && !doubleQuoted && current === '?' && !isJsonOperator) {
      parameterIndex += 1;
      result += `$${parameterIndex}`;
    } else {
      result += current;
    }
    index += 1;
  }
  return result;
}

export async function query<T = any>(sql: string, params: unknown[] = []): Promise<T> {
  const connectionPool = getPool();
  if (!connectionPool) throw new Error('DATABASE_URL não foi configurada.');
  const result = await connectionPool.query(toPostgresPlaceholders(sql), params as any[]);
  if (result.command === 'SELECT' || result.command === 'SHOW' || result.command === 'VALUES') {
    return result.rows as T;
  }
  return { affectedRows: result.rowCount ?? 0, insertId: 0 } as T;
}

export async function ensureDatabaseSchema() {
  const connectionPool = getPool();
  if (!connectionPool) return { available: false, migrated: false };

  let client: PoolClient | undefined;
  try {
    client = await connectionPool.connect();
    await client.query('BEGIN');
    const migration = await readFile(new URL('./migrations/001_postgresql.sql', import.meta.url), 'utf8');
    for (const statement of migration.split(';').map((part) => part.trim()).filter(Boolean)) {
      await client.query(statement);
    }
    await client.query(
      `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING`,
      ['001_postgresql']
    );
    await client.query('COMMIT');
    return { available: true, migrated: true };
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client?.release();
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
