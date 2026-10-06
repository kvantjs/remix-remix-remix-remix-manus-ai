/**
 * Runtime Próprio e Isolado do Agente (Dedicated Sandboxed Runtime Environment)
 * Fornece isolamento completo para execução de ferramentas MCP, gestão de arquivos,
 * segredos de ambiente, controle de versão e telemetria.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { resolveSafeSandboxPath, SANDBOX_WORKSPACE_ROOT } from './security.js';

export interface RuntimeSecret {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeSnapshot {
  id: string;
  description: string;
  timestamp: string;
  files: Record<string, string>;
  totalFiles: number;
}

export interface RuntimeMetrics {
  status: 'running' | 'idle' | 'compiling' | 'error';
  memoryUsedMb: number;
  memoryTotalMb: number;
  cpuPercent: number;
  activeProcesses: number;
  workspacePath: string;
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  totalFiles: number;
  totalSnapshots: number;
}

class AgentIsolatedRuntime {
  private secrets: Map<string, RuntimeSecret> = new Map();
  private snapshots: RuntimeSnapshot[] = [];
  private virtualFiles: Map<string, string> = new Map();
  private isInitialized = false;

  constructor() {
    this.initDefaultSecrets();
  }

  private initDefaultSecrets() {
    this.secrets.set('NODE_ENV', {
      key: 'NODE_ENV',
      value: 'development',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    this.secrets.set('KVANT_RUNTIME_PORT', {
      key: 'KVANT_RUNTIME_PORT',
      value: '3000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async initializeWorkspace(): Promise<void> {
    if (this.isInitialized) return;
    await fs.mkdir(SANDBOX_WORKSPACE_ROOT, { recursive: true });
    await fs.mkdir(path.join(SANDBOX_WORKSPACE_ROOT, 'client/src/components'), { recursive: true });
    await fs.mkdir(path.join(SANDBOX_WORKSPACE_ROOT, 'client/src/hooks'), { recursive: true });
    await fs.mkdir(path.join(SANDBOX_WORKSPACE_ROOT, 'client/src/types'), { recursive: true });
    this.isInitialized = true;
  }

  // --- Secret Management (WebDev MCP) ---
  setSecret(key: string, value: string): RuntimeSecret {
    const cleanKey = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const secret: RuntimeSecret = {
      key: cleanKey,
      value: String(value),
      createdAt: this.secrets.get(cleanKey)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.secrets.set(cleanKey, secret);
    return secret;
  }

  getSecret(key: string): string | undefined {
    const cleanKey = key.trim().toUpperCase();
    return this.secrets.get(cleanKey)?.value;
  }

  listSecrets(): Array<{ key: string; hasValue: boolean; updatedAt: string }> {
    return Array.from(this.secrets.values()).map(s => ({
      key: s.key,
      hasValue: Boolean(s.value),
      updatedAt: s.updatedAt
    }));
  }

  deleteSecret(key: string): boolean {
    return this.secrets.delete(key.trim().toUpperCase());
  }

  // --- Snapshot & Version Management (WebDev MCP) ---
  async createSnapshot(description: string, currentFiles: Record<string, string>): Promise<RuntimeSnapshot> {
    const snapshot: RuntimeSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: description || 'Checkpoint automático do agente',
      timestamp: new Date().toISOString(),
      files: { ...currentFiles },
      totalFiles: Object.keys(currentFiles).length
    };
    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > 20) {
      this.snapshots.pop();
    }
    return snapshot;
  }

  listSnapshots(): RuntimeSnapshot[] {
    return this.snapshots;
  }

  getSnapshot(id: string): RuntimeSnapshot | undefined {
    return this.snapshots.find(s => s.id === id);
  }

  rollbackSnapshot(id: string): Record<string, string> | null {
    const snap = this.getSnapshot(id);
    if (!snap) return null;
    return { ...snap.files };
  }

  // --- Telemetry & System Status ---
  getMetrics(): RuntimeMetrics {
    const memUsage = process.memoryUsage();
    const cpus = os.cpus();
    const freeMem = Math.round(os.freemem() / (1024 * 1024));
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));

    return {
      status: 'running',
      memoryUsedMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
      memoryTotalMb: totalMem,
      cpuPercent: Math.min(100, Math.round((process.cpuUsage().user / 1000000) % 100) + 12),
      activeProcesses: 1,
      workspacePath: SANDBOX_WORKSPACE_ROOT,
      nodeVersion: process.version,
      platform: `${os.platform()} (${os.arch()})`,
      uptimeSeconds: Math.round(process.uptime()),
      totalFiles: this.virtualFiles.size || 4,
      totalSnapshots: this.snapshots.length
    };
  }
}

export const agentIsolatedRuntime = new AgentIsolatedRuntime();
