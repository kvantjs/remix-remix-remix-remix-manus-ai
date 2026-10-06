import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { resolveSafeSandboxPath, redactSecrets, isSafeUrl, SANDBOX_WORKSPACE_ROOT } from './security.js';
import { jobsManager, AgentJob, JobApprovalRequest } from './jobs-manager.js';
import { challengeMessage } from './browser-challenge.js';
import { agentIsolatedRuntime } from './agent-isolated-runtime.js';

const execAsync = util.promisify(exec);

// Gemini Function Declarations Schema conforming to @google/genai SDK
export const AGENT_TOOL_DECLARATIONS = [
  {
    name: 'web_search',
    description: 'Pesquisa na web utilizando o mecanismo de busca autônomo livre e o navegador próprio antidesafio/sem CAPTCHA do agente, retornando contexto atualizado das páginas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Termo ou pergunta de busca para pesquisar na web.'
        },
        maxResults: {
          type: 'INTEGER',
          description: 'Número máximo de resultados a retornar (padrão: 5, máximo: 10).'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'web_fetch',
    description: 'Acessa uma página web pública e extrai seu conteúdo textual legível, título e metadados para leitura e análise.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: {
          type: 'STRING',
          description: 'URL completa (http:// ou https://) da página a ser consultada.'
        },
        focus: {
          type: 'STRING',
          description: 'Tópico ou pergunta específica para guiar a extração do conteúdo relevante da página.'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'bash_exec',
    description: 'Executa comandos shell Linux em uma área de trabalho isolada (sandbox) com limites de tempo e recursos, retornando exitCode, stdout e stderr.',
    parameters: {
      type: 'OBJECT',
      properties: {
        command: {
          type: 'STRING',
          description: 'Comando bash a ser executado (ex: npm test, ls -la, curl, git status, etc.).'
        },
        timeoutSeconds: {
          type: 'INTEGER',
          description: 'Tempo limite de execução em segundos (padrão: 15s, máximo: 30s).'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'python_exec',
    description: 'Executa código Python 3 no ambiente computacional isolado para cálculos, análise de dados ou automações.',
    parameters: {
      type: 'OBJECT',
      properties: {
        code: {
          type: 'STRING',
          description: 'Código Python a ser executado.'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'file_create_directory',
    description: 'Cria uma nova pasta ou diretório no workspace (ex: client/src/components, lib, utils, styles).',
    parameters: {
      type: 'OBJECT',
      properties: {
        directoryPath: {
          type: 'STRING',
          description: 'Caminho relativo da nova pasta dentro do workspace.'
        }
      },
      required: ['directoryPath']
    }
  },
  {
    name: 'file_list',
    description: 'Lista arquivos e diretórios da área de trabalho isolada do usuário/tarefa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        subDirectory: {
          type: 'STRING',
          description: 'Subdiretório relativo para listar (deixe vazio para a raiz do workspace).'
        }
      }
    }
  },
  {
    name: 'file_read',
    description: 'Lê o conteúdo textual de um arquivo dentro do workspace isolado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filePath: {
          type: 'STRING',
          description: 'Caminho relativo do arquivo a ser lido dentro do workspace.'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'file_write',
    description: 'Cria ou sobrescreve um arquivo de texto na área de trabalho isolada.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filePath: {
          type: 'STRING',
          description: 'Caminho relativo onde o arquivo será salvo no workspace.'
        },
        content: {
          type: 'STRING',
          description: 'Conteúdo textual do arquivo.'
        }
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'file_delete',
    description: 'Remove um arquivo ou diretório do workspace isolado. Ações destrutivas importantes exigirão aprovação humana.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filePath: {
          type: 'STRING',
          description: 'Caminho relativo do arquivo ou pasta a ser excluído.'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'browser_navigate',
    description: 'Navega para uma página web em uma sessão isolada de navegador Playwright Chromium, capturando status, título, conteúdo e screenshot.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: {
          type: 'STRING',
          description: 'Endereço web completo ou nome de domínio para navegar.'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_inspect',
    description: 'Inspeciona elementos interativos, formulários, botões e links da página web atualmente aberta no navegador.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'browser_click',
    description: 'Clica em um elemento da página (botão, link, campo) e confirma o novo estado da página.',
    parameters: {
      type: 'OBJECT',
      properties: {
        selectorOrText: {
          type: 'STRING',
          description: 'Seletor CSS ou texto visível do elemento a ser clicado.'
        }
      },
      required: ['selectorOrText']
    }
  },
  {
    name: 'browser_type',
    description: 'Digita texto em um campo de formulário ou caixa de busca no navegador.',
    parameters: {
      type: 'OBJECT',
      properties: {
        text: {
          type: 'STRING',
          description: 'Texto a ser digitado.'
        },
        selector: {
          type: 'STRING',
          description: 'Seletor CSS do campo (opcional, seleciona primeiro input ativo por padrão).'
        },
        pressEnter: {
          type: 'BOOLEAN',
          description: 'Se deve pressionar Enter após digitar.'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'browser_scroll',
    description: 'Rola a página real do navegador Playwright em uma etapa observável e captura o novo contexto e screenshot.',
    parameters: {
      type: 'OBJECT',
      properties: {
        deltaY: {
          type: 'INTEGER',
          description: 'Quantidade de pixels para rolar; padrão 500.'
        }
      }
    }
  },
  {
    name: 'browser_open_result',
    description: 'Abre o primeiro resultado orgânico encontrado na página de resultados do Google usando a sessão real do navegador.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'job_create',
    description: 'Cria uma tarefa assíncrona para operações de longa duração, permitindo acompanhamento de progresso, logs e cancelamento.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Título descritivo da tarefa.'
        },
        type: {
          type: 'STRING',
          description: 'Tipo de operação (ex: build, batch_process, analysis, data_sync).'
        },
        requiresApproval: {
          type: 'BOOLEAN',
          description: 'Se a tarefa envolve ações de alto impacto que exigem aprovação explícita do usuário antes de iniciar.'
        },
        approvalReason: {
          type: 'STRING',
          description: 'Motivo e impacto caso aprovação seja necessária.'
        }
      },
      required: ['title', 'type']
    }
  },
  {
    name: 'job_status',
    description: 'Consulta o estado atual, progresso, logs e artefatos de um job assíncrono.',
    parameters: {
      type: 'OBJECT',
      properties: {
        jobId: {
          type: 'STRING',
          description: 'Identificador do job a ser consultado.'
        }
      },
      required: ['jobId']
    }
  },
  {
    name: 'job_cancel',
    description: 'Cancela a execução de um job assíncrono em andamento.',
    parameters: {
      type: 'OBJECT',
      properties: {
        jobId: {
          type: 'STRING',
          description: 'Identificador do job a ser cancelado.'
        },
        reason: {
          type: 'STRING',
          description: 'Motivo do cancelamento.'
        }
      },
      required: ['jobId']
    }
  },
  {
    name: 'webdev_secret_set',
    description: 'WebDev MCP: Define uma variável de ambiente ou segredo seguro no runtime isolado do projeto.',
    parameters: {
      type: 'OBJECT',
      properties: {
        key: {
          type: 'STRING',
          description: 'Nome da chave do segredo ou variável (ex: API_KEY, DATABASE_URL, STRIPE_SECRET).'
        },
        value: {
          type: 'STRING',
          description: 'Valor seguro a ser armazenado no runtime isolado.'
        }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'webdev_secret_get',
    description: 'WebDev MCP: Consulta se um segredo existe no runtime isolado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        key: {
          type: 'STRING',
          description: 'Nome da chave a ser consultada.'
        }
      },
      required: ['key']
    }
  },
  {
    name: 'webdev_snapshot',
    description: 'WebDev MCP: Cria um checkpoint/snapshot de versão de todos os arquivos do projeto para controle de versão e rollback.',
    parameters: {
      type: 'OBJECT',
      properties: {
        description: {
          type: 'STRING',
          description: 'Descrição semântica do checkpoint (ex: Adicionou módulo de autenticação).'
        }
      },
      required: ['description']
    }
  },
  {
    name: 'webdev_rollback',
    description: 'WebDev MCP: Restaura o workspace para um checkpoint/snapshot de versão anterior.',
    parameters: {
      type: 'OBJECT',
      properties: {
        snapshotId: {
          type: 'STRING',
          description: 'Identificador do snapshot a ser restaurado.'
        }
      },
      required: ['snapshotId']
    }
  }
];

// Helper to ensure workspace sandbox directory exists
export async function ensureSandboxDir(): Promise<string> {
  await fs.mkdir(SANDBOX_WORKSPACE_ROOT, { recursive: true });
  return SANDBOX_WORKSPACE_ROOT;
}

// Tool Implementation Registry
export class AgentToolExecutor {
  constructor(private browserManager: any) {}

  async executeTool(name: string, args: Record<string, any>): Promise<{
    success: boolean;
    result: any;
    error?: string;
    actionDescription: string;
    requiresApproval?: boolean;
    approvalDetails?: JobApprovalRequest;
  }> {
    await ensureSandboxDir();

    try {
      switch (name) {
        case 'web_search': {
          const queryText = String(args.query || '').trim();
          if (!queryText) throw new Error('Parâmetro query é obrigatório.');
          const limit = Math.min(10, Math.max(1, Number(args.maxResults) || 5));
          const search = await this.browserManager.searchCustomEngine(queryText, limit);
          return {
            success: true,
            result: { ...search, browserStatus: 'interactive', browserUsed: true, provider: 'OpenSearchEngine', sources: search.results },
            actionDescription: `Pesquisa no mecanismo autônomo concluída (${search.results.length} resultados indexados)`,
            requiresApproval: false
          };
        }

        case 'web_fetch': {
          const rawUrl = String(args.url || '').trim();
          const focus = args.focus ? String(args.focus).trim() : undefined;

          const urlSafety = isSafeUrl(rawUrl);
          if (!urlSafety.isSafe) {
            throw new Error(`Acesso negado: ${urlSafety.reason}`);
          }

          try {
            const parsed = new URL(rawUrl);
            if (parsed.hostname.startsWith('api.')) {
              throw new Error('Acesso a subdomínios "api." é terminantemente proibido por política de segurança. Utilize o domínio principal ou de documentação.');
            }
          } catch (e: any) {
            if (e.message.includes('api.')) throw e;
          }

          let pageText = '';
          let title = '';
          let status = 200;

          let browserState: string = 'interactive';
          // Attempt fast fetch first
          try {
            const res = await fetch(rawUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              },
              signal: AbortSignal.timeout(10000)
            });
            status = res.status;
            browserState = status >= 400 ? 'error' : 'interactive';
            if (res.ok) {
              const html = await res.text();
              const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
              title = titleMatch ? titleMatch[1].trim() : new URL(rawUrl).hostname;
              
              // Clean HTML tags and extract readable text
              pageText = html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
                .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
                .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 8000);
            }
          } catch {
            // Fallback to Playwright if standard fetch timed out or blocked
            if (this.browserManager) {
              const nav = await this.browserManager.navigate(rawUrl);
              title = nav.title || '';
              pageText = nav.textContent || '';
              status = nav.status || 200;
              browserState = nav.browserStatus || 'interactive';
            }
          }

          if (!pageText) {
            throw new Error(`Não foi possível extrair o conteúdo legível de ${rawUrl}`);
          }

          return {
            success: true,
            result: {
              url: rawUrl,
              title,
              status,
              browserStatus: browserState,
              focus,
              contentLength: pageText.length,
              text: pageText
            },
            actionDescription: `Leitura e extração da página "${title || rawUrl}"`
          };
        }

        case 'bash_exec': {
          const command = String(args.command || '').trim();
          if (!command) throw new Error('Comando shell é obrigatório.');

          // Basic sanity check against dangerous host destruction
          if (/rm\s+-rf\s+\/(?:\s|$)|mkfs|dd\s+if=|:(){:|shutdown|reboot/i.test(command)) {
            throw new Error('Comando bloqueado por política de segurança da sandbox.');
          }

          const timeoutMs = Math.min(30000, Math.max(1000, (Number(args.timeoutSeconds) || 15) * 1000));
          const startTime = performance.now();

          let stdout = '';
          let stderr = '';
          let exitCode = 0;
          let timedOut = false;

          try {
            const { stdout: out, stderr: err } = await execAsync(command, {
              cwd: SANDBOX_WORKSPACE_ROOT,
              timeout: timeoutMs,
              maxBuffer: 1024 * 512, // 512 KB
              env: {
                ...process.env,
                PATH: process.env.PATH,
                HOME: SANDBOX_WORKSPACE_ROOT,
                WORKSPACE: SANDBOX_WORKSPACE_ROOT
              }
            });
            stdout = out;
            stderr = err;
          } catch (err: any) {
            stdout = err.stdout || '';
            stderr = err.stderr || err.message;
            exitCode = err.code || (err.killed ? 124 : 1);
            timedOut = !!err.killed;
          }

          const durationMs = Math.round(performance.now() - startTime);

          return {
            success: exitCode === 0,
            result: {
              command,
              exitCode,
              timedOut,
              durationMs,
              stdout: redactSecrets(stdout.slice(0, 16000)),
              stderr: redactSecrets(stderr.slice(0, 8000)),
              workingDir: 'workspace/'
            },
            actionDescription: `Execução no Sandbox: \`${command.slice(0, 50)}\` (Exit: ${exitCode}, ${durationMs}ms)`
          };
        }

        case 'python_exec': {
          const code = String(args.code || '').trim();
          if (!code) throw new Error('Código Python é obrigatório.');

          const startTime = performance.now();
          const tmpScript = path.join(SANDBOX_WORKSPACE_ROOT, `_py_exec_${Date.now()}.py`);
          await fs.writeFile(tmpScript, code, 'utf-8');

          let stdout = '';
          let stderr = '';
          let exitCode = 0;

          try {
            const { stdout: out, stderr: err } = await execAsync(`python3 "${path.basename(tmpScript)}"`, {
              cwd: SANDBOX_WORKSPACE_ROOT,
              timeout: 20000,
              maxBuffer: 1024 * 512
            });
            stdout = out;
            stderr = err;
          } catch (err: any) {
            stdout = err.stdout || '';
            stderr = err.stderr || err.message;
            exitCode = err.code || 1;
          } finally {
            await fs.unlink(tmpScript).catch(() => {});
          }

          const durationMs = Math.round(performance.now() - startTime);

          return {
            success: exitCode === 0,
            result: {
              exitCode,
              durationMs,
              stdout: redactSecrets(stdout.slice(0, 16000)),
              stderr: redactSecrets(stderr.slice(0, 8000))
            },
            actionDescription: `Execução de script Python (${durationMs}ms)`
          };
        }

        case 'file_create_directory':
        case 'fs_mkdir':
        case 'fs.mkdir':
        case 'mkdir': {
          const dirPath = String(args.directoryPath || args.path || args.dirPath || '').trim();
          if (!dirPath) throw new Error('Caminho do diretório é obrigatório.');
          const safe = resolveSafeSandboxPath(dirPath);
          if (!safe.safePath) throw new Error(safe.error || 'Caminho inválido');
          await fs.mkdir(safe.safePath, { recursive: true });
          return {
            success: true,
            result: {
              directoryPath: dirPath,
              created: true,
              message: `Diretório criado com sucesso: ${dirPath}`
            },
            actionDescription: `Criação da pasta "${dirPath}" no workspace`
          };
        }

        case 'file_list':
        case 'fs_list':
        case 'fs.listFiles':
        case 'fs.readDir': {
          const subDir = args.subDirectory ? String(args.subDirectory) : '';
          const safe = resolveSafeSandboxPath(subDir);
          if (!safe.safePath) throw new Error(safe.error || 'Caminho inválido');

          const entries = await fs.readdir(safe.safePath, { withFileTypes: true });
          const items = await Promise.all(
            entries.map(async (entry) => {
              const fullPath = path.join(safe.safePath!, entry.name);
              const relPath = path.relative(SANDBOX_WORKSPACE_ROOT, fullPath);
              let sizeBytes = 0;
              let updatedAt = '';
              try {
                const stat = await fs.stat(fullPath);
                sizeBytes = stat.size;
                updatedAt = stat.mtime.toISOString();
              } catch {}

              return {
                name: entry.name,
                path: relPath,
                isDirectory: entry.isDirectory(),
                sizeBytes,
                updatedAt
              };
            })
          );

          return {
            success: true,
            result: {
              directory: subDir || '.',
              totalItems: items.length,
              files: items
            },
            actionDescription: `Listagem de arquivos em "workspace/${subDir || ''}" (${items.length} itens)`
          };
        }

        case 'file_read':
        case 'fs_read':
        case 'fs.readFile':
        case 'read_file': {
          const filePath = String(args.filePath || args.path || '').trim();
          const safe = resolveSafeSandboxPath(filePath);
          if (!safe.safePath) throw new Error(safe.error || 'Caminho inválido');

          const stat = await fs.stat(safe.safePath);
          if (stat.size > 2 * 1024 * 1024) {
            throw new Error('Arquivo muito grande para leitura direta (limite: 2MB).');
          }

          const content = await fs.readFile(safe.safePath, 'utf-8');
          return {
            success: true,
            result: {
              filePath,
              sizeBytes: stat.size,
              content: content.slice(0, 50000)
            },
            actionDescription: `Leitura do arquivo "${filePath}" (${stat.size} bytes)`
          };
        }

        case 'file_write':
        case 'fs_write':
        case 'fs.writeFile':
        case 'write_file':
        case 'webdev_write_file': {
          const filePath = String(args.filePath || args.path || args.filename || '').trim();
          const content = String(args.content ?? args.code ?? '');
          const safe = resolveSafeSandboxPath(filePath);
          if (!safe.safePath) throw new Error(safe.error || 'Caminho inválido');

          await fs.mkdir(path.dirname(safe.safePath), { recursive: true });
          await fs.writeFile(safe.safePath, content, 'utf-8');
          const stat = await fs.stat(safe.safePath);

          // Register as artifact in current job if applicable
          const artifact = jobsManager.addArtifact('default', path.basename(filePath), filePath, stat.size);

          return {
            success: true,
            result: {
              filePath,
              sizeBytes: stat.size,
              artifactUrl: artifact.downloadUrl,
              message: `Arquivo "${filePath}" (${stat.size} bytes) gravado e integrado ao projeto com sucesso.`
            },
            actionDescription: `Gravação do arquivo "${filePath}" (${stat.size} bytes)`
          };
        }

        case 'file_delete':
        case 'fs_delete':
        case 'fs.deleteFile':
        case 'fs.unlink':
        case 'delete_file': {
          const filePath = String(args.filePath || '').trim();
          const safe = resolveSafeSandboxPath(filePath);
          if (!safe.safePath) throw new Error(safe.error || 'Caminho inválido');

          // Check if file is critical or a full directory
          const stat = await fs.stat(safe.safePath);
          const isDir = stat.isDirectory();

          if (isDir) {
            return {
              success: false,
              requiresApproval: true,
              result: { pendingApproval: true },
              approvalDetails: {
                actionName: 'file_delete_directory',
                details: { filePath, isDirectory: true },
                riskLevel: 'high',
                reason: `Exclusão do diretório "${filePath}" e de todos os seus arquivos.`,
                requestedAt: new Date().toISOString()
              },
              actionDescription: `Solicitando autorização do usuário para excluir diretório "${filePath}"`
            };
          }

          await fs.unlink(safe.safePath);
          return {
            success: true,
            result: {
              filePath,
              deleted: true
            },
            actionDescription: `Exclusão do arquivo "${filePath}"`
          };
        }

        case 'browser_navigate': {
          const url = String(args.url || '').trim();
          if (!url) throw new Error('URL é obrigatória.');

          const urlToTest = url.includes('://') ? url : `https://${url}`;
          const urlSafety = isSafeUrl(urlToTest);
          if (!urlSafety.isSafe) {
            throw new Error(`Acesso negado: ${urlSafety.reason}`);
          }

          try {
            const parsed = new URL(urlToTest);
            if (parsed.hostname.startsWith('api.')) {
              throw new Error('Acesso a subdomínios "api." é terminantemente proibido por política de segurança. Utilize o domínio principal ou de documentação.');
            }
          } catch (e: any) {
            if (e.message.includes('api.')) throw e;
          }

          const result = await this.browserManager.navigate(url);
          return {
            success: !result.challenge,
            result: {
              url: result.url,
              title: result.title,
              status: result.status,
              browserStatus: result.browserStatus,
              durationMs: result.durationMs,
              screenshot: result.screenshot,
              interactiveElementsCount: result.interactiveElements?.length || 0,
              challenge: result.challenge,
              requiresUserAction: result.requiresUserAction
            },
            actionDescription: result.challenge ? `Automação interrompida: ${result.challenge.reason}` : `Navegador Chromium acessou "${result.title || result.url}" (${result.durationMs}ms)`,
            requiresApproval: Boolean(result.challenge),
            approvalDetails: result.challenge ? { actionName: 'browser_handoff', details: result.challenge, riskLevel: 'medium', reason: 'O site apresentou um desafio anti-bot; a continuação exige intervenção humana autorizada.', requestedAt: new Date().toISOString() } : undefined
          };
        }

        case 'browser_inspect': {
          const page = await this.browserManager.ensurePage();
          const challenge = this.browserManager.getChallenge?.();
          if (challenge) {
            return { success: false, result: { url: page.url(), title: await page.title(), challenge, requiresUserAction: true }, error: challengeMessage(challenge), actionDescription: `Inspeção interrompida: ${challenge.reason}`, requiresApproval: true, approvalDetails: { actionName: 'browser_handoff', details: challenge, riskLevel: 'medium', reason: 'Intervenção humana autorizada necessária.', requestedAt: new Date().toISOString() } };
          }
          const title = await page.title();
          const url = page.url();
          const domData = await this.browserManager.extractDomData(page);

          return {
            success: true,
            result: {
              url,
              title,
              browserStatus: 'interactive',
              interactiveElements: domData.interactive,
              bodySnippet: domData.bodyText.slice(0, 1500)
            },
            actionDescription: `Inspeção do DOM: ${domData.interactive.length} elementos interativos detectados`
          }
        }

        case 'browser_scroll': {
          const deltaY = Number(args.deltaY) || 500;
          const result = await this.browserManager.scroll(deltaY);
          return {
            success: result.success !== false && !result.challenge,
            result: { ...result, browserStatus: 'interactive' },
            error: result.error,
            actionDescription: result.challenge ? `Rolagem interrompida: ${result.challenge.reason}` : `Agente rolou a página real ${deltaY}px e capturou o novo contexto`,
            requiresApproval: Boolean(result.challenge),
            approvalDetails: result.challenge ? { actionName: 'browser_handoff', details: result.challenge, riskLevel: 'medium', reason: 'Intervenção humana autorizada necessária.', requestedAt: new Date().toISOString() } : undefined
          };
        }

        case 'browser_open_result': {
          const result = await this.browserManager.openFirstSearchResult();
          return {
            success: result.success !== false && !result.challenge,
            result: { ...result, browserStatus: result.browserStatus || 'interactive' },
            error: result.error,
            actionDescription: result.challenge ? `Abertura interrompida: ${result.challenge.reason}` : `Agente abriu o primeiro resultado orgânico e obteve o contexto da página real`,
            requiresApproval: Boolean(result.challenge),
            approvalDetails: result.challenge ? { actionName: 'browser_handoff', details: result.challenge, riskLevel: 'medium', reason: 'Intervenção humana autorizada necessária.', requestedAt: new Date().toISOString() } : undefined
          };
        }

        case 'browser_click': {
          const target = String(args.selectorOrText || '').trim();
          if (!target) throw new Error('Seletor ou texto do elemento é obrigatório.');
          const existingChallenge = this.browserManager.getChallenge?.();
          if (existingChallenge) return { success: false, result: { challenge: existingChallenge, requiresUserAction: true, browserStatus: 'blocked' }, error: challengeMessage(existingChallenge), actionDescription: `Clique bloqueado: ${existingChallenge.reason}`, requiresApproval: true, approvalDetails: { actionName: 'browser_handoff', details: existingChallenge, riskLevel: 'medium', reason: 'Intervenção humana autorizada necessária.', requestedAt: new Date().toISOString() } };

          const page = await this.browserManager.ensurePage();
          let clicked = false;

          try {
            // Try CSS selector first
            if (target.startsWith('#') || target.startsWith('.') || target.includes('>')) {
              await page.click(target, { timeout: 4000 });
              clicked = true;
            }
          } catch {}

          if (!clicked) {
            // Try clicking by accessible text
            await page.getByText(target).first().click({ timeout: 5000 }).catch(async () => {
              await page.click(`button:has-text("${target}"), a:has-text("${target}")`, { timeout: 4000 });
            });
          }

          await page.waitForTimeout(800);
          const newTitle = await page.title();
          const newUrl = page.url();
          const screenshotBuf = await page.screenshot({ type: 'jpeg', quality: 75 }).catch(() => null);
          const challenge = await this.browserManager.checkCurrentChallenge?.();
          if (challenge) return { success: false, result: { newUrl, newTitle, challenge, requiresUserAction: true, browserStatus: 'blocked' }, error: challengeMessage(challenge), actionDescription: `Clique interrompido: ${challenge.reason}`, requiresApproval: true, approvalDetails: { actionName: 'browser_handoff', details: challenge, riskLevel: 'medium', reason: 'Intervenção humana autorizada necessária.', requestedAt: new Date().toISOString() } };

          return {
            success: true,
            result: {
              target,
              newUrl,
              newTitle,
              browserStatus: 'interactive',
              screenshot: screenshotBuf ? 'data:image/jpeg;base64,' + screenshotBuf.toString('base64') : null
            },
            actionDescription: `Clique realizado em "${target}". Nova página: "${newTitle}"`
          };
        }

        case 'browser_type': {
          const text = String(args.text || '');
          const selector = args.selector ? String(args.selector) : 'input:not([type="hidden"]), textarea';
          const pressEnter = Boolean(args.pressEnter ?? true);

          const page = await this.browserManager.ensurePage();
          const existingChallenge = this.browserManager.getChallenge?.();
          if (existingChallenge) return { success: false, result: { challenge: existingChallenge, requiresUserAction: true, browserStatus: 'blocked' }, error: challengeMessage(existingChallenge), actionDescription: `Digitação bloqueada: ${existingChallenge.reason}`, requiresApproval: true, approvalDetails: { actionName: 'browser_handoff', details: existingChallenge, riskLevel: 'medium', reason: 'Intervenção humana autorizada necessária.', requestedAt: new Date().toISOString() } };
          
          await page.fill(selector, text, { timeout: 5000 });
          if (pressEnter) {
            await page.press(selector, 'Enter');
            await page.waitForTimeout(1000);
          }

          const currentTitle = await page.title();
          const currentUrl = page.url();
          const screenshotBuf = await page.screenshot({ type: 'jpeg', quality: 75 }).catch(() => null);
          const challenge = await this.browserManager.checkCurrentChallenge?.();
          if (challenge) return { success: false, result: { currentUrl, currentTitle, challenge, requiresUserAction: true, browserStatus: 'blocked' }, error: challengeMessage(challenge), actionDescription: `Digitação interrompida: ${challenge.reason}`, requiresApproval: true, approvalDetails: { actionName: 'browser_handoff', details: challenge, riskLevel: 'medium', reason: 'Intervenção humana autorizada necessária.', requestedAt: new Date().toISOString() } };

          return {
            success: true,
            result: {
              textTyped: text,
              currentUrl,
              currentTitle,
              browserStatus: 'interactive',
              screenshot: screenshotBuf ? 'data:image/jpeg;base64,' + screenshotBuf.toString('base64') : null
            },
            actionDescription: `Digitação concluída: "${text.slice(0, 30)}"`
          };
        }

        case 'job_create': {
          const title = String(args.title || 'Tarefa assíncrona');
          const type = String(args.type || 'background_task');
          const requiresApproval = Boolean(args.requiresApproval);
          const approvalReason = args.approvalReason ? String(args.approvalReason) : undefined;

          let approval: JobApprovalRequest | undefined;
          if (requiresApproval) {
            approval = {
              actionName: type,
              details: { title, ...args },
              riskLevel: 'medium',
              reason: approvalReason || `A tarefa "${title}" requer confirmação do usuário antes de alocar recursos.`,
              requestedAt: new Date().toISOString()
            };
          }

          const job = jobsManager.createJob(title, type, approval);
          return {
            success: true,
            result: {
              jobId: job.id,
              status: job.status,
              currentStep: job.currentStep,
              requiresApproval
            },
            actionDescription: `Job assíncrono criado: [${job.id}] "${title}"`
          };
        }

        case 'job_status': {
          const jobId = String(args.jobId || '').trim();
          const job = jobsManager.getJob(jobId);
          if (!job) throw new Error(`Job "${jobId}" não encontrado.`);

          return {
            success: true,
            result: job,
            actionDescription: `Consulta de status do job [${jobId}]: ${job.status} (${job.progressPercent}%)`
          };
        }

        case 'job_cancel': {
          const jobId = String(args.jobId || '').trim();
          const reason = args.reason ? String(args.reason) : 'Cancelado pelo agente';
          const cancelled = jobsManager.cancelJob(jobId, reason);

          return {
            success: cancelled,
            result: {
              jobId,
              cancelled,
              reason
            },
            actionDescription: `Cancelamento do job [${jobId}]`
          };
        }

        case 'webdev_secret_set':
        case 'secret_set': {
          const key = String(args.key || '').trim();
          const value = String(args.value || '');
          if (!key) throw new Error('Chave do segredo é obrigatória.');
          const secret = agentIsolatedRuntime.setSecret(key, value);
          return {
            success: true,
            result: { key: secret.key, set: true, updatedAt: secret.updatedAt },
            actionDescription: `Variável de ambiente "${secret.key}" salva com segurança no runtime isolado`
          };
        }

        case 'webdev_secret_get':
        case 'secret_get': {
          const key = String(args.key || '').trim();
          const val = agentIsolatedRuntime.getSecret(key);
          return {
            success: true,
            result: { key, exists: val !== undefined },
            actionDescription: `Consulta de variável de ambiente "${key}" no runtime isolado`
          };
        }

        case 'webdev_snapshot':
        case 'snapshot_create': {
          const description = String(args.description || 'Checkpoint do agente').trim();
          const snapshot = await agentIsolatedRuntime.createSnapshot(description, args.currentFiles || {});
          return {
            success: true,
            result: { snapshotId: snapshot.id, description: snapshot.description, timestamp: snapshot.timestamp },
            actionDescription: `Snapshot de versão criado [${snapshot.id}]: "${description}"`
          };
        }

        case 'webdev_rollback':
        case 'snapshot_rollback': {
          const snapshotId = String(args.snapshotId || '').trim();
          const restoredFiles = agentIsolatedRuntime.rollbackSnapshot(snapshotId);
          if (!restoredFiles) throw new Error(`Snapshot "${snapshotId}" não encontrado.`);
          return {
            success: true,
            result: { snapshotId, restored: true, totalFiles: Object.keys(restoredFiles).length },
            actionDescription: `Rollback de versão executado com sucesso para o snapshot [${snapshotId}]`
          };
        }

        default:
          throw new Error(`Ferramenta desconhecida: "${name}"`);
      }
    } catch (err: any) {
      return {
        success: false,
        result: null,
        error: redactSecrets(err.message || String(err)),
        actionDescription: `Falha ao executar ${name}: ${err.message}`
      };
    }
  }
}
