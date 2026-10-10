import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { databaseAvailable, query } from './database.js';
import { redactSecrets } from './security.js';

const execFileAsync = promisify(execFile);
const root = path.resolve(process.cwd());
const registryDir = path.join(root, '.kvant');
const registryFile = path.join(registryDir, 'projects.json');

function cleanGitOutput(value: string) {
  return redactSecrets(value).replace(/\u001b\[[0-?]*[ -\/]*[@-~]/g, '');
}

export type ProjectRecord = {
  id: string;
  name: string;
  slug: string;
  path: string;
  repoUrl?: string;
  branch: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function slugify(value: string) {
  const slug = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  if (!slug) throw new Error('Nome de projeto inválido.');
  return slug;
}

function resolveProjectFile(project: ProjectRecord, requestedPath: string) {
  const relativePath = String(requestedPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!relativePath || relativePath.includes('\0') || relativePath.startsWith('.git/') || relativePath === '.git' || relativePath.includes('/.git/')) {
    throw new Error('Caminho de arquivo inválido ou protegido.');
  }
  const absolutePath = path.resolve(project.path, relativePath);
  const projectRoot = path.resolve(project.path);
  if (absolutePath !== projectRoot && !absolutePath.startsWith(`${projectRoot}${path.sep}`)) throw new Error('Caminho fora do projeto.');
  return { relativePath, absolutePath };
}

async function git(projectPath: string, args: string[]) {
  try {
    const result = await execFileAsync('git', ['-C', projectPath, ...args], {
      cwd: root,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
    return { stdout: cleanGitOutput(result.stdout), stderr: cleanGitOutput(result.stderr) };
  } catch (error: any) {
    throw new Error(redactSecrets(error?.stderr || error?.message || String(error)));
  }
}

async function readRegistry(): Promise<ProjectRecord[]> {
  try {
    const raw = await fs.readFile(registryFile, 'utf8');
    return JSON.parse(raw) as ProjectRecord[];
  } catch {
    const now = new Date().toISOString();
    const projects: ProjectRecord[] = [{
      id: 'remix-kopilot-ai',
      name: 'Remix Kopilot AI',
      slug: 'remix-kopilot-ai',
      path: root,
      repoUrl: 'https://github.com/kvantjs/remix-remix-remix-remix-manus-ai',
      branch: 'main',
      active: true,
      createdAt: now,
      updatedAt: now
    }];
    await writeRegistry(projects);
    return projects;
  }
}

async function writeRegistry(projects: ProjectRecord[]) {
  await fs.mkdir(registryDir, { recursive: true });
  await fs.writeFile(registryFile, JSON.stringify(projects, null, 2) + '\n', 'utf8');
}

async function readProjectsFromDatabase(): Promise<ProjectRecord[]> {
  const rows: any[] = await query(
    `SELECT project_id AS id, name, slug, project_path AS path, repo_url AS "repoUrl", branch, active, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM project_registry ORDER BY active DESC, updated_at DESC`
  );
  return rows.map((row) => ({
    id: String(row.id), name: String(row.name), slug: String(row.slug), path: String(row.path),
    repoUrl: row.repoUrl ? String(row.repoUrl) : undefined, branch: String(row.branch || 'main'), active: Boolean(row.active),
    createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString(),
  }));
}

async function mirrorToDatabase(project: ProjectRecord) {
  if (!databaseAvailable()) return;
  try {
    await query(
      `INSERT INTO project_registry (project_id, name, slug, project_path, repo_url, branch, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (project_id) DO UPDATE SET name = EXCLUDED.name, repo_url = EXCLUDED.repo_url, branch = EXCLUDED.branch, active = EXCLUDED.active, updated_at = EXCLUDED.updated_at`,
      [project.id, project.name, project.slug, project.path, project.repoUrl || null, project.branch, Boolean(project.active), project.createdAt.slice(0, 19).replace('T', ' '), project.updatedAt.slice(0, 19).replace('T', ' ')]
    );
  } catch (error) {
    console.warn('[Projects] Falha ao sincronizar projeto no banco:', error);
  }
}

export async function listProjects() {
  if (databaseAvailable()) {
    try {
      const persisted = await readProjectsFromDatabase();
      if (persisted.length) {
        await writeRegistry(persisted);
        return persisted;
      }
    } catch (error: any) {
      console.warn('[Projects] Falha ao carregar projetos do banco:', redactSecrets(error?.message || String(error)));
    }
  }
  const projects = await readRegistry();
  if (databaseAvailable()) await Promise.all(projects.map(mirrorToDatabase));
  return projects;
}

export async function getProject(id: string) {
  const projects = await listProjects();
  const project = projects.find((item) => item.id === id);
  if (!project) throw new Error('Projeto não encontrado.');
  return project;
}

export async function createProject(name: string, repoUrl?: string) {
  const projects = await listProjects();
  const slug = slugify(name);
  if (projects.some((project) => project.slug === slug)) throw new Error('Já existe um projeto com esse nome.');
  const projectPath = path.join(root, 'projects', slug);
  await fs.mkdir(projectPath, { recursive: true });
  await fs.writeFile(path.join(projectPath, 'README.md'), `# ${name}\n\nProjeto criado pelo Workspace.\n`, 'utf8');
  await git(projectPath, ['init', '-b', 'main']);
  await git(projectPath, ['add', 'README.md']);
  await git(projectPath, ['-c', 'user.name=Kopilot AI', '-c', 'user.email=kopilot-ai@users.noreply.github.com', 'commit', '-m', 'chore: initialize project']);
  const now = new Date().toISOString();
  const project: ProjectRecord = { id: randomUUID(), name, slug, path: projectPath, repoUrl, branch: 'main', active: false, createdAt: now, updatedAt: now };
  await writeRegistry([...projects.map((item) => ({ ...item, active: false })), project]);
  await mirrorToDatabase(project);
  return project;
}

export async function projectStatus(project: ProjectRecord) {
  const [status, remotes, head] = await Promise.all([
    git(project.path, ['status', '--short', '--branch']),
    git(project.path, ['remote', '-v']).catch(() => ({ stdout: '', stderr: '' })),
    git(project.path, ['rev-parse', 'HEAD'])
  ]);
  const remoteEntries = remotes.stdout.trim().split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^\s*([^\s]+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) return { name: 'unknown', url: line };
    return { name: match[1], url: match[2].includes('artifacts.cloudflare.net') ? '<managed-webdev>' : match[2], direction: match[3] };
  });
  return { projectId: project.id, branch: project.branch, head: head.stdout.trim(), status: status.stdout.trim().split('\n').filter(Boolean), remotes: remoteEntries };
}

export async function projectVersions(project: ProjectRecord, limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const history = await git(project.path, ['log', `-${safeLimit}`, '--date=iso-strict', '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s']);
  const versions = history.stdout.trim().split('\n').filter(Boolean).map((line) => {
    const [sha, shortSha, author, date, message] = line.split('\x1f');
    return { sha, shortSha, author, date, message };
  });
  if (databaseAvailable()) {
    await Promise.all(versions.map((version) =>
      query(
        `INSERT INTO project_versions (version_id, project_id, short_sha, author, message, committed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (version_id) DO UPDATE SET short_sha = EXCLUDED.short_sha, author = EXCLUDED.author, message = EXCLUDED.message, committed_at = EXCLUDED.committed_at`,
        [version.sha, project.id, version.shortSha, version.author, version.message, version.date.slice(0, 19).replace('T', ' ')]
      ).catch((error) => console.warn('[Projects] Falha ao sincronizar versão:', redactSecrets(error?.message || String(error))))
    ));
  }
  return versions;
}

export async function createSnapshot(project: ProjectRecord, message: string) {
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage || cleanMessage.length > 200) throw new Error('A mensagem do snapshot deve ter entre 1 e 200 caracteres.');
  await git(project.path, ['add', '-A']);
  const before = await git(project.path, ['status', '--porcelain']);
  if (!before.stdout.trim()) return { created: false, reason: 'Nenhuma alteração pendente.', versions: await projectVersions(project, 1) };
  await git(project.path, ['-c', 'user.name=Kopilot AI', '-c', 'user.email=kopilot-ai@users.noreply.github.com', 'commit', '-m', cleanMessage]);
  const versions = await projectVersions(project, 1);
  return { created: true, version: versions[0] };
}

export async function syncProjectToGitHub(project: ProjectRecord) {
  const result = await git(project.path, ['push', 'github', project.branch]);
  return { ok: true, branch: project.branch, output: `${result.stdout}${result.stderr}`.trim(), version: (await projectVersions(project, 1))[0] };
}

export async function listProjectFiles(project: ProjectRecord, requestedDirectory = '') {
  const { absolutePath } = requestedDirectory ? resolveProjectFile(project, requestedDirectory) : { absolutePath: project.path };
  const files: Array<{ path: string; name: string; type: 'file' | 'directory'; sizeBytes?: number }> = [];
  async function walk(current: string) {
    if (files.length >= 1000) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.kvant') continue;
      const full = path.join(current, entry.name);
      const relative = path.relative(project.path, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        files.push({ path: relative, name: entry.name, type: 'directory' });
        await walk(full);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        files.push({ path: relative, name: entry.name, type: 'file', sizeBytes: stat.size });
      }
      if (files.length >= 1000) return;
    }
  }
  await walk(absolutePath);
  return files;
}

