import { Daytona, Sandbox } from '@daytona/sdk';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { getProject } from './projects.js';

dotenv.config();

const DEFAULT_DAYTONA_KEY = 'dtn_170d6f523df66cc60c7d3656635dcd8c894724205ca6618c379c2e9db63331c4';

export interface DaytonaSession {
  projectId: string;
  sandbox: Sandbox;
  previewUrl: string;
  hasCreatedSite: boolean;
  activePort?: number;
  lastActive: number;
}

class DaytonaManager {
  private sessions: Map<string, DaytonaSession> = new Map();
  private daytonaClient: Daytona | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private isSuspended = false;
  private suspensionReason = '';

  constructor() {
    this.initClient();
    this.startInactivityChecker();
  }

  public isAvailable(): boolean {
    return !this.isSuspended;
  }

  public getSuspensionReason(): string {
    return this.suspensionReason;
  }

  private handleDaytonaError(error: any) {
    const msg = String(error?.message || error || '');
    if (msg.includes('suspended') || msg.includes('Depleted credits') || msg.includes('DaytonaAuthorizationError') || msg.includes('credits')) {
      if (!this.isSuspended) {
        this.isSuspended = true;
        this.suspensionReason = 'Organização do Daytona suspensa por falta de créditos (Depleted credits). Alternando automaticamente para o ambiente de execução isolado local.';
        console.warn(`[Daytona Manager] ⚠️ ${this.suspensionReason}`);
      }
    }
  }

  private initClient() {
    const apiKey = process.env.DAYTONA_API_KEY || DEFAULT_DAYTONA_KEY;
    const serverUrl = process.env.DAYTONA_SERVER_URL || process.env.DAYTONA_API_URL;
    try {
      this.daytonaClient = new Daytona({
        apiKey,
        apiUrl: serverUrl
      });
    } catch (err) {
      console.warn('[Daytona Manager] Não foi possível inicializar o cliente Daytona:', err);
    }
  }

  private getClient(): Daytona {
    if (!this.daytonaClient) {
      this.initClient();
    }
    if (!this.daytonaClient) {
      throw new Error('Daytona SDK não inicializado. Configure DAYTONA_API_KEY no ambiente.');
    }
    return this.daytonaClient;
  }

