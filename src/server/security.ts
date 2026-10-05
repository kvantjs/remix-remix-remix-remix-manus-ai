import path from 'path';

// Redact known secrets, tokens, keys and sensitive patterns from logs and outputs
export function redactSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/(?:AIza[0-9A-Za-z-_]{35})/g, '[REDACTED_GEMINI_KEY]')
    .replace(/(?:sk-[a-zA-Z0-9_-]{20,})/g, '[REDACTED_API_KEY]')
    .replace(/(?:bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(?:password|secret|token|apikey|api_key|auth_token)\s*[:=]\s*["']?([^\s"'&,;]+)["']?/gi, (match, val) => {
      if (val && val.length > 3) {
        return match.replace(val, '[REDACTED]');
      }
      return match;
    })
    .replace(/(?:https?:\/\/[^:\/\s]+:)([^@\/\s]+)(?:@[^\/\s]+)/g, (match, pass) => {
      return match.replace(pass, '[REDACTED_PASS]');
    });
}

// Workspace root for sandboxed file operations
export const SANDBOX_WORKSPACE_ROOT = path.resolve(process.cwd(), 'workspace');

// Sanitize path and ensure it stays strictly within the sandboxed workspace directory
export function resolveSafeSandboxPath(userPath: string, rootDir = SANDBOX_WORKSPACE_ROOT): { safePath: string | null; error?: string } {
  if (!userPath || typeof userPath !== 'string') {
    return { safePath: null, error: 'Caminho de arquivo inválido' };
  }

  // Prevent null bytes
  if (userPath.includes('\0')) {
    return { safePath: null, error: 'Tentativa de injeção de byte nulo detectada' };
  }

  // Normalize path
  const normalized = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.resolve(rootDir, normalized);

  // Strict boundary check
  if (!absolutePath.startsWith(rootDir)) {
    return { safePath: null, error: 'Acesso negado: o caminho ultrapassa a área de trabalho isolada (Sandbox Traversal Protegido)' };
  }

  return { safePath: absolutePath };
}

// Check against dangerous SSRF destinations (e.g. AWS/GCP metadata endpoints)
export function isSafeUrl(urlStr: string): { isSafe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isSafe: false, reason: 'Apenas protocolos HTTP e HTTPS são permitidos' };
    }

    const host = parsed.hostname.toLowerCase();
    
    // Cloud metadata endpoints
    if (
      host === '169.254.169.254' || 
      host === 'metadata.google.internal' || 
      host === 'metadata.google' ||
      host === 'instance-data' ||
      host === '100.100.100.200'
    ) {
      return { isSafe: false, reason: 'Acesso bloqueado: Endpoints de metadados internos de nuvem protegidos' };
    }

    return { isSafe: true };
  } catch (err: any) {
    return { isSafe: false, reason: 'URL inválida ou malformada' };
  }
}
