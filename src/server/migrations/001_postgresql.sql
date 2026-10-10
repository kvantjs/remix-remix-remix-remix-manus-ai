CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_users (
  open_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  platforms_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_registry (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  project_path TEXT NOT NULL,
  repo_url TEXT,
  branch TEXT NOT NULL DEFAULT 'main',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_versions (
  version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  short_sha TEXT NOT NULL,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS project_versions_project_committed_idx
  ON project_versions (project_id, committed_at DESC);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL,
  open_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, open_id)
);
CREATE INDEX IF NOT EXISTS project_members_open_id_idx ON project_members (open_id);

CREATE TABLE IF NOT EXISTS project_audit_log (
  audit_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  open_id TEXT,
  action TEXT NOT NULL,
  target_path TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_audit_log_project_created_idx
  ON project_audit_log (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS storage_objects (
  object_id TEXT PRIMARY KEY,
  open_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  stable_url TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS storage_objects_owner_active_created_idx
  ON storage_objects (open_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS job_records (
  job_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS job_records_updated_idx ON job_records (updated_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_runs (
  run_id TEXT PRIMARY KEY,
  task_uid TEXT NOT NULL,
  run_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
