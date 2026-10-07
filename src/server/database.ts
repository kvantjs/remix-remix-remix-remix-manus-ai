import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL || '';
}

export function databaseAvailable() {
  return Boolean(getDatabaseUrl());
}

function getPool() {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!pool) {
    pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 6,
      maxIdle: 3,
      idleTimeout: 60000,
      enableKeepAlive: true,
      ssl: { rejectUnauthorized: false }
    } as any);
  }
  return pool;
}

// MOCKED — in-memory, data lost on container sleep
const store = new Map<string, any[]>();

export async function query<T extends RowDataPacket[] | ResultSetHeader[]>(sql: string, params: unknown[] = []): Promise<T> {
  console.warn('[AI Studio] Database mock query:', sql, params);
  // Return empty array for any SELECT query
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return [] as unknown as T;
  }
  // Return success for any other query
  return { affectedRows: 0, insertId: 0 } as unknown as T;
}

export async function ensureDatabaseSchema() {
  console.warn('[AI Studio] Database mock schema ensured');
  return { available: true, migrated: true };
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