export async function readProjectFile(project: ProjectRecord, requestedPath: string) {
  const { relativePath, absolutePath } = resolveProjectFile(project, requestedPath);
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) throw new Error('O caminho informado não é um arquivo.');
  if (stat.size > 2 * 1024 * 1024) throw new Error('Arquivo excede o limite de leitura de 2 MB.');
  return { path: relativePath, content: await fs.readFile(absolutePath, 'utf8'), sizeBytes: stat.size, updatedAt: stat.mtime.toISOString() };
}

export async function writeProjectFile(project: ProjectRecord, requestedPath: string, content: string) {
  const { relativePath, absolutePath } = resolveProjectFile(project, requestedPath);
  if (Buffer.byteLength(String(content || ''), 'utf8') > 2 * 1024 * 1024) throw new Error('Arquivo excede o limite de escrita de 2 MB.');
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, String(content || ''), 'utf8');
  const stat = await fs.stat(absolutePath);
  return { path: relativePath, sizeBytes: stat.size, updatedAt: stat.mtime.toISOString() };
}

export async function deleteProjectFile(project: ProjectRecord, requestedPath: string) {
  const { relativePath, absolutePath } = resolveProjectFile(project, requestedPath);
  const stat = await fs.stat(absolutePath);
  if (!stat.isFile()) throw new Error('Somente arquivos podem ser removidos por esta API.');
  await fs.unlink(absolutePath);
  return { deleted: true, path: relativePath };
}

