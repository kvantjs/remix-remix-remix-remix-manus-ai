type GeminiClientLike = {
  models: {
    generateContent: (request: any) => Promise<any>;
  };
} | null;

type ModelRequest = {
  model?: string;
  contents: any;
  config?: Record<string, any>;
};

function stringify(value: any): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return String(value ?? '');
  }
}

function asText(value: any): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (Array.isArray(value.parts)) return value.parts.map(asText).filter(Boolean).join('\n');
  }
  return '';
}

function normalizeSchema(value: any): any {
  if (Array.isArray(value)) return value.map(normalizeSchema);
  if (!value || typeof value !== 'object') return value;
  const normalized: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'type' && typeof item === 'string') normalized[key] = item.toLowerCase();
    else normalized[key] = normalizeSchema(item);
  }
  return normalized;
}

function parseArguments(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function safeVisibleText(value: any): string {
  return String(value || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
    .replace(/^\s*<think>[\s\S]*$/i, '')
    .trim();
}

function convertContents(contents: any, systemInstruction: any): any[] {
  const messages: any[] = [];
  const systemText = asText(systemInstruction);
  if (systemText.trim()) messages.push({
    role: 'system',
    content: `${systemText}\n\nResponda somente com a resposta final ou chamadas de ferramenta. Nunca exponha análise, raciocínio privado ou texto de planejamento interno.`
  });

  const list = Array.isArray(contents) ? contents : [{ role: 'user', parts: [{ text: asText(contents) }] }];
  for (const item of list) {
    if (!item) continue;
    const role = item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user';
    const parts = Array.isArray(item.parts) ? item.parts : [{ text: asText(item) }];
    const text = parts.map((part: any) => typeof part?.text === 'string' ? part.text : '').filter(Boolean).join('\n');
    const images = parts.filter((part: any) => part?.inlineData?.data).map((part: any) => part.inlineData.data);
    const toolCalls = parts.filter((part: any) => part?.functionCall).map((part: any, index: number) => ({
      type: 'function',
      function: {
        index,
        name: String(part.functionCall.name || ''),
        arguments: parseArguments(part.functionCall.args)
      }
    }));
    const toolResponses = parts.filter((part: any) => part?.functionResponse).map((part: any) => part.functionResponse);

    if (text || images.length || toolCalls.length || (role === 'assistant' && parts.length === 0)) {
      const message: any = { role, content: text };
      if (images.length) message.images = images;
      if (toolCalls.length) message.tool_calls = toolCalls;
      messages.push(message);
    }
    for (const response of toolResponses) {
      messages.push({
        role: 'tool',
        tool_name: String(response.name || 'tool'),
        content: stringify(response.response)
      });
    }
  }
  return messages;
}

function convertTools(config: Record<string, any> | undefined): any[] {
  const declarations = (Array.isArray(config?.tools) ? config!.tools : [])
    .flatMap((tool: any) => Array.isArray(tool?.functionDeclarations) ? tool.functionDeclarations : []);
  return declarations.map((declaration: any) => ({
    type: 'function',
    function: {
      name: String(declaration.name || ''),
      description: String(declaration.description || ''),
      parameters: normalizeSchema(declaration.parameters || { type: 'object', properties: {} })
    }
  })).filter((tool: any) => tool.function.name);
}

async function generateWithOllama(request: ModelRequest, model: string): Promise<any> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const url = `${baseUrl}/api/chat`;
  const numCtx = Math.max(2048, Number(process.env.OLLAMA_NUM_CTX) || 8192);
  const numPredict = Math.max(256, Number(process.env.OLLAMA_NUM_PREDICT) || 4096);
  const timeoutMs = Math.max(10000, Number(process.env.OLLAMA_TIMEOUT_MS) || 300000);
  const config = request.config || {};
  const body: Record<string, any> = {
    model,
    messages: convertContents(request.contents, config.systemInstruction),
    stream: false,
    think: false,
    keep_alive: '5m',
    options: { num_ctx: numCtx, num_predict: numPredict }
  };
  const tools = convertTools(config);
  if (tools.length) body.tools = tools;
  if (config.responseMimeType === 'application/json') {
    body.format = config.responseSchema ? normalizeSchema(config.responseSchema) : 'json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`Ollama respondeu HTTP ${response.status}: ${raw.slice(0, 700)}`);
    const parsed = JSON.parse(raw);
    const message = parsed.message || {};
    const parts: any[] = [];
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    const visibleText = toolCalls.length ? '' : safeVisibleText(message.content);
    if (visibleText) parts.push({ text: visibleText });
    for (const call of toolCalls) {
      const functionCall = call?.function || {};
      if (!functionCall.name) continue;
      parts.push({ functionCall: { name: functionCall.name, args: parseArguments(functionCall.arguments) } });
    }
    return {
      model: parsed.model || model,
      candidates: [{ content: { role: 'model', parts } }],
      usageMetadata: {
        promptTokenCount: parsed.prompt_eval_count,
        candidatesTokenCount: parsed.eval_count,
        totalTokenCount: Number(parsed.prompt_eval_count || 0) + Number(parsed.eval_count || 0)
      }
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error(`Tempo limite excedido no modelo local (${Math.round(timeoutMs / 1000)}s).`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateContentWithProvider(client: GeminiClientLike, request: ModelRequest): Promise<any> {
  const localModel = String(process.env.OLLAMA_MODEL || '').trim();
  if (localModel) return generateWithOllama(request, localModel);
  if (!client) throw new Error('Nenhum provedor de IA está configurado. Defina OLLAMA_MODEL ou uma chave Gemini.');
  return client.models.generateContent(request);
}
