import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type OpenManusEvent = { event: string; [key: string]: any };

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const bridge = path.join(repoRoot, 'openmanus', 'ui_bridge.py');

export function runOpenManus(payload: Record<string, unknown>, onEvent: (event: OpenManusEvent) => void, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const python = process.env.OPENMANUS_PYTHON || path.join(repoRoot, '.openmanus-venv/bin/python');
    const child = spawn(python, [bridge], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: path.join(repoRoot, 'openmanus'),
        OPENMANUS_WORKSPACE_ROOT: process.env.OPENMANUS_WORKSPACE_ROOT || repoRoot,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let buffer = '';
    let stderr = '';
    let settled = false;
    const finish = (fn: () => void) => { if (!settled) { settled = true; fn(); } };
    const abort = () => { child.kill('SIGTERM'); };
    if (signal) {
      if (signal.aborted) abort();
      signal.addEventListener('abort', abort, { once: true });
    }
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try { onEvent(JSON.parse(line)); }
        catch { onEvent({ event: 'status', text: line.trim() }); }
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.on('error', (error) => finish(() => reject(error)));
    child.on('close', (code, closeSignal) => {
      if (buffer.trim()) {
        try { onEvent(JSON.parse(buffer)); } catch { onEvent({ event: 'status', text: buffer.trim() }); }
      }
      if (code && code !== 0 && closeSignal !== 'SIGTERM') {
        onEvent({ event: 'error', message: stderr.trim() || `OpenManus terminou com código ${code}` });
      }
      finish(() => resolve(code ?? 0));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