function safeRevision(value: unknown, fallback: string) {
  const revision = String(value || fallback);
  if (!/^(HEAD|[0-9a-f]{7,40})$/.test(revision)) throw new Error('Revisão Git inválida.');
  return revision;
}

export async function diffProjectFile(project: ProjectRecord, requestedPath: string, from?: unknown, to?: unknown) {
  const { relativePath } = resolveProjectFile(project, requestedPath);
  const base = safeRevision(from, 'HEAD');
  const target = to ? safeRevision(to, 'HEAD') : '';
  const args = target ? ['diff', '--no-ext-diff', base, target, '--', relativePath] : ['diff', '--no-ext-diff', base, '--', relativePath];
  const result = await git(project.path, args);
  return { path: relativePath, from: base, to: target || 'WORKTREE', diff: result.stdout };
}

export async function restoreProjectFiles(project: ProjectRecord, revision: unknown, requestedPaths: unknown, confirmed: boolean) {
  if (!confirmed) throw new Error('A restauração exige confirm=true no corpo da requisição.');
  const source = safeRevision(revision, 'HEAD');
  const paths = Array.isArray(requestedPaths) ? requestedPaths.map((item) => resolveProjectFile(project, String(item)).relativePath) : [];
  if (!paths.length) throw new Error('Informe pelo menos um arquivo para restaurar.');
  await git(project.path, ['restore', `--source=${source}`, '--worktree', '--staged', '--', ...paths]);
  return { restored: true, source, paths, status: await projectStatus(project) };
}
