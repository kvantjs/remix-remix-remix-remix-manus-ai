import { redactSecrets } from './security.js';
import fs from 'fs';
import path from 'path';
import { databaseAvailable, query } from './database.js';

export type JobStatus = 
  | 'queued' 
  | 'running' 
  | 'waiting_for_approval' 
  | 'succeeded' 
  | 'failed' 
  | 'cancelled' 
  | 'timed_out';

export interface JobArtifact {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  downloadUrl: string;
}

export interface JobLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'step';
  message: string;
}

export interface JobApprovalRequest {
  actionName: string;
  details: Record<string, any>;
  riskLevel: 'medium' | 'high';
  reason: string;
  requestedAt: string;
  decision?: 'approved' | 'rejected';
  decidedAt?: string;
}

export interface AgentJob {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  progressPercent: number;
  currentStep: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  logs: JobLogEntry[];
  artifacts: JobArtifact[];
  approval?: JobApprovalRequest;
  error?: string;
  result?: any;
  abortController?: AbortController;
}

class JobsManager {
  private jobs: Map<string, AgentJob> = new Map();
  private readonly stateFile = path.resolve(process.cwd(), '.kvant/jobs.json');

  constructor() {
    this.restore();
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
      const serializable = Array.from(this.jobs.values()).map((job) => {
        const copy = { ...job } as Partial<AgentJob>;
        delete copy.abortController;
        return copy;
      });
      fs.writeFileSync(this.stateFile, JSON.stringify(serializable, null, 2) + '\n', 'utf8');
      void this.persistDatabase(serializable);
    } catch (error) {
      console.warn('[JobsManager] Não foi possível persistir os jobs:', error);
    }
  }

  private async persistDatabase(jobs: Array<Partial<AgentJob>>) {
    if (!databaseAvailable()) return;
    for (const job of jobs) {
      if (!job.id || !job.title || !job.type || !job.status || !job.createdAt) continue;
      try {
        const payload = JSON.stringify(job);
        const updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const createdAt = new Date(job.createdAt).toISOString().slice(0, 19).replace('T', ' ');
        await query(
          `INSERT INTO job_records (job_id, title, type, status, payload_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (job_id) DO UPDATE SET title = EXCLUDED.title, type = EXCLUDED.type, status = EXCLUDED.status, payload_json = EXCLUDED.payload_json, updated_at = EXCLUDED.updated_at`,
          [job.id, job.title, job.type, job.status, payload, createdAt, updatedAt]
        );
      } catch (error) {
        console.warn('[JobsManager] Falha ao sincronizar job com o banco:', error);
      }
    }
  }

  async hydrateFromDatabase() {
    if (!databaseAvailable()) return;
    try {
      const rows: any[] = await query('SELECT payload_json AS payload FROM job_records ORDER BY updated_at DESC LIMIT 200');
      for (const row of rows) {
        if (!row.payload) continue;
        const job = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
        if (!job?.id || this.jobs.has(job.id)) continue;
        job.abortController = new AbortController();
        this.jobs.set(job.id, job as AgentJob);
      }
    } catch (error) {
      console.warn('[JobsManager] Falha ao recuperar jobs do banco:', error);
    }
  }

  private restore() {
    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      const saved = JSON.parse(raw) as AgentJob[];
      for (const job of saved) {
        if (job.status === 'queued' || job.status === 'running' || job.status === 'waiting_for_approval') {
          job.status = 'failed';
          job.finishedAt = new Date().toISOString();
          job.error = 'Processo reiniciado antes da conclusão do job.';
          job.currentStep = 'Interrompido durante a recuperação do processo';
        }
        job.abortController = new AbortController();
        this.jobs.set(job.id, job);
      }
    } catch {
      // Primeiro boot ou arquivo ainda inexistente.
    }
  }

  createJob(title: string, type: string, approval?: JobApprovalRequest): AgentJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: AgentJob = {
      id,
      title,
      type,
      status: approval ? 'waiting_for_approval' : 'queued',
      progressPercent: 0,
      currentStep: approval ? 'Aguardando autorização do usuário' : 'Na fila de execução...',
      createdAt: new Date().toISOString(),
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Job criado [${type}]: "${title}"`
        }
      ],
      artifacts: [],
      approval,
      abortController: new AbortController()
    };

    this.jobs.set(id, job);
    this.persist();
    return this.sanitizeJob(job);
  }

  getJob(id: string): AgentJob | null {
    const job = this.jobs.get(id);
    if (!job) return null;
    return this.sanitizeJob(job);
  }

  listJobs(limit = 30): AgentJob[] {
    const list = Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list.slice(0, limit).map(j => this.sanitizeJob(j));
  }

  updateProgress(id: string, progressPercent: number, stepName: string, logMsg?: string) {
    const job = this.jobs.get(id);
    if (!job || job.status === 'cancelled' || job.status === 'timed_out') return;

    job.status = 'running';
    if (!job.startedAt) job.startedAt = new Date().toISOString();
    job.progressPercent = Math.min(100, Math.max(0, progressPercent));
    job.currentStep = stepName;

    if (logMsg) {
      job.logs.push({
        timestamp: new Date().toISOString(),
        level: 'step',
        message: redactSecrets(logMsg)
      });
    }
    this.persist();
  }

  addLog(id: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const job = this.jobs.get(id);
    if (!job) return;

    job.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message: redactSecrets(message)
    });
    this.persist();
  }

  addArtifact(id: string, name: string, filePath: string, sizeBytes: number, mimeType = 'text/plain'): JobArtifact {
    const job = this.jobs.get(id);
    const artId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const artifact: JobArtifact = {
      id: artId,
      name,
      path: filePath,
      sizeBytes,
      mimeType,
      createdAt: new Date().toISOString(),
      downloadUrl: `/api/artifacts/${artId}/download`
    };

    if (job) {
      job.artifacts.push(artifact);
      this.addLog(id, `Artefato gerado com sucesso: ${name} (${Math.round(sizeBytes / 1024)} KB)`);
    }
    this.persist();
    return artifact;
  }

  completeJob(id: string, result?: any) {
    const job = this.jobs.get(id);
    if (!job || job.status === 'cancelled') return;

    job.status = 'succeeded';
    job.progressPercent = 100;
    job.currentStep = 'Concluído com sucesso';
    job.finishedAt = new Date().toISOString();
    if (job.startedAt) {
      job.durationMs = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime();
    }
    job.result = result;
    this.addLog(id, `Job finalizado com êxito em ${job.durationMs ? (job.durationMs / 1000).toFixed(1) + 's' : '0s'}`);
    this.persist();
  }

  failJob(id: string, error: string) {
    const job = this.jobs.get(id);
    if (!job || job.status === 'cancelled') return;

    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.error = redactSecrets(error);
    job.currentStep = `Falha: ${job.error}`;
    this.addLog(id, `Erro na execução: ${job.error}`, 'error');
    this.persist();
  }

  cancelJob(id: string, reason = 'Cancelado pelo usuário'): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === 'succeeded' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    job.finishedAt = new Date().toISOString();
    job.currentStep = 'Cancelado';
    if (job.abortController) {
      job.abortController.abort(reason);
    }
    this.addLog(id, `Job interrompido: ${reason}`, 'warn');
    this.persist();
    return true;
  }

  handleApproval(id: string, approved: boolean): boolean {
    const job = this.jobs.get(id);
    if (!job || !job.approval || job.approval.decision) return false;

    job.approval.decision = approved ? 'approved' : 'rejected';
    job.approval.decidedAt = new Date().toISOString();

    if (approved) {
      job.status = 'queued';
      job.currentStep = 'Aprovado pelo usuário. Iniciando processamento...';
      this.addLog(id, `Ação autorizada pelo usuário: ${job.approval.actionName}`);
    } else {
      job.status = 'cancelled';
      job.finishedAt = new Date().toISOString();
      job.currentStep = 'Ação rejeitada pelo usuário';
      this.addLog(id, `Ação cancelada: o usuário recusou a autorização`, 'warn');
    }

    this.persist();
    return true;
  }

  private sanitizeJob(job: AgentJob): AgentJob {
    const copy = { ...job };
    delete copy.abortController;
    return copy;
  }
}

export const jobsManager = new JobsManager();
