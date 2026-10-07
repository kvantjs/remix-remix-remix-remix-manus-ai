import { GetCommandInvocationCommand, SendCommandCommand, SSMClient } from '@aws-sdk/client-ssm';
import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { redactSecrets, SANDBOX_WORKSPACE_ROOT } from './security.js';

export type SandboxProgress = {
  stream: 'stdout' | 'stderr';
  chunk: string;
  done?: boolean;
  exitCode?: number;
};

export type SandboxExecutionResult = {
  command: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  workingDir: string;
  backend: 'aws-ssm' | 'local-isolated';
  instanceId?: string;
};

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function sandboxMode(): 'aws-ssm' | 'local-isolated' {
  return process.env.AWS_SANDBOX_MODE === 'ssm' && process.env.AWS_SSM_INSTANCE_ID ? 'aws-ssm' : 'local-isolated';
}

async function executeLocal(command: string, timeoutMs: number, onProgress?: (event: SandboxProgress) => void): Promise<SandboxExecutionResult> {
  const started = performance.now();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let timedOut = false;

  await new Promise<void>((resolve) => {
    const child = spawn(command, {
      cwd: SANDBOX_WORKSPACE_ROOT,
      shell: '/bin/bash',
      env: { ...process.env, HOME: SANDBOX_WORKSPACE_ROOT, WORKSPACE: SANDBOX_WORKSPACE_ROOT, PAGER: 'cat' }
    });
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      exitCode = 124;
      child.kill('SIGTERM');
      onProgress?.({ stream: 'stderr', chunk: `\n[timeout] comando interrompido após ${Math.round(timeoutMs / 1000)}s.\n` });
      setTimeout(() => child.kill('SIGKILL'), 250);
    }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      const text = redactSecrets(chunk.toString());
      stdout += text;
      onProgress?.({ stream: 'stdout', chunk: text });
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = redactSecrets(chunk.toString());
      stderr += text;
      onProgress?.({ stream: 'stderr', chunk: text });
    });
    child.on('error', (error) => {
      stderr += error.message;
      exitCode = 1;
      onProgress?.({ stream: 'stderr', chunk: redactSecrets(error.message) });
      clearTimeout(timer);
      finish();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (!timedOut) exitCode = code ?? 0;
      onProgress?.({ stream: exitCode === 0 ? 'stdout' : 'stderr', chunk: '', done: true, exitCode });
      finish();
    });
  });

  return {
    command,
    exitCode,
    timedOut,
    durationMs: Math.round(performance.now() - started),
    stdout: stdout.slice(0, 16000),
    stderr: stderr.slice(0, 8000),
    workingDir: 'workspace/',
    backend: 'local-isolated'
  };
}

async function executeAwsSsm(command: string, timeoutMs: number, onProgress?: (event: SandboxProgress) => void): Promise<SandboxExecutionResult> {
  const started = performance.now();
  const instanceId = process.env.AWS_SSM_INSTANCE_ID!;
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) throw new Error('AWS_REGION é obrigatório quando AWS_SANDBOX_MODE=ssm.');

  const client = new SSMClient({ region });
  const workspace = process.env.AWS_SANDBOX_WORKSPACE || '/opt/kvant/workspace';
  const remoteCommand = `mkdir -p ${shellQuote(workspace)} && cd ${shellQuote(workspace)} && bash -lc ${shellQuote(command)}`;
  const sent = await client.send(new SendCommandCommand({
    InstanceIds: [instanceId],
    DocumentName: 'AWS-RunShellScript',
    TimeoutSeconds: Math.max(1, Math.ceil(timeoutMs / 1000)),
    Parameters: { commands: [remoteCommand] },
    Comment: 'Kvant Agent isolated sandbox command'
  }));
  const commandId = sent.Command?.CommandId;
  if (!commandId) throw new Error('AWS SSM não retornou CommandId.');

  const deadline = Date.now() + timeoutMs + 5000;
  let stdout = '';
  let stderr = '';
  let status = 'Pending';
  while (Date.now() < deadline) {
    let invocation;
    try {
      invocation = await client.send(new GetCommandInvocationCommand({ CommandId: commandId, InstanceId: instanceId }));
    } catch (error: any) {
      if (error?.name !== 'InvocationDoesNotExist') throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
    status = invocation.Status || status;
    const nextOut = invocation.StandardOutputContent || '';
    const nextErr = invocation.StandardErrorContent || '';
    if (nextOut.length > stdout.length) {
      const chunk = redactSecrets(nextOut.slice(stdout.length));
      stdout = nextOut;
      onProgress?.({ stream: 'stdout', chunk });
    }
    if (nextErr.length > stderr.length) {
      const chunk = redactSecrets(nextErr.slice(stderr.length));
      stderr = nextErr;
      onProgress?.({ stream: 'stderr', chunk });
    }
    if (['Success', 'Failed', 'Cancelled', 'TimedOut', 'Undeliverable', 'Terminated'].includes(status)) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const timedOut = !['Success', 'Failed', 'Cancelled', 'Undeliverable', 'Terminated'].includes(status);
  const exitCode = timedOut ? 124 : status === 'Success' ? 0 : 1;
  if (timedOut) onProgress?.({ stream: 'stderr', chunk: '\n[timeout] AWS SSM não concluiu dentro do limite.\n' });
  onProgress?.({ stream: exitCode === 0 ? 'stdout' : 'stderr', chunk: '', done: true, exitCode });
  return {
    command,
    exitCode,
    timedOut,
    durationMs: Math.round(performance.now() - started),
    stdout: redactSecrets(stdout.slice(0, 16000)),
    stderr: redactSecrets(stderr.slice(0, 8000)),
    workingDir: workspace,
    backend: 'aws-ssm',
    instanceId
  };
}

export async function executeSandboxCommand(command: string, timeoutMs: number, onProgress?: (event: SandboxProgress) => void) {
  if (sandboxMode() === 'aws-ssm') return executeAwsSsm(command, timeoutMs, onProgress);
  return executeLocal(command, timeoutMs, onProgress);
}

export function getSandboxBackend() {
  return {
    mode: sandboxMode(),
    configuredForAws: Boolean(process.env.AWS_SSM_INSTANCE_ID && (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION)),
    instanceId: process.env.AWS_SSM_INSTANCE_ID || null,
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null,
    workspace: process.env.AWS_SANDBOX_WORKSPACE || (sandboxMode() === 'aws-ssm' ? '/opt/kvant/workspace' : SANDBOX_WORKSPACE_ROOT)
  };
}
