export interface ProjectFile {
  path: string;
  name: string;
  code: string;
  lang: string;
  folder?: string;
  size?: number;
}

export interface ToolCallTrace {
  id: string;
  toolName: string;
  server?: string;
  arguments: Record<string, any>;
  result: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'running';
  actionType?: 'browser' | 'terminal' | 'editor' | 'system';
  screenData?: {
    url?: string;
    title?: string;
    pageContent?: string;
    command?: string;
    terminalOutput?: string;
    filePath?: string;
    fileContent?: string;
    actionDescription?: string;
    links?: Array<{ text: string; href: string }>;
    durationMs?: number;
    httpStatus?: number;
    screenshot?: string;
    interactiveElements?: Array<{ type: 'button' | 'link' | 'input'; text: string; selector: string; href?: string }>;
  };
}

export interface AgentExecutionLog {
  id: number;
  type: 'command' | 'info' | 'error' | 'tool';
  content: string;
  time: string;
}

export interface AgentResponsePayload {
  thought: string;
  workingTime: string;
  logs: AgentExecutionLog[];
  toolCalls?: ToolCallTrace[];
  response: string;
  suggestions: string[];
  clarifications?: string[];
  questionnaire?: {
    title?: string;
    description?: string;
    questions?: Array<{
      name: string;
      title: string;
      description: string;
      choices: Array<{
        value: string;
        label: string;
        hint: string;
      }>;
    }>;
  };
  files?: Array<{
    path: string;
    code: string;
    lang?: string;
  }>;
  updatedFile?: {
    filename: string;
    code: string;
  };
  terminalOutput?: string[];
}

export interface CloudComputerStatus {
  status: 'operational' | 'busy' | 'offline';
  uptimeSeconds: number;
  hostname: string;
  platform: string;
  arch: string;
  cpus: number;
  memory: {
    totalMb: number;
    freeMb: number;
    usedMb: number;
    percentUsed: number;
  };
  nodeVersion: string;
  networkOnline: boolean;
  capabilities: {
    shell: boolean;
    browser: boolean;
    filesystem: boolean;
    python: boolean;
    node: boolean;
    superuser: boolean;
  };
}

export interface BrowserNavigationResult {
  url: string;
  title: string;
  status: number;
  statusText: string;
  durationMs: number;
  contentType: string;
  description?: string;
  textContent: string;
  links: Array<{ text: string; href: string }>;
  headers: Record<string, string>;
  rawHtmlPreview?: string;
  screenshot?: string;
  interactiveElements?: Array<{ type: 'button' | 'link' | 'input'; text: string; selector: string; href?: string }>;
}
