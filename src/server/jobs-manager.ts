import { redactSecrets } from './security.js';

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
  }

  addLog(id: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const job = this.jobs.get(id);
    if (!job) return;

    job.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message: redactSecrets(message)
    });
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
  }

  failJob(id: string, error: string) {
    const job = this.jobs.get(id);
    if (!job || job.status === 'cancelled') return;

    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.error = redactSecrets(error);
    job.currentStep = `Falha: ${job.error}`;
    this.addLog(id, `Erro na execução: ${job.error}`, 'error');
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

    return true;
  }

  private sanitizeJob(job: AgentJob): AgentJob {
    const copy = { ...job };
    delete copy.abortController;
    return copy;
  }
}

export const jobsManager = new JobsManager();
