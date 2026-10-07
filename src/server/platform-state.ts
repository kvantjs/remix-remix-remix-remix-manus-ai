import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export type PlatformFeatures = {
  server: boolean;
  database: boolean;
  storage: boolean;
  authentication: boolean;
  ai: boolean;
  scheduledWork: boolean;
  payments: boolean;
};

export type PlatformConfig = {
  version: 1;
  revision: number;
  project: {
    name: string;
    description: string;
  };
  features: PlatformFeatures;
  runtime: {
    port: number;
    healthPath: string;
    distribution: string;
    cloudProvider: string;
  };
  routes: Array<{ path: string; title?: string }>;
  updatedAt: string;
};

const stateDir = path.resolve(process.cwd(), '.kvant');
const stateFile = path.join(stateDir, 'platform.json');

const defaultConfig: PlatformConfig = {
  version: 1,
  revision: 1,
  project: {
    name: 'Remix Manus AI',
    description: 'Aplicação full-stack criada no Google AI Studio e integrada ao Webdev.'
  },
  features: {
    server: true,
    database: true,
    storage: false,
    authentication: false,
    ai: true,
    scheduledWork: false,
    payments: false
  },
  runtime: {
    port: Number(process.env.PORT) || 3000,
    healthPath: '/health',
    distribution: process.env.RUNTIME_DISTRIBUTION || 'Ubuntu 24.04',
    cloudProvider: process.env.CLOUD_PROVIDER || 'container'
  },
  routes: [{ path: '/', title: 'Remix Manus AI' }],
  updatedAt: new Date().toISOString()
};

let cachedConfig: PlatformConfig | null = null;

function normalizeConfig(input: Partial<PlatformConfig>, current: PlatformConfig): PlatformConfig {
  const next: PlatformConfig = {
    ...current,
    ...input,
    project: { ...current.project, ...(input.project || {}) },
    features: { ...current.features, ...(input.features || {}) },
    runtime: { ...current.runtime, ...(input.runtime || {}) },
    routes: input.routes || current.routes,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString()
  };

  if (!Number.isInteger(next.runtime.port) || next.runtime.port < 1024 || next.runtime.port > 65535) {
    throw new Error('runtime.port deve estar entre 1024 e 65535');
  }
  if (!next.runtime.healthPath.startsWith('/') || next.runtime.healthPath.includes('..')) {
    throw new Error('runtime.healthPath inválido');
  }
  if (!Array.isArray(next.routes) || next.routes.length > 1000) {
    throw new Error('routes deve ser uma lista com no máximo 1000 entradas');
  }
  for (const route of next.routes) {
    if (!route.path.startsWith('/') || route.path.includes('..') || /[\u0000-\u0020]/.test(route.path)) {
      throw new Error(`Rota inválida: ${route.path}`);
    }
  }
  return next;
}

export async function loadPlatformConfig(): Promise<PlatformConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    cachedConfig = normalizeConfig(JSON.parse(raw), defaultConfig);
  } catch {
    cachedConfig = defaultConfig;
    await savePlatformConfig(cachedConfig);
  }
  return cachedConfig;
}

export async function savePlatformConfig(input: Partial<PlatformConfig>): Promise<PlatformConfig> {
  const current = cachedConfig || defaultConfig;
  const next = normalizeConfig(input, current);
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(next, null, 2) + '\n', 'utf8');
  cachedConfig = next;
  return next;
}

export async function getPlatformOverview() {
  const config = await loadPlatformConfig();
  const memory = process.memoryUsage();
  let osRelease = 'unknown';
  try {
    const release = await fs.readFile('/etc/os-release', 'utf8');
    osRelease = release.match(/^PRETTY_NAME="?([^"\n]+)"?/m)?.[1] || osRelease;
  } catch {
    // O endpoint continua funcional em runtimes sem /etc/os-release.
  }
  return {
    config,
    runtime: {
      pid: process.pid,
      hostname: os.hostname(),
      platform: process.platform,
      arch: process.arch,
      distribution: config.runtime.distribution,
      osRelease,
      cloudProvider: config.runtime.cloudProvider,
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024)
      }
    },
    secrets: ['GEMINI_API_KEY', 'APP_URL'].map((key) => ({
      key,
      configured: Boolean(process.env[key]),
      value: '<redacted>'
    }))
  };
}
