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

export async function query<T extends RowDataPacket[] | ResultSetHeader[]>(sql: string, params: unknown[] = []): Promise<T> {
  const activePool = getPool();
  if (!activePool) throw new Error('DATABASE_URL não está disponível no runtime atual.');
  const [rows] = await (activePool.execute as any)(sql, params) as [T, unknown];
  return rows;
}

export async function ensureDatabaseSchema() {
  const activePool = getPool();
  if (!activePool) return { available: false, migrated: false };

  await activePool.query(`
    CREATE TABLE IF NOT EXISTS platform_users (
      open_id VARCHAR(191) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320) NULL,
      platforms_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      session_id CHAR(64) PRIMARY KEY,
      open_id VARCHAR(191) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_agent VARCHAR(512) NULL,
      INDEX idx_sessions_open_id (open_id),
      INDEX idx_sessions_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS job_records (
      job_id VARCHAR(96) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      type VARCHAR(120) NOT NULL,
      status VARCHAR(40) NOT NULL,
      payload_json JSON NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_jobs_created_at (created_at),
      INDEX idx_jobs_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS storage_objects (
      object_id CHAR(36) PRIMARY KEY,
      open_id VARCHAR(191) NULL,
      object_key VARCHAR(512) NOT NULL,
      stable_url VARCHAR(1024) NOT NULL,
      original_name VARCHAR(255) NULL,
      mime_type VARCHAR(255) NULL,
      size_bytes BIGINT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_storage_object_key (object_key),
      INDEX idx_storage_owner (open_id),
      INDEX idx_storage_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_runs (
      run_id CHAR(36) PRIMARY KEY,
      task_uid VARCHAR(191) NOT NULL,
      run_key VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL,
      result_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME NULL,
      UNIQUE KEY uq_scheduled_task_run (task_uid, run_key),
      INDEX idx_scheduled_task (task_uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS project_registry (
      project_id VARCHAR(96) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(96) NOT NULL UNIQUE,
      project_path VARCHAR(1024) NOT NULL,
      repo_url VARCHAR(1024) NULL,
      branch VARCHAR(255) NOT NULL DEFAULT 'main',
      active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      INDEX idx_projects_active (active),
      INDEX idx_projects_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS project_versions (
      version_id CHAR(40) PRIMARY KEY,
      project_id VARCHAR(96) NOT NULL,
      short_sha CHAR(12) NOT NULL,
      author VARCHAR(255) NOT NULL,
      message VARCHAR(500) NOT NULL,
      committed_at DATETIME NOT NULL,
      UNIQUE KEY uq_project_version (project_id, version_id),
      INDEX idx_versions_project (project_id, committed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id VARCHAR(96) NOT NULL,
      open_id VARCHAR(191) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320) NULL,
      role ENUM('owner', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (project_id, open_id),
      INDEX idx_project_members_user (open_id),
      INDEX idx_project_members_role (project_id, role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await activePool.query(`
    CREATE TABLE IF NOT EXISTS project_audit_log (
      audit_id CHAR(36) PRIMARY KEY,
      project_id VARCHAR(96) NOT NULL,
      open_id VARCHAR(191) NULL,
      action VARCHAR(96) NOT NULL,
      target_path VARCHAR(1024) NULL,
      metadata_json JSON NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_project_audit_project (project_id, created_at),
      INDEX idx_project_audit_user (open_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return { available: true, migrated: true };
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