  /**
   * Inicializa o checker de inatividade periódica (roda a cada minuto)
   */
  private startInactivityChecker() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      for (const [projectId, session] of this.sessions.entries()) {
        const idleTime = now - session.lastActive;
        if (idleTime > this.TIMEOUT_MS) {
          console.log(`[Daytona Manager] Sandbox do projeto ${projectId} inativo por ${Math.round(idleTime / 1000 / 60)} minutos. Encerrando...`);
          this.closeSandbox(projectId).catch(err => {
            console.error(`[Daytona Manager] Erro ao fechar sandbox inativo ${projectId}:`, err);
          });
        }
      }
    }, 60 * 1000);
    
    if (this.checkInterval && typeof this.checkInterval.unref === 'function') {
      this.checkInterval.unref();
    }
  }

  /**
   * Obtém ou inicializa um sandbox Daytona para o projeto especificado
   */
  async getOrCreateSandbox(projectId: string): Promise<DaytonaSession> {
    if (this.isSuspended) {
      throw new Error(`Daytona indisponível: ${this.suspensionReason}`);
    }

    const existing = this.sessions.get(projectId);
    if (existing) {
      existing.lastActive = Date.now();
      return existing;
    }

    console.log(`[Daytona Manager] Inicializando novo sandbox Daytona para o projeto ${projectId}...`);

    try {
      const client = this.getClient();
      // Cria a sandbox no Daytona
      const sandbox = await client.create({
        language: 'typescript'
      });

      const session: DaytonaSession = {
        projectId,
        sandbox,
        previewUrl: '',
        hasCreatedSite: false,
        lastActive: Date.now()
      };

      this.sessions.set(projectId, session);
      console.log(`[Daytona Manager] Sandbox Daytona criado com sucesso para o projeto ${projectId}. ID: ${sandbox.id}`);

      // Sincroniza arquivos em segundo plano
      void this.syncLocalFilesToSandbox(projectId, session);

      return session;
    } catch (error: any) {
      this.handleDaytonaError(error);
      console.error(`[Daytona Manager] Falha ao criar sandbox Daytona para ${projectId}:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Sincroniza arquivos do projeto local para a sandbox Daytona
   */
  private async syncLocalFilesToSandbox(projectId: string, session: DaytonaSession) {
    try {
      let localPath: string;
      try {
        const project = await getProject(projectId);
        localPath = project.path;
      } catch {
        localPath = process.cwd();
      }

      console.log(`[Daytona Manager] Sincronizando arquivos locais de ${localPath} para o sandbox Daytona...`);
      const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.kvant', 'tmp', '.cache', 'build', '.next', 'coverage']);
      
      const copyRecursive = async (localDir: string, sandboxDir: string) => {
        try {
          const entries = await fs.readdir(localDir, { withFileTypes: true });
          for (const entry of entries) {
            if (ignoredDirs.has(entry.name)) continue;
            
            const localEntryPath = path.join(localDir, entry.name);
            const sandboxEntryPath = `${sandboxDir}/${entry.name}`;
            
            if (entry.isDirectory()) {
              await copyRecursive(localEntryPath, sandboxEntryPath);
            } else if (entry.isFile()) {
              const stat = await fs.stat(localEntryPath);
              if (stat.size > 2 * 1024 * 1024) continue;
              const content = await fs.readFile(localEntryPath, 'utf8');
              if (typeof (session.sandbox.fs as any)?.uploadFile === 'function') {
                await (session.sandbox.fs as any).uploadFile(sandboxEntryPath, Buffer.from(content));
              }
            }
          }
        } catch {}
      };

      await copyRecursive(localPath, '/home/daytona/app');
      console.log(`[Daytona Manager] Sincronização de arquivos concluída.`);
    } catch (error) {
      console.warn(`[Daytona Manager] Sincronização de arquivos para ${projectId}:`, error);
    }
  }

  /**
   * Renova a atividade do sandbox (keep-alive)
   */
  keepAlive(projectId: string): void {
    const session = this.sessions.get(projectId);
    if (session) {
      session.lastActive = Date.now();
    }
  }

  /**
   * Executa um comando terminal bash dentro do sandbox Daytona do projeto.
   * Quando o agente executa a aplicação, chama getPreviewLink() para obter a URL pública dinâmica.
   */
  async executeCommand(projectId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    console.log(`[Daytona Manager] Executando comando no Daytona [${session.sandbox.id}]: "${command}"`);
    try {
      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      if (session.sandbox.process?.executeCommand) {
        const res: any = await session.sandbox.process.executeCommand(command, {
          cwd: '/home/daytona/app'
        } as any);
        stdout = res?.result || res?.stdout || res?.output || '';
        stderr = res?.stderr || '';
        exitCode = res?.code ?? res?.exitCode ?? 0;
      } else if ((session.sandbox.process as any)?.exec) {
        const res: any = await (session.sandbox.process as any).exec(command);
        stdout = res?.result || res?.stdout || res?.output || '';
        stderr = res?.stderr || '';
        exitCode = res?.code ?? res?.exitCode ?? 0;
      }

      // Se o agente executou a aplicação ou criou servidor web, capturamos a URL dinâmica via getPreviewLink()
      const isDevServer = /npm\s+(run\s+)?(dev|start|serve)|vite|next|node|python|express|fastify|flask|uvicorn/i.test(command);
      if (isDevServer || command.includes('npm') || command.includes('node')) {
        session.hasCreatedSite = true;
        const portMatch = command.match(/(?:--port|-p)\s*=?\s*(\d+)/i);
        const port = portMatch ? parseInt(portMatch[1], 10) : (session.activePort || 3000);
        session.activePort = port;

        if (session.sandbox.getPreviewLink) {
          const previewLink = await session.sandbox.getPreviewLink(port);
          session.previewUrl = typeof previewLink === 'string' ? previewLink : (previewLink as any)?.url || '';
        } else if ((session.sandbox as any).getSignedPreviewUrl) {
          const signedUrl = await (session.sandbox as any).getSignedPreviewUrl(port);
          session.previewUrl = typeof signedUrl === 'string' ? signedUrl : (signedUrl as any)?.url || '';
        }
        console.log(`[Daytona Manager] Agente executou aplicação no Daytona. URL pública capturada: ${session.previewUrl}`);
      }

      return {
        stdout,
        stderr,
        exitCode
      };
    } catch (error: any) {
      this.handleDaytonaError(error);
      console.warn(`[Daytona Manager] Comando finalizado no Daytona (exit ${error?.exitCode ?? 1}):`, error?.message || error);
      return {
        stdout: error?.stdout || '',
        stderr: error?.stderr || error?.message || String(error),
        exitCode: error?.exitCode ?? 1
      };
    }
  }

  /**
   * Escreve ou atualiza um arquivo no sandbox Daytona do projeto
   */
  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    session.hasCreatedSite = true;
    const targetPath = filePath.startsWith('/') ? filePath : `/home/daytona/app/${filePath}`;
    console.log(`[Daytona Manager] Gravando arquivo no Daytona [${session.sandbox.id}]: ${targetPath}`);
    
    try {
      if (typeof (session.sandbox.fs as any)?.uploadFile === 'function') {
        await (session.sandbox.fs as any).uploadFile(targetPath, Buffer.from(content));
      }
    } catch (error: any) {
      this.handleDaytonaError(error);
      console.error(`[Daytona Manager] Erro ao gravar arquivo no Daytona:`, error);
      throw error;
    }
  }

  /**
   * Lê um arquivo do sandbox Daytona do projeto
   */
  async readFile(projectId: string, filePath: string): Promise<string> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    const targetPath = filePath.startsWith('/') ? filePath : `/home/daytona/app/${filePath}`;
    console.log(`[Daytona Manager] Lendo arquivo do Daytona [${session.sandbox.id}]: ${targetPath}`);
    
    try {
      if (session.sandbox.fs?.downloadFile) {
        const buf = await session.sandbox.fs.downloadFile(targetPath);
        return buf.toString('utf8');
      }
      return '';
    } catch (error: any) {
      console.error(`[Daytona Manager] Erro ao ler arquivo do Daytona:`, error);
      throw error;
    }
  }

  /**
   * Remove um arquivo ou pasta do sandbox Daytona do projeto
   */
  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    const targetPath = filePath.startsWith('/') ? filePath : `/home/daytona/app/${filePath}`;
    console.log(`[Daytona Manager] Removendo arquivo do Daytona [${session.sandbox.id}]: ${targetPath}`);
    
    try {
      if ((session.sandbox.fs as any)?.remove) {
        await (session.sandbox.fs as any).remove(targetPath);
      }
    } catch (error: any) {
      console.error(`[Daytona Manager] Erro ao remover arquivo no Daytona:`, error);
      throw error;
    }
  }

  /**
   * Lista os arquivos e subpastas no sandbox Daytona
   */
  async listFiles(projectId: string, subDirectory = ''): Promise<any[]> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    const targetPath = subDirectory.startsWith('/') 
      ? subDirectory 
      : `/home/daytona/app/${subDirectory}`.replace(/\/+$/, '');

    console.log(`[Daytona Manager] Listando diretório no Daytona [${session.sandbox.id}]: ${targetPath}`);
    
    try {
      if ((session.sandbox.fs as any)?.listFiles) {
        const files = await (session.sandbox.fs as any).listFiles(targetPath);
        return files.map((f: any) => ({
          name: f.name,
          path: subDirectory ? `${subDirectory}/${f.name}` : f.name,
          isDirectory: f.isDirectory,
          sizeBytes: f.size ?? 0,
          updatedAt: new Date().toISOString()
        }));
      }
      return [];
    } catch (error: any) {
      console.error(`[Daytona Manager] Erro ao listar diretório no Daytona:`, error);
      throw error;
    }
  }

  /**
   * Obtém a URL pública dinâmica capturada via Daytona SDK getPreviewLink().
   * Se o agente ainda não criou nem executou a aplicação, retorna string vazia.
   */
  async getPreviewUrl(projectId: string, requestedPort?: number): Promise<string> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();
    
    if (!session.hasCreatedSite && !requestedPort && !session.previewUrl) {
      return '';
    }

    const port = requestedPort || session.activePort || 3000;
    
    try {
      if (session.sandbox.getPreviewLink) {
        const previewLink = await session.sandbox.getPreviewLink(port);
        session.previewUrl = typeof previewLink === 'string' ? previewLink : (previewLink as any)?.url || '';
      } else if ((session.sandbox as any).getSignedPreviewUrl) {
        const signedUrl = await (session.sandbox as any).getSignedPreviewUrl(port);
        session.previewUrl = typeof signedUrl === 'string' ? signedUrl : (signedUrl as any)?.url || '';
      }
    } catch (e) {
      console.warn('[Daytona Manager] Falha ao capturar getPreviewLink:', e);
    }

    session.hasCreatedSite = true;
    return session.previewUrl;
  }

  /**
   * Encerra e destrói o sandbox de um projeto específico
   */
  async closeSandbox(projectId: string): Promise<void> {
    const session = this.sessions.get(projectId);
    if (!session) return;

    console.log(`[Daytona Manager] Encerrando sandbox Daytona ID: ${session.sandbox.id} para o projeto ${projectId}...`);
    try {
      await session.sandbox.delete();
    } catch (error) {
      console.error(`[Daytona Manager] Erro ao invocar delete() no sandbox Daytona:`, error);
    } finally {
      this.sessions.delete(projectId);
      console.log(`[Daytona Manager] Sandbox do projeto ${projectId} encerrado.`);
    }
  }

  /**
   * Encerra todas as sessões de sandbox ativas
   */
  async closeAll(): Promise<void> {
    if (this.checkInterval) clearInterval(this.checkInterval);
    console.log(`[Daytona Manager] Encerrando todos os sandboxes Daytona ativos...`);
    const promises = Array.from(this.sessions.keys()).map(id => this.closeSandbox(id));
    await Promise.all(promises);
    console.log(`[Daytona Manager] Todos os sandboxes Daytona foram finalizados.`);
  }
}

export const daytonaManager = new DaytonaManager();
