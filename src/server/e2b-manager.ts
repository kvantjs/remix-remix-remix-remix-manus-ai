import { Sandbox } from 'e2b';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { getProject } from './projects.js';

dotenv.config();

const DEFAULT_E2B_KEY = 'e2b_efd633ef2aef62e17f436c2248e253df1089cdd8';

export interface SandboxSession {
  projectId: string;
  sandbox: Sandbox;
  previewUrl: string;
  hasCreatedSite: boolean;
  activePort?: number;
  lastActive: number;
}

class E2BSandboxManager {
  private sessions: Map<string, SandboxSession> = new Map();
  private apiKey: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

  constructor() {
    this.apiKey = process.env.E2B_API_KEY || DEFAULT_E2B_KEY;
    this.startInactivityChecker();
  }

  /**
   * Obtém a chave E2B atualizada
   */
  public getApiKey(): string {
    return process.env.E2B_API_KEY || this.apiKey || DEFAULT_E2B_KEY;
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
          console.log(`[E2B Manager] Sandbox do projeto ${projectId} inativo por ${Math.round(idleTime / 1000 / 60)} minutos. Encerrando...`);
          this.closeSandbox(projectId).catch(err => {
            console.error(`[E2B Manager] Erro ao fechar sandbox inativo ${projectId}:`, err);
          });
        }
      }
    }, 60 * 1000);
    
    if (this.checkInterval && typeof this.checkInterval.unref === 'function') {
      this.checkInterval.unref();
    }
  }

  /**
   * Obtém ou inicializa um sandbox E2B isolado para o projeto especificado
   */
  async getOrCreateSandbox(projectId: string): Promise<SandboxSession> {
    const existing = this.sessions.get(projectId);
    if (existing) {
      existing.lastActive = Date.now();
      return existing;
    }

    const apiKeyToUse = this.getApiKey();
    console.log(`[E2B Manager] Inicializando novo sandbox E2B para o projeto ${projectId}...`);

    try {
      // Cria a sandbox utilizando o SDK E2B com a chave autenticada
      const sandbox = await Sandbox.create({
        apiKey: apiKeyToUse
      });

      const sandboxId = sandbox.sandboxId || (sandbox as any).id || 'e2b_sandbox';

      // Inicialmente não definimos URL pública até o agente criar e executar a aplicação
      const session: SandboxSession = {
        projectId,
        sandbox,
        previewUrl: '',
        hasCreatedSite: false,
        lastActive: Date.now()
      };

      this.sessions.set(projectId, session);
      console.log(`[E2B Manager] Sandbox E2B criado com sucesso para o projeto ${projectId}. ID: ${sandboxId}. Aguardando criação/execução do site pelo Agente...`);

      // Inicializa estrutura inicial de arquivos no Sandbox para o projeto em segundo plano
      void this.syncLocalFilesToSandbox(projectId, session);

      return session;
    } catch (error: any) {
      console.error(`[E2B Manager] Falha ao criar sandbox E2B para ${projectId}:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Sincroniza arquivos do projeto local para a sandbox E2B
   */
  private async syncLocalFilesToSandbox(projectId: string, session: SandboxSession) {
    try {
      let localPath: string;
      try {
        const project = await getProject(projectId);
        localPath = project.path;
      } catch {
        localPath = process.cwd();
      }

      console.log(`[E2B Manager] Sincronizando arquivos locais de ${localPath} para o sandbox...`);
      await session.sandbox.files.makeDir('/home/user/app');

      const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.kvant', 'tmp', '.cache', 'build', '.next', 'coverage']);
      
      const copyRecursive = async (localDir: string, sandboxDir: string) => {
        try {
          const entries = await fs.readdir(localDir, { withFileTypes: true });
          for (const entry of entries) {
            if (ignoredDirs.has(entry.name)) continue;
            
            const localEntryPath = path.join(localDir, entry.name);
            const sandboxEntryPath = `${sandboxDir}/${entry.name}`;
            
            if (entry.isDirectory()) {
              await session.sandbox.files.makeDir(sandboxEntryPath);
              await copyRecursive(localEntryPath, sandboxEntryPath);
            } else if (entry.isFile()) {
              const stat = await fs.stat(localEntryPath);
              if (stat.size > 2 * 1024 * 1024) continue;
              const content = await fs.readFile(localEntryPath, 'utf8');
              await session.sandbox.files.write(sandboxEntryPath, content);
            }
          }
        } catch {}
      };

      await copyRecursive(localPath, '/home/user/app');
      console.log(`[E2B Manager] Sincronização de arquivos concluída para '/home/user/app'.`);
    } catch (error) {
      console.warn(`[E2B Manager] Sincronização de arquivos para ${projectId}:`, error);
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
   * Executa um comando terminal bash dentro do sandbox E2B do projeto.
   * Quando o agente executa a aplicação, chama getHost() do SDK E2B para capturar a URL pública.
   */
  async executeCommand(projectId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    const sandboxId = session.sandbox.sandboxId || (session.sandbox as any).id;
    console.log(`[E2B Manager] Executando comando bash na sandbox [${sandboxId}]: "${command}"`);
    try {
      const result = await session.sandbox.commands.run(command, {
        cwd: '/home/user/app'
      });

      // Se o agente executou a aplicação ou criou servidor web, usamos getHost() do SDK E2B para capturar a URL
      const isDevServer = /npm\s+(run\s+)?(dev|start|serve)|vite|next|node|python|express|fastify|flask|uvicorn/i.test(command);
      if (isDevServer || command.includes('npm') || command.includes('node')) {
        session.hasCreatedSite = true;
        const portMatch = command.match(/(?:--port|-p)\s*=?\s*(\d+)/i);
        const port = portMatch ? parseInt(portMatch[1], 10) : (session.activePort || 3000);
        session.activePort = port;

        const rawHost = session.sandbox.getHost(port);
        session.previewUrl = rawHost.startsWith('http') ? rawHost : `https://${rawHost}`;
        console.log(`[E2B Manager] Agente executou aplicação no sandbox. URL pública dinâmica capturada via getHost(${port}): ${session.previewUrl}`);
      }

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode ?? 0
      };
    } catch (error: any) {
      console.warn(`[E2B Manager] Comando finalizado no sandbox E2B (exit ${error?.exitCode ?? 1}):`, error?.message || error);
      return {
        stdout: error?.stdout || '',
        stderr: error?.stderr || error?.message || String(error),
        exitCode: error?.exitCode ?? 1
      };
    }
  }

  /**
   * Escreve ou atualiza um arquivo no sandbox E2B do projeto
   */
  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    session.hasCreatedSite = true;
    const targetPath = filePath.startsWith('/') ? filePath : `/home/user/app/${filePath}`;
    const sandboxId = session.sandbox.sandboxId || (session.sandbox as any).id;
    console.log(`[E2B Manager] Gravando arquivo na sandbox [${sandboxId}] no caminho: ${targetPath}`);
    
    try {
      await session.sandbox.files.write(targetPath, content);
    } catch (error: any) {
      console.error(`[E2B Manager] Erro ao gravar arquivo no sandbox E2B:`, error);
      throw error;
    }
  }

  /**
   * Lê um arquivo do sandbox E2B do projeto
   */
  async readFile(projectId: string, filePath: string): Promise<string> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    const targetPath = filePath.startsWith('/') ? filePath : `/home/user/app/${filePath}`;
    const sandboxId = session.sandbox.sandboxId || (session.sandbox as any).id;
    console.log(`[E2B Manager] Lendo arquivo da sandbox [${sandboxId}]: ${targetPath}`);
    
    try {
      return await session.sandbox.files.read(targetPath);
    } catch (error: any) {
      console.error(`[E2B Manager] Erro ao ler arquivo do sandbox E2B:`, error);
      throw error;
    }
  }

  /**
   * Remove um arquivo ou pasta do sandbox E2B do projeto
   */
  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    const targetPath = filePath.startsWith('/') ? filePath : `/home/user/app/${filePath}`;
    const sandboxId = session.sandbox.sandboxId || (session.sandbox as any).id;
    console.log(`[E2B Manager] Removendo arquivo/diretório da sandbox [${sandboxId}]: ${targetPath}`);
    
    try {
      await session.sandbox.files.remove(targetPath);
    } catch (error: any) {
      console.error(`[E2B Manager] Erro ao remover arquivo no sandbox E2B:`, error);
      throw error;
    }
  }

  /**
   * Lista os arquivos e subpastas de uma pasta no sandbox E2B do projeto
   */
  async listFiles(projectId: string, subDirectory = ''): Promise<any[]> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();

    const targetPath = subDirectory.startsWith('/') 
      ? subDirectory 
      : `/home/user/app/${subDirectory}`.replace(/\/+$/, '');

    const sandboxId = session.sandbox.sandboxId || (session.sandbox as any).id;
    console.log(`[E2B Manager] Listando diretório na sandbox [${sandboxId}]: ${targetPath}`);
    
    try {
      const files = await session.sandbox.files.list(targetPath);
      return files.map((f: any) => ({
        name: f.name,
        path: subDirectory ? `${subDirectory}/${f.name}` : f.name,
        isDirectory: f.isDirectory,
        sizeBytes: f.size ?? 0,
        updatedAt: new Date().toISOString()
      }));
    } catch (error: any) {
      console.error(`[E2B Manager] Erro ao listar diretório no sandbox E2B:`, error);
      throw error;
    }
  }

  /**
   * Obtém a URL pública dinâmica capturada via getHost() do SDK E2B.
   * Se o agente ainda não criou nem executou a aplicação, retorna string vazia.
   */
  async getPreviewUrl(projectId: string, requestedPort?: number): Promise<string> {
    const session = await this.getOrCreateSandbox(projectId);
    session.lastActive = Date.now();
    
    // Se o agente ainda não criou nem executou nada e nenhuma porta foi forçada, retorna vazio
    if (!session.hasCreatedSite && !requestedPort && !session.previewUrl) {
      return '';
    }

    const port = requestedPort || session.activePort || 3000;
    const host = session.sandbox.getHost(port);
    const url = host.startsWith('http') ? host : `https://${host}`;
    
    session.previewUrl = url;
    session.hasCreatedSite = true;
    return url;
  }

  /**
   * Encerra e destrói o sandbox de um projeto específico
   */
  async closeSandbox(projectId: string): Promise<void> {
    const session = this.sessions.get(projectId);
    if (!session) return;

    const sandboxId = session.sandbox.sandboxId || (session.sandbox as any).id;
    console.log(`[E2B Manager] Encerrando sandbox E2B ID: ${sandboxId} para o projeto ${projectId}...`);
    try {
      await session.sandbox.kill();
    } catch (error) {
      console.error(`[E2B Manager] Erro ao invocar kill() no sandbox E2B:`, error);
    } finally {
      this.sessions.delete(projectId);
      console.log(`[E2B Manager] Sandbox do projeto ${projectId} encerrado e removido do cache.`);
    }
  }

  /**
   * Encerra todas as sessões de sandbox ativas
   */
  async closeAll(): Promise<void> {
    if (this.checkInterval) clearInterval(this.checkInterval);
    console.log(`[E2B Manager] Encerrando todos os sandboxes ativos...`);
    const promises = Array.from(this.sessions.keys()).map(id => this.closeSandbox(id));
    await Promise.all(promises);
    console.log(`[E2B Manager] Todos os sandboxes foram finalizados.`);
  }
}

export const e2bSandboxManager = new E2BSandboxManager();
