import { GoogleGenAI } from '@google/genai';
import { jobsManager } from './jobs-manager.js';
import { redactSecrets } from './security.js';

export interface SubagentTask {
  id: string;
  title: string;
  prompt: string;
}

export interface SubagentResult {
  id: string;
  title: string;
  status: 'succeeded' | 'failed' | 'cancelled';
  output?: string;
  error?: string;
  durationMs: number;
}

export interface SubagentRunInput {
  tasks: SubagentTask[];
  objective?: string;
  maxConcurrency?: number;
  model?: string;
}

const DEFAULT_MODEL = process.env.SUBAGENT_MODEL || 'gemini-3.8-flash';
const MAX_TASKS = 20;
const MAX_CONCURRENCY = 8;

function cleanTask(value: any, index: number): SubagentTask {
  const prompt = String(value?.prompt || '').trim();
  if (!prompt) throw new Error(`A tarefa ${index + 1} precisa de prompt.`);
  if (prompt.length > 12000) throw new Error(`O prompt da tarefa ${index + 1} excede 12.000 caracteres.`);
  return {
    id: String(value?.id || `subtask_${index + 1}`).trim().slice(0, 80),
    title: String(value?.title || `Subagente ${index + 1}`).trim().slice(0, 160),
    prompt
  };
}

export function normalizeSubagentInput(input: any): SubagentRunInput {
  const rawTasks = Array.isArray(input?.tasks) ? input.tasks : [];
  if (rawTasks.length === 0) throw new Error('Informe pelo menos uma tarefa para os subagentes.');
  if (rawTasks.length > MAX_TASKS) throw new Error(`O limite é de ${MAX_TASKS} subagentes por execução.`);
  const tasks = rawTasks.map(cleanTask);
  const duplicateIds = new Set<string>();
  for (const task of tasks) {
    if (duplicateIds.has(task.id)) throw new Error(`ID de tarefa duplicado: ${task.id}`);
    duplicateIds.add(task.id);
  }
  return {
    tasks,
    objective: String(input?.objective || '').trim().slice(0, 4000) || undefined,
    maxConcurrency: Math.min(MAX_CONCURRENCY, Math.max(1, Number(input?.maxConcurrency) || 4)),
    model: String(input?.model || DEFAULT_MODEL).trim().slice(0, 100) || DEFAULT_MODEL
  };
}

export class SubagentOrchestrator {
  private ai: GoogleGenAI | null = null;

  private getClient() {
    if (this.ai) return this.ai;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY ou GOOGLE_API_KEY não configurada.');
    this.ai = new GoogleGenAI({ apiKey });
    return this.ai;
  }

  createRun(input: any) {
    const normalized = normalizeSubagentInput(input);
    const job = jobsManager.createJob(
      `Subagentes paralelos: ${normalized.objective || normalized.tasks.length + ' tarefas'}`,
      'parallel_subagents'
    );
    void this.execute(job.id, normalized);
    return { jobId: job.id, taskCount: normalized.tasks.length, maxConcurrency: normalized.maxConcurrency, status: job.status };
  }

  private async execute(jobId: string, input: SubagentRunInput) {
    const results: SubagentResult[] = [];
    let nextIndex = 0;
    const workerCount = Math.min(input.maxConcurrency || 4, input.tasks.length);

    const worker = async () => {
      while (true) {
        const index = nextIndex++;
        const task = input.tasks[index];
        if (!task) return;
        const started = Date.now();
        const job = jobsManager.getJob(jobId);
        if (!job || job.status === 'cancelled') {
          results.push({ id: task.id, title: task.title, status: 'cancelled', durationMs: Date.now() - started });
          continue;
        }
        jobsManager.updateProgress(jobId, Math.round((results.length / input.tasks.length) * 100), `Executando ${task.title}`, `Subagente ${task.id} iniciado.`);
        try {
          const response = await this.getClient().models.generateContent({
            model: input.model || DEFAULT_MODEL,
            contents: [{
              role: 'user',
              parts: [{ text: [
                'Você é um subagente especializado. Trabalhe somente na tarefa abaixo.',
                'Não revele cadeia de pensamento privada; retorne apenas conclusões, evidências, riscos e próximos passos.',
                `Objetivo geral: ${input.objective || 'não especificado'}`,
                `Tarefa: ${task.title}`,
                task.prompt
              ].join('\n\n') }]
            }],
            config: {
              systemInstruction: 'Responda em português, de forma objetiva e verificável. Não execute ações externas, não invente resultados e não inclua segredos.',
              responseMimeType: 'text/plain'
            }
          });
          const output = response.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('').trim() || 'Subagente concluiu sem texto de saída.';
          results.push({ id: task.id, title: task.title, status: 'succeeded', output, durationMs: Date.now() - started });
          jobsManager.addLog(jobId, `Subagente ${task.id} concluído.`);
        } catch (error: any) {
          const message = redactSecrets(error?.message || String(error));
          results.push({ id: task.id, title: task.title, status: 'failed', error: message, durationMs: Date.now() - started });
          jobsManager.addLog(jobId, `Subagente ${task.id} falhou: ${message}`, 'error');
        }
        jobsManager.updateProgress(jobId, Math.round((results.length / input.tasks.length) * 100), `Progresso: ${results.length}/${input.tasks.length} subagentes concluídos.`);
      }
    };

    try {
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
      const finalJob = jobsManager.getJob(jobId);
      if (finalJob?.status === 'cancelled') return;
      const ordered = input.tasks.map(task => results.find(result => result.id === task.id)).filter(Boolean);
      const failed = ordered.filter(result => result?.status === 'failed').length;
      jobsManager.completeJob(jobId, {
        objective: input.objective,
        model: input.model,
        total: ordered.length,
        succeeded: ordered.filter(result => result?.status === 'succeeded').length,
        failed,
        results: ordered
      });
    } catch (error: any) {
      jobsManager.failJob(jobId, redactSecrets(error?.message || String(error)));
    }
  }
}

export const subagentOrchestrator = new SubagentOrchestrator();
