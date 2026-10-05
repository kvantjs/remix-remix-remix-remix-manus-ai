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
      id: 'remix-manus-ai',
      name: 'Remix Manus AI',
      slug: 'remix-manus-ai',
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

async function mirrorToDatabase(project: ProjectRecord) {
  if (!databaseAvailable()) return;
  try {
    await query(
      `INSERT INTO project_registry (project_id, name, slug, project_path, repo_url, branch, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), repo_url = VALUES(repo_url), branch = VALUES(branch), active = VALUES(active), updated_at = VALUES(updated_at)`,
      [project.id, project.name, project.slug, project.path, project.repoUrl || null, project.branch, project.active ? 1 : 0, project.createdAt.slice(0, 19).replace('T', ' '), project.updatedAt.slice(0, 19).replace('T', ' ')]
    );
  } catch (error) {
    console.warn('[Projects] Falha ao sincronizar projeto no banco:', error);
  }
}

export async function listProjects() {
  const projects = await readRegistry();
  for (const project of projects) void mirrorToDatabase(project);
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
  await git(projectPath, ['-c', 'user.name=Manus AI', '-c', 'user.email=manus-ai@users.noreply.github.com', 'commit', '-m', 'chore: initialize project']);
  const now = new Date().toISOString();
  const project: ProjectRecord = { id: randomUUID(), name, slug, path: projectPath, repoUrl, branch: 'main', active: false, createdAt: now, updatedAt: now };
  await writeRegistry([...projects.map((item) => ({ ...item, active: false })), project]);
  void mirrorToDatabase(project);
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
    for (const version of versions) {
      void query(
        `INSERT INTO project_versions (version_id, project_id, short_sha, author, message, committed_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE short_sha = VALUES(short_sha), author = VALUES(author), message = VALUES(message), committed_at = VALUES(committed_at)`,
        [version.sha, project.id, version.shortSha, version.author, version.message, version.date.slice(0, 19).replace('T', ' ')]
      ).catch((error) => console.warn('[Projects] Falha ao sincronizar versão:', error));
    }
  }
  return versions;
}

export async function createSnapshot(project: ProjectRecord, message: string) {
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage || cleanMessage.length > 200) throw new Error('A mensagem do snapshot deve ter entre 1 e 200 caracteres.');
  await git(project.path, ['add', '-A']);
  const before = await git(project.path, ['status', '--porcelain']);
  if (!before.stdout.trim()) return { created: false, reason: 'Nenhuma alteração pendente.', versions: await projectVersions(project, 1) };
  await git(project.path, ['-c', 'user.name=Manus AI', '-c', 'user.email=manus-ai@users.noreply.github.com', 'commit', '-m', cleanMessage]);
  const versions = await projectVersions(project, 1);
  return { created: true, version: versions[0] };
}

export async function syncProjectToGitHub(project: ProjectRecord) {
  const result = await git(project.path, ['push', 'github', project.branch]);
  return { ok: true, branch: project.branch, output: `${result.stdout}${result.stderr}`.trim(), version: (await projectVersions(project, 1))[0] };
}
