import React, { useState, useEffect, useRef } from 'react';
import { 
  SkipBack, 
  SkipForward, 
  Check, 
  Spinner, 
  Globe, 
  Hand, 
  ShieldWarning,
  HandPointing,
  XCircle,
  NavigationArrow
} from '@phosphor-icons/react';
import { ToolCallTrace } from '../types/project';
import { DynamicRuntimeRunner } from './DynamicRuntimeRunner';
import { extractCleanDomain } from '@/lib/favicon';
import { OrbBloop } from '@/components/orb/bloop/index';
import { BloopState } from '@/components/orb/bloop/types';
import { BLOOP_PALETTES, BloopPaletteName } from '@/components/orb/bloop/palettes';
import WorkingLoader from './WorkingLoader';
import Loader from './Loader';

interface KvantComputerProps {
  toolCalls?: ToolCallTrace[];
  isWorking?: boolean;
  workingTime?: string;
  statusText?: string;
  contextText?: string;
  customFiles?: Record<string, string>;
  onRunTestTool?: (prompt: string) => void;
  agentIntent?: any;
  browserStatus?: 'loading' | 'interactive' | 'error' | 'blocked';
}

// Comprehensive Brand & Portal Registry for instant, accurate address navigation
const KNOWN_WEB_PORTALS: Record<string, string> = {
  openai: 'https://openai.com',
  chatgpt: 'https://chatgpt.com',
  microsoft: 'https://www.microsoft.com',
  apple: 'https://www.apple.com',
  google: 'https://www.google.com',
  youtube: 'https://www.youtube.com',
  globo: 'https://www.globo.com',
  g1: 'https://g1.globo.com',
  ge: 'https://ge.globo.com',
  uol: 'https://www.uol.com.br',
  folha: 'https://www.folha.uol.com.br',
  'folha de sao paulo': 'https://www.folha.uol.com.br',
  'folha de s.paulo': 'https://www.folha.uol.com.br',
  estadao: 'https://www.estadao.com.br',
  estadão: 'https://www.estadao.com.br',
  terra: 'https://www.terra.com.br',
  r7: 'https://www.r7.com',
  cnn: 'https://www.cnnbrasil.com.br',
  'cnn brasil': 'https://www.cnnbrasil.com.br',
  bbc: 'https://www.bbc.com/portuguese',
  'bbc brasil': 'https://www.bbc.com/portuguese',
  'bbc news': 'https://www.bbc.com/news',
  reddit: 'https://www.reddit.com',
  github: 'https://github.com',
  gitlab: 'https://gitlab.com',
  wikipedia: 'https://www.wikipedia.org',
  wikipédia: 'https://pt.wikipedia.org',
  twitter: 'https://x.com',
  x: 'https://x.com',
  amazon: 'https://www.amazon.com.br',
  mercadolivre: 'https://www.mercadolivre.com.br',
  'mercado livre': 'https://www.mercadolivre.com.br',
  shopee: 'https://shopee.com.br',
  aliexpress: 'https://pt.aliexpress.com',
  magalu: 'https://www.magazineluiza.com.br',
  'magazine luiza': 'https://www.magazineluiza.com.br',
  facebook: 'https://www.facebook.com',
  instagram: 'https://www.instagram.com',
  linkedin: 'https://www.linkedin.com',
  netflix: 'https://www.netflix.com',
  spotify: 'https://open.spotify.com',
  twitch: 'https://www.twitch.tv',
  wikimedia: 'https://pt.wikipedia.org',
  bing: 'https://www.bing.com',
  yahoo: 'https://www.yahoo.com',
  tabnews: 'https://www.tabnews.com.br',
  hackernews: 'https://news.ycombinator.com',
  'hacker news': 'https://news.ycombinator.com',
  stackoverflow: 'https://stackoverflow.com',
  'stack overflow': 'https://stackoverflow.com',
  vercel: 'https://vercel.com',
  stripe: 'https://stripe.com',
  linear: 'https://linear.app',
  notion: 'https://www.notion.so',
  figma: 'https://www.figma.com',
  canva: 'https://www.canva.com',
  discord: 'https://discord.com',
  telegram: 'https://web.telegram.org',
  whatsapp: 'https://web.whatsapp.com',
  band: 'https://www.band.uol.com.br',
  'band news': 'https://www.band.uol.com.br/bandnews-fm',
  sbt: 'https://www.sbt.com.br',
  record: 'https://recordtv.r7.com',
  nytimes: 'https://www.nytimes.com',
  'new york times': 'https://www.nytimes.com',
  washingtonpost: 'https://www.washingtonpost.com',
  bloomberg: 'https://www.bloomberg.com',
  reuters: 'https://www.reuters.com',
  techcrunch: 'https://techcrunch.com',
  theverge: 'https://www.theverge.com',
  'the verge': 'https://www.theverge.com',
  wired: 'https://www.wired.com',
  huggingface: 'https://huggingface.co',
  perplexity: 'https://www.perplexity.ai',
  claude: 'https://claude.ai',
  anthropic: 'https://www.anthropic.com'
};

type CursorAnimation = 'idle' | 'moving' | 'clicking' | 'typing' | 'scrolling' | 'reading' | 'loading';

function inferCursorAnimation(status = '', isClicking = false): CursorAnimation {
  const value = status.toLocaleLowerCase('pt-BR');
  if (isClicking || /clic|click|pression|selecion/.test(value)) return 'clicking';
  if (/digit|preench|typing|caret|campo de busca/.test(value)) return 'typing';
  if (/rol|scroll|descendo|subindo/.test(value)) return 'scrolling';
  if (/lendo|leitura|inspec|resultado|conteúdo|conteudo|dom/.test(value)) return 'reading';
  if (/carreg|inici|conect|naveg|acess|abrindo/.test(value)) return 'loading';
  if (/posicion|movendo|cursor|encontr/.test(value)) return 'moving';
  return 'idle';
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('api.')) {
      // Hard block on api subdomains in the UI to match server policy
      return 'https://www.google.com?blocked_api_access';
    }
  } catch {}
  return url;
}

// Intelligent Web URL Parser - accurately extracts destination URLs requested by user
export function resolveWebUrl(raw: string): string {
  let clean = (raw || '').trim();
  if (!clean) return sanitizeUrl('https://www.google.com');

  // 1. Direct explicit URL match (http/https, www, or domain with known TLDs or localhost/IP)
  const explicitUrlRegex = /(https?:\/\/[^\s"'<>]+|localhost(?::\d+)?(?:\/[^\s"'<>]*)?|127\.0\.0\.1(?::\d+)?(?:\/[^\s"'<>]*)?|www\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?::\d+)?(?:\/[^\s"'<>]*)?|[a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|ai|tech|co|app|br|uk|de|fr|es|it|me|info|tv|xyz|dev|cloud|page|link|shop|store|online|site|space|top|club|pro|cc|to|is|gg|live|news|world|agency|studio|global|fm|social|blog|directory|guru|solutions|design|center|life)(?:\.[a-zA-]{2,3})*(?::\d+)?(?:\/[^\s"'<>]*)?)/i;
  
  const urlMatch = clean.match(explicitUrlRegex);
  if (urlMatch) {
    let u = urlMatch[0].replace(/[,;:!?)]+$/, '').trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    return sanitizeUrl(u);
  }

  // 2. Explicit search requests (e.g. "pesquise por X", "procure na web por Y")
  const searchMatch = clean.match(/(?:pesquis(?:e|ar)|busqu(?:e|ar)|procur(?:e|ar)|search for|search|procure na web por|pesquise por)\s+["']?([^"'\n\r]+)["']?/i);
  const lower = clean.toLowerCase();
  if (searchMatch && !lower.includes('endereço') && !lower.includes('endereco') && !lower.includes('acesse') && !lower.includes('abra o site')) {
    const query = searchMatch[1].trim().replace(/^(?:sobre|por)\s+/i, '').trim();
    return sanitizeUrl(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  }

  // 3. Strip command prefixes and boilerplate
  clean = clean
    .replace(/^(?:por\s+favor\s*,?\s*|agente\s*,?\s*|por\s+gentileza\s*,?\s*|please\s*,?\s*|assistente\s*,?\s*)?/i, '')
    .replace(/^(?:acesse|acessar|abra|abrir|navegue(?:\s+até|\s+para)?|navegar|visite|visitar|vá\s+(?:para|até|ao)|va\s+(?:para|ate|ate|ao)|ir\s+para|entre\s+(?:no|na)|entrar\s+(?:no|na)|coloque|carregue|digite|open|navigate\s+to|visit|go\s+to|browse|load)\s+/i, '')
    .replace(/^(?:o\s+endereço(?:\s+na\s+web|\s+web)?|um\s+endereço(?:\s+na\s+web|\s+web)?|o\s+site|um\s+site|a\s+página|uma\s+página|o\s+portal|um\s+portal|a\s+url|uma\s+url|o\s+link|um\s+link|o\s+domínio|um\s+domínio|webpage|page|address)\s*/i, '')
    .replace(/^(?:de|do|da|dos|das|o|a|os|as|um|uma|no|na|em|para|pra|como|chamado|chamada|of|at|to|in|named|called|like)\s+/i, '')
    .replace(/\s+(?:pelo|no|no\s+computador(?:\s+na\s+nuvem)?|na\s+nuvem|pelo\s+computador|no\s+navegador|no\s+browser|no\s+pc|in\s+cloud|in\s+browser)$/i, '')
    .trim();

  // Strip leading punctuation, quotes, brackets
  clean = clean.replace(/^[:\-–—\s"'`<([]+/, '').replace(/[>'"`\)\]]+$/, '').replace(/^(?:de|do|da|dos|das|o|a|os|as|um|uma)\s+/i, '').trim();

  if (!clean || /^(?:endereço|endereco|site|web|internet|computador|navegador|browser|página|pagina|portal|url|link)$/i.test(clean)) {
    return sanitizeUrl('https://www.google.com');
  }

  // 4. Known brand check
  const cleanLower = clean.toLowerCase();
  for (const [brand, bUrl] of Object.entries(KNOWN_WEB_PORTALS)) {
    if (cleanLower === brand || cleanLower === `do ${brand}` || cleanLower === `da ${brand}` || cleanLower.startsWith(brand + ' ') || cleanLower.endsWith(' ' + brand)) {
      return sanitizeUrl(bUrl);
    }
  }

  // 5. Check if it's a domain with path or tld
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(clean)) {
    return sanitizeUrl(`https://${clean}`);
  }

  // 6. Clean single word slug (e.g. "techcrunch", "airbnb")
  if (/^[a-zA-Z0-9-]+$/i.test(clean)) {
    return sanitizeUrl(`https://${clean}.com`);
  }

  // 7. Check if any word in the phrase matches a known brand
  const words = cleanLower.split(/\s+/);
  for (const w of words) {
    if (KNOWN_WEB_PORTALS[w]) {
      return sanitizeUrl(KNOWN_WEB_PORTALS[w]);
    }
  }

  // 8. Default to search portal
  return sanitizeUrl('https://www.google.com');
}

interface NavHistoryItem {
  url: string;
  title: string;
  timestamp: string;
  action?: string;
  screenshot?: string | null;
}

export function KvantComputer({
  toolCalls,
  isWorking = false,
  workingTime,
  statusText = 'Computador do Agente Ativo',
  contextText,
  customFiles,
  agentIntent,
  browserStatus: externalBrowserStatus
}: KvantComputerProps) {
  const [currentUrl, setCurrentUrl] = useState<string>('https://www.google.com');

  // Computer active / inactive state (Inactive by default per user request)
  const [isComputerActive, setIsComputerActive] = useState<boolean>(false);
  const [forceIdle, setForceIdle] = useState<boolean>(false);
  const [pageTitle, setPageTitle] = useState<string>('Navegador do Agente');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExternalWeb, setIsExternalWeb] = useState<boolean>(true);
  const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null);
  const [browserStatus, setBrowserStatus] = useState<'loading' | 'interactive' | 'error' | 'blocked'>('interactive');
  const [bootSecondsRemaining, setBootSecondsRemaining] = useState(0);
  const isBooting = bootSecondsRemaining > 0;
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);

  const handleTurnOnComputer = (targetUrlAfterBoot?: string) => {
    setIsComputerActive(true);
    setBootSecondsRemaining(10);
    setIsLoading(true);
    setBrowserStatus('loading');
    let remaining = 10;
    const timer = window.setInterval(() => {
      remaining -= 1;
      setBootSecondsRemaining(Math.max(remaining, 0));
      if (remaining <= 0) {
        window.clearInterval(timer);
        setIsLoading(false);
        setBrowserStatus('interactive');
      }
    }, 1000);
    if (targetUrlAfterBoot) {
      setCurrentUrl(targetUrlAfterBoot);
      try {
        setPageTitle(new URL(targetUrlAfterBoot).hostname || targetUrlAfterBoot);
      } catch {
        setPageTitle(targetUrlAfterBoot);
      }
    }
  };

  const handleTurnOffComputer = () => {
    setIsComputerActive(false);
    setBootSecondsRemaining(0);
  };

  // Trigger computer activation when research or computer intent is detected, or when agent is working
  useEffect(() => {
    if ((agentIntent && (agentIntent.mode === 'web_research' || agentIntent.mode === 'cloud_computer') || isWorking) && !isComputerActive && !forceIdle) {
      handleTurnOnComputer();
    }
  }, [agentIntent, isWorking, isComputerActive, forceIdle]);

  // A inicialização do computador é deliberadamente visível e bloqueia qualquer ação com animação ampliada
  useEffect(() => {
    if (!/inicializ|iniciando|boot/i.test(statusText || '') && !/inicializ|iniciando|boot/i.test(contextText || '')) return;
    if (bootSecondsRemaining > 0) return;
    setIsComputerActive(true);
    setBrowserStatus('loading');
    setIsLoading(true);
    setBootSecondsRemaining(10);
    let remaining = 10;
    const timer = window.setInterval(() => {
      remaining -= 1;
      setBootSecondsRemaining(Math.max(remaining, 0));
      if (remaining <= 0) {
        window.clearInterval(timer);
        setIsLoading(false);
        setBrowserStatus('interactive');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [statusText, contextText]);

  // Update browserStatus from props if provided
  useEffect(() => {
    if (externalBrowserStatus) {
      setBrowserStatus(externalBrowserStatus);
    }
  }, [externalBrowserStatus]);

  // History stack for navigation & scrubber
  const [navHistory, setNavHistory] = useState<NavHistoryItem[]>([
    {
      url: 'https://www.google.com',
      title: 'Navegador do Agente',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Inicialização'
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // Timeline scrubber state
  const [scrubberValue, setScrubberValue] = useState<number>(100);
  const [isLive, setIsLive] = useState<boolean>(true);

  // Realistic Agent Mouse Cursor
  const [agentCursor, setAgentCursor] = useState<{ x: number; y: number; visible: boolean; isClicking: boolean; label: string; status: string; animation?: CursorAnimation; viewportWidth?: number; viewportHeight?: number }>({
    x: 380,
    y: 190,
    visible: true,
    isClicking: false,
    label: 'Manus',
    status: 'Agente no controle',
    animation: 'idle',
    viewportWidth: 1280,
    viewportHeight: 800
  });
  
  // Agent Keystroke HUD
  const [typedKeys, setTypedKeys] = useState<string[]>([]);
  const [activeTypingBanner, setActiveTypingBanner] = useState<string | null>(null);

  // O navegador é exclusivamente controlado pelo agente; não existe modo manual.
  const userControlMode = false;
  const forceLiveIframe = false;
  const prevIsWorkingRef = useRef(isWorking);
  const lastLiveMouseRef = useRef<{ x: number; y: number; viewportWidth: number; viewportHeight: number } | null>(null);

  // Check if customFiles has an active React code file
  const customCode = 
    customFiles?.['client/src/App.tsx'] || 
    customFiles?.['App.tsx'] ||
    (customFiles && Object.keys(customFiles).length > 0 ? Object.values(customFiles)[0] : undefined);

  // Multi-source CAPTCHA and Security Challenge Scanner
  const isCaptchaOrChallenge = (() => {
    const textToScan = [
      currentUrl,
      pageTitle,
      statusText,
      contextText,
      toolCalls?.[toolCalls.length - 1]?.screenData?.title || '',
      toolCalls?.[toolCalls.length - 1]?.screenData?.actionDescription || '',
      toolCalls?.[toolCalls.length - 1]?.arguments?.url || ''
    ].join(' ').toLowerCase();

    return /captcha|recaptcha|hcaptcha|turnstile|cloudflare|challenge|just a moment|human|robot|bot|security check|verificaç|verifique|desafio|ddos|nowsecure|perimeterx|datadome|arkose|puzzle|shield|atencao|atenção/i.test(textToScan);
  })();

  // Check if the agent is actively working, reasoning, executing tools, or navigating
  const hasActiveToolCalls = Boolean(toolCalls && toolCalls.length > 0 && isWorking);
  const isAgentActive = isWorking || isLoading || hasActiveToolCalls || Boolean(agentIntent && agentIntent.mode !== 'none');

  // Define if the computer is currently in an idle/finished state
  // CRITICAL: isIdle can NEVER be true while the agent is active or executing
  const isIdle = isComputerActive && !isBooting && !isAgentActive && !userControlMode && (forceIdle || (!liveScreenshot && !customCode && !currentUrl));

  // Reset forceIdle whenever the agent becomes active or starts a task
  useEffect(() => {
    if (isAgentActive || userControlMode) {
      setForceIdle(false);
    }
  }, [isAgentActive, userControlMode]);

  const shouldShowLiveIframe = forceLiveIframe || userControlMode || isCaptchaOrChallenge || !liveScreenshot;

  const chromiumWindowRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastProcessedToolRef = useRef<string | null>(null);
  const lastContextTextRef = useRef<string | null>(contextText || null);
  const animationTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllAnimationTimers = () => {
    animationTimersRef.current.forEach(t => clearTimeout(t));
    animationTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearAllAnimationTimers();
  }, []);

  // Listen to postMessage from the proxied live website
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'AGENT_BROWSER_NAVIGATE') {
        const newUrl = event.data.url;
        const newTitle = event.data.title || newUrl;
        
        setCurrentUrl(newUrl);
        setPageTitle(newTitle);
        setIsLoading(false);
        
        setNavHistory(prev => [
          ...prev,
          {
            url: newUrl,
            title: newTitle,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            action: 'Navegação do Agente'
          }
        ]);
        setHistoryIndex(prev => prev + 1);
        setScrubberValue(100);
        setIsLive(true);
      } else if (event.data.type === 'AGENT_BROWSER_STATE') {
        if (event.data.title) {
          setPageTitle(event.data.title);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Agent live action animation on the browser
  const runAgentLiveActionAnimation = (actionType: 'navigate' | 'click' | 'scroll' | 'type', targetVal: string) => {
    if (userControlMode || isBooting) return targetVal;
    clearAllAnimationTimers();
    setIsLoading(true);

    if (actionType === 'navigate') {
      setBrowserStatus('loading');
      setLiveScreenshot(null);
      setIframeLoaded(false);
      const cleanTarget = resolveWebUrl(targetVal);
      let displayHostname = 'site';
      try {
        displayHostname = new URL(cleanTarget).hostname;
      } catch {
        displayHostname = cleanTarget;
      }

      setCurrentUrl(cleanTarget);
      setPageTitle(displayHostname);

      setAgentCursor({
        x: 320,
        y: 45,
        visible: true,
        isClicking: false,
        label: 'Manus',
        status: `Acessando ${displayHostname}...`,
        animation: 'loading'
      });

      const t1 = setTimeout(() => {
        setAgentCursor(prev => ({
          ...prev,
          isClicking: true,
          animation: 'moving',
          status: `Carregando página...`
        }));
        const domainLetters = displayHostname.slice(0, 10).split('');
        setTypedKeys(domainLetters);
      }, 350);
      animationTimersRef.current.push(t1);

      const t2 = setTimeout(() => {
        setTypedKeys(['Enter ↵']);
        setAgentCursor(prev => ({
          ...prev,
          isClicking: false,
          animation: 'reading',
          status: `Conectado em ${displayHostname}`
        }));
        setCurrentUrl(cleanTarget);
        setPageTitle(displayHostname);
      }, 850);
      animationTimersRef.current.push(t2);

      const t3 = setTimeout(() => {
        setTypedKeys([]);
        setAgentCursor({
          x: 400,
          y: 200,
          visible: true,
          isClicking: false,
          label: 'Manus',
          status: `Interagindo em ${displayHostname}`,
          animation: 'moving'
        });
      }, 1400);
      animationTimersRef.current.push(t3);

      const t4 = setTimeout(() => {
        setAgentCursor(prev => ({
          ...prev,
          x: 450,
          y: 260,
          status: `Agente ativo`,
          animation: 'reading'
        }));
        setBrowserStatus('interactive');
        setIsLoading(false);
      }, 2200);
      animationTimersRef.current.push(t4);

      const t5 = setTimeout(() => {
        setAgentCursor(prev => ({
          ...prev,
          isClicking: false,
          status: `Pronto`,
          animation: 'idle'
        }));
      }, 3000);
      animationTimersRef.current.push(t5);

      return cleanTarget;
    }

    if (actionType === 'click') {
      setAgentCursor({
        x: 420,
        y: 240,
        visible: true,
        isClicking: false,
        label: 'Manus',
        status: `Clicando em "${targetVal}"...`,
        animation: 'moving'
      });

      const t1 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, isClicking: true, animation: 'clicking' }));
      }, 400);
      animationTimersRef.current.push(t1);

      const t2 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, isClicking: false, animation: 'idle', status: `Clique concluído` }));
        setIsLoading(false);
      }, 950);
      animationTimersRef.current.push(t2);
      return targetVal;
    }

    if (actionType === 'scroll') {
      setAgentCursor({
        x: 480,
        y: 260,
        visible: true,
        isClicking: false,
        label: 'Manus',
        status: 'Rolando a página...',
        animation: 'scrolling'
      });

      const t1 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, y: 330, isClicking: true, animation: 'scrolling' }));
        // Also send message to iframe if it's there
        iframeRef.current?.contentWindow?.postMessage({ type: 'AGENT_EXEC_SCROLL', deltaY: 450 }, '*');
      }, 350);
      animationTimersRef.current.push(t1);

      const t2 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, isClicking: false, animation: 'idle', status: 'Rolagem concluída' }));
        setIsLoading(false);
      }, 1000);
      animationTimersRef.current.push(t2);
      return targetVal;
    }

    if (actionType === 'type') {
      setAgentCursor({
        x: 390,
        y: 160,
        visible: true,
        isClicking: true,
        label: 'Manus',
        status: `Digitando: "${targetVal}"`,
        animation: 'typing'
      });
      setActiveTypingBanner(targetVal);
      setTypedKeys(targetVal.slice(0, 10).split(''));

      const t1 = setTimeout(() => {
        setTypedKeys([]);
        setActiveTypingBanner(null);
        setAgentCursor(prev => ({ ...prev, isClicking: false, animation: 'idle', status: `Digitação concluída` }));
        setIsLoading(false);
      }, 1100);
      animationTimersRef.current.push(t1);
      return targetVal;
    }
  };

  // Trigger computer activation when agent is working
  useEffect(() => {
    if (isWorking && !isComputerActive) {
      handleTurnOnComputer();
    }
  }, [isWorking, isComputerActive]);

  // Navegação é acionada exclusivamente por toolCalls reais emitidos pelo agente.

  // Synchronize when Agent runs tool calls in Chat
  useEffect(() => {
    if (isBooting) return;
    if (toolCalls && toolCalls.length > 0) {
      if (!isComputerActive) {
        handleTurnOnComputer();
      }
      const lastTool = toolCalls[toolCalls.length - 1];
      if (!lastTool) return;

      if (lastTool.screenData?.screenshot) {
        setLiveScreenshot(lastTool.screenData.screenshot);
      }

      if (lastTool.result) {
        try {
          const res = JSON.parse(lastTool.result);
          if (res.browserStatus) {
            setBrowserStatus(res.browserStatus);
          } else if (lastTool.toolName.includes('navigate') || lastTool.toolName.includes('browser')) {
            setBrowserStatus('interactive');
          }
        } catch {
          if (lastTool.toolName.includes('navigate') || lastTool.toolName.includes('browser')) {
            setBrowserStatus('interactive');
          }
        }
      }

      if (lastTool.status === 'success' && !lastTool.toolName.includes('write')) {
        if (!lastTool.result || !lastTool.result.includes('browserStatus')) {
          setBrowserStatus('interactive');
        }
      }

      const liveMouse = lastTool.screenData?.mousePosition;
      if (liveMouse && Number.isFinite(liveMouse.x) && Number.isFinite(liveMouse.y)) {
        lastLiveMouseRef.current = liveMouse;
        setAgentCursor(prev => ({
          ...prev,
          x: liveMouse.x,
          y: liveMouse.y,
          viewportWidth: liveMouse.viewportWidth || 1280,
          viewportHeight: liveMouse.viewportHeight || 800,
          visible: true,
          isClicking: /clic|click|pression/i.test(lastTool.screenData?.liveStatus || lastTool.screenData?.actionDescription || ''),
          animation: inferCursorAnimation(lastTool.screenData?.liveStatus || lastTool.screenData?.actionDescription || prev.status, /clic|click|pression/i.test(lastTool.screenData?.liveStatus || lastTool.screenData?.actionDescription || '')),
          status: lastTool.screenData?.liveStatus || lastTool.screenData?.actionDescription || prev.status
        }));
      }
      const hasLiveProgress = Boolean(liveMouse || lastLiveMouseRef.current);

      const toolKey = `${lastTool.id}_${lastTool.status}`;
      if (lastProcessedToolRef.current === toolKey) return;
      lastProcessedToolRef.current = toolKey;

      if (lastTool.toolName.includes('navigate') || lastTool.toolName === 'browser') {
        const rawUrl = lastTool.screenData?.url || lastTool.arguments?.url || currentUrl || 'https://www.google.com';
        const clean = resolveWebUrl(rawUrl);
        setCurrentUrl(clean);
        setIsExternalWeb(true);
        if (!hasLiveProgress) {
          runAgentLiveActionAnimation('navigate', clean);
        } else {
          setIsLoading(false);
        }

        if (lastTool.screenData?.title) {
          setPageTitle(lastTool.screenData.title);
        }

        setNavHistory(prev => [
          ...prev,
          {
            url: clean,
            title: lastTool.screenData?.title || clean,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            action: lastTool.toolName
          }
        ]);
        setHistoryIndex(prev => prev + 1);
        setScrubberValue(100);
        setIsLive(true);
      } else if (lastTool.toolName.includes('click')) {
        const target = lastTool.arguments?.selector || lastTool.arguments?.target || 'elemento';
        if (!hasLiveProgress) runAgentLiveActionAnimation('click', target); else setIsLoading(false);
      } else if (lastTool.toolName.includes('scroll')) {
        if (!hasLiveProgress) runAgentLiveActionAnimation('scroll', 'down'); else setIsLoading(false);
      } else if (lastTool.toolName.includes('type')) {
        const text = lastTool.arguments?.text || 'texto';
        if (!hasLiveProgress) runAgentLiveActionAnimation('type', text); else setIsLoading(false);
      } else if (lastTool.toolName.includes('search') || lastTool.toolName.includes('inspect')) {
        const rawUrl = lastTool.screenData?.url || lastTool.arguments?.url || currentUrl;
        setCurrentUrl(rawUrl);
        setPageTitle(lastTool.screenData?.title || new URL(rawUrl).hostname);
        setIsExternalWeb(true);
        setIsLoading(false);
      }
    }
  }, [toolCalls, currentUrl, isBooting]);

  const handleBack = () => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const prevItem = navHistory[targetIdx];
      setHistoryIndex(targetIdx);
      setCurrentUrl(prevItem.url);
      setPageTitle(prevItem.title);
      if (prevItem.screenshot) {
        setLiveScreenshot(prevItem.screenshot);
      }
      setIsLive(false);
      setScrubberValue(Math.round((targetIdx / Math.max(1, navHistory.length - 1)) * 100));
    }
  };

  const handleForward = () => {
    if (historyIndex < navHistory.length - 1) {
      const targetIdx = historyIndex + 1;
      const nextItem = navHistory[targetIdx];
      setHistoryIndex(targetIdx);
      setCurrentUrl(nextItem.url);
      setPageTitle(nextItem.title);
      if (nextItem.screenshot) {
        setLiveScreenshot(nextItem.screenshot);
      }
      const isAtEnd = targetIdx >= navHistory.length - 1;
      setIsLive(isAtEnd);
      setScrubberValue(Math.round((targetIdx / Math.max(1, navHistory.length - 1)) * 100));
    }
  };

  const proxySrc = `/api/browser/proxy?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-canvas-main text-text-content-primary select-none overflow-hidden font-sans">
      
      {/* 1. AGENT SUB-HEADER (Shown when active/working or when viewing history via scrubber) */}
      {isComputerActive && (!isIdle || !isLive) && (
        <div className="h-8 px-4 bg-bg-surface-panel border-b border-border-divider-subtle flex items-center justify-between text-xs shrink-0 select-none">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="text-text-content-secondary font-normal text-[11.5px] tracking-tight">
              {!isLive ? 'Histórico de Execução do Agente' : (isBooting ? 'Computador está iniciando...' : (isLoading ? 'Manus está interagindo...' : 'Manus está usando o Navegador'))}
            </span>
            <span className="text-border-divider-subtle text-xs">|</span>
            <span className="text-text-content-secondary/80 font-mono text-[11px] truncate tracking-tight">
              {extractCleanDomain(currentUrl) || currentUrl}
            </span>
          </div>
        </div>
      )}

      {/* 2. CHROMIUM BROWSER WINDOW (AUTHENTIC CLOUD COMPUTER INTERFACE) */}
      <div 
        ref={chromiumWindowRef}
        className="flex-1 flex flex-col bg-bg-canvas-main overflow-hidden relative"
      >


        {/* BROWSER WEBPAGE VIEWPORT */}
        {!isComputerActive ? (
          /* INACTIVE COMPUTER SCREEN PER USER REQUEST */
          <div className="flex-1 bg-bg-canvas-main flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto space-y-4">
              {/* Image requested by user with no background container */}
              <img 
                src="https://imgdb.io/i/kescF0A.png" 
                alt="O computador do Kvant está inativo" 
                className="w-56 sm:w-64 md:w-72 h-auto object-contain drop-shadow-md"
              />

              {/* Title text */}
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Computador Manus v1.0.1
              </h3>

              {/* Subtext */}
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm">
                Envie uma instrução ao agente no chat para ligar o computador e iniciar as automações.
              </p>
          </div>
        ) : isBooting ? (
          /* COMPUTER BOOTING ANIMATION SCREEN */
          <div className="flex-1 bg-[#1a1a1a] flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center pt-6 pb-2">
              <Loader />
            </div>

            <div className="flex flex-col items-center space-y-1.5 max-w-sm">
              <div className="bg-[#50a2ff]/10 border border-[#50a2ff]/30 text-[#50a2ff] px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
                Inicializando computador do agente
              </div>
              <p className="text-sm font-medium text-white tracking-tight">
                Ambiente Computer MCP em inicialização
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                {bootSecondsRemaining}s restantes · Conectando ao container Linux
              </p>
            </div>
          </div>
        ) : (isIdle && isLive) ? (
          /* ACTIVE BUT IDLE COMPUTER SCREEN (NOTHING TO SHOW) */
          <div className="flex-1 bg-bg-canvas-main flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto space-y-4 animate-in fade-in duration-500">
              <img 
                src="https://imgdb.io/i/-E1nG20.png" 
                alt="Nada para mostrar" 
                className="w-56 sm:w-64 md:w-72 h-auto object-contain drop-shadow-md"
              />

              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Processamento Concluído
              </h3>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm">
                Não há nada para ser mostrado no momento. O agente encerrou a navegação e o sistema está em modo de espera.
              </p>
          </div>
        ) : (
          <div 
            className={`relative flex-1 bg-white overflow-hidden flex flex-col min-h-0 cursor-not-allowed select-none`}
            style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}
          >
            {/* Floating CAPTCHA / Security Challenge Alert Banner */}
            {isCaptchaOrChallenge && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-amber-500/95 text-slate-950 font-medium text-xs px-4 py-2 rounded-xl shadow-2xl border border-amber-300 flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
                <ShieldWarning size={16} className="text-slate-950 shrink-0 animate-bounce" />
                <span><strong>CAPTCHA / Desafio de Segurança Detectado!</strong> O navegador ao vivo está liberado para interagir.</span>
                <span className="text-slate-950/70 text-[11px] font-semibold shrink-0">O agente pausou a automação.</span>
              </div>
            )}

            {/* Complete website rendered via proxy or dynamic runtime with decreased zoom (85% scale) in light mode */}
            {isExternalWeb || !customCode ? (
              <div className="relative w-full h-full flex-1 overflow-hidden bg-white" style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}>
                <div 
                  className="origin-top-left transition-transform duration-200 bg-white" 
                  style={{ transform: 'scale(0.70)', width: '142.86%', height: '142.86%', colorScheme: 'light', backgroundColor: '#ffffff' }}
                >
                  {!shouldShowLiveIframe && liveScreenshot ? (
                    <div className="w-full h-full bg-[#f7f7f7] flex items-center justify-center overflow-hidden group/screenshot">
                      <img
                        src={liveScreenshot}
                        alt={`Captura ao vivo de ${pageTitle || currentUrl}`}
                        className={`h-full w-full object-contain pointer-events-none transition-all duration-700 group-hover/screenshot:scale-[1.01] ${isLoading && agentCursor.status?.includes('Rolando') ? '-translate-y-8 opacity-90 blur-[0.5px]' : ''}`}
                        onError={() => setLiveScreenshot(null)}
                      />

                      {browserStatus === 'loading' && !isLoading && !liveScreenshot && (
                        <div className="absolute inset-0 z-10 bg-[#1a1a1a] flex flex-col items-center justify-center animate-in fade-in duration-300">
                          <div className="flex flex-col items-center gap-4">
                            <div className="sp-vortex-loader" />
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest animate-pulse">Carregando Domínio Real...</span>
                          </div>
                        </div>
                      )}

                      {browserStatus === 'error' && (
                        <div className="absolute inset-0 z-10 bg-red-500/5 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                          <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
                            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                              <XCircle size={28} weight="fill" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-900">Erro de Conectividade</h4>
                              <p className="text-[11px] text-slate-500 leading-relaxed">Não foi possível carregar a página solicitada. O site pode estar inacessível ou bloqueando o acesso automatizado.</p>
                            </div>
                            <p className="text-[10px] text-slate-400">A próxima tentativa será iniciada exclusivamente pelo agente.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full h-full bg-white" style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}>
                      <iframe
                        ref={iframeRef}
                        src={proxySrc}
                        title="Computador na Nuvem"
                        className={`w-full h-full border-0 absolute inset-0 bg-white pointer-events-none`}
                        style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                        onLoad={() => {
                          setIframeLoaded(true);
                          setIsLoading(false);
                        }}
                      />
                      {!iframeLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1a1a1a] p-6 animate-in fade-in duration-500">
                          <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                               <div className="absolute -inset-4 bg-white/5 rounded-full blur-xl animate-pulse" />
                               <div className="sp-vortex-loader" />
                            </div>
                            <div className="text-center space-y-1.5">
                              <p className="text-xs font-semibold text-white/90 tracking-wide">Navegador do agente conectado</p>
                              <p className="text-[10px] text-white/40 max-w-[200px] leading-relaxed">Sincronizando ambiente visual para <span className="font-mono text-white/60">{pageTitle || currentUrl}</span></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`w-full h-full flex-1 relative overflow-hidden bg-white text-slate-900 pointer-events-none`} style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}>
                <div 
                  className="origin-top-left transition-transform duration-200 overflow-auto w-full h-full bg-white" 
                  style={{ transform: 'scale(0.70)', width: '142.86%', height: '142.86%', colorScheme: 'light', backgroundColor: '#ffffff' }}
                >
                  <DynamicRuntimeRunner code={customCode} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* AGENT MOUSE CURSOR: Positioned over the remote desktop */}
        {agentCursor.visible && isComputerActive && !isIdle && !isBooting && (liveScreenshot || iframeLoaded || customCode) && (isWorking || userControlMode || liveScreenshot || customCode) && (
          <span 
            className="absolute pointer-events-none transition-all duration-300 ease-out z-50 bg-transparent !bg-transparent border-none !border-none shadow-none !shadow-none"
            style={{
              left: `calc(${Math.min(100, Math.max(0, (agentCursor.x / (agentCursor.viewportWidth || 1280)) * 100))}% - 12px)`,
              top: `calc(32px + ${Math.min(100, Math.max(0, (agentCursor.y / (agentCursor.viewportHeight || 800)) * 100))}% - 12px)`,
              backgroundColor: 'transparent'
            }}
          >
            <span className={`relative flex items-center bg-transparent !bg-transparent cursor-animation-${agentCursor.animation || 'idle'}`} style={{ backgroundColor: 'transparent' }}>
              {(agentCursor.animation === 'moving' || agentCursor.animation === 'loading') && (
                <span className="absolute -left-3 top-1 flex gap-0.5 opacity-70">
                  <span className="size-1 rounded-full bg-cyan-300 animate-ping" />
                  <span className="size-1 rounded-full bg-blue-300 animate-pulse" />
                </span>
              )}
              {agentCursor.animation === 'clicking' && (
                <span className="absolute inset-0 size-11 -left-2.5 -top-2.5 rounded-full border-2 border-blue-400/70 animate-ping" />
              )}
              {agentCursor.animation === 'scrolling' && (
                <span className="absolute -right-5 -top-1 flex flex-col items-center text-cyan-300 animate-bounce">
                  <span className="text-[9px] leading-none">⌃</span><span className="text-[9px] leading-none">⌄</span>
                </span>
              )}
              {agentCursor.animation === 'typing' && (
                <span className="absolute -right-3 -top-2 h-5 w-0.5 bg-amber-300 animate-pulse" />
              )}
              {agentCursor.animation === 'reading' && (
                <span className="absolute -left-2 top-3 h-0.5 w-8 bg-emerald-300/80 blur-[0.5px] animate-pulse" />
              )}
              <NavigationArrow 
                size={22} 
                weight="fill" 
                className={`text-white transition-transform duration-200 ${agentCursor.animation === 'clicking' ? 'scale-75 text-blue-400' : agentCursor.animation === 'loading' ? 'animate-spin text-cyan-300' : 'scale-100'}`}
                style={{ 
                  stroke: '#000000', 
                  strokeWidth: '1.75px', 
                  strokeLinejoin: 'round', 
                  paintOrder: 'stroke fill',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
                }}
              />
            </span>
          </span>
        )}

        {/* Agent Keystroke HUD removed per user request */}

        {/* Agent Typing Banner removed per user request */}

      </div>

      {/* 3. BOTTOM CONTROLS & TIMELINE SCRUBBER BAR */}
      <div className="px-4 py-2 bg-[#1a1a1a] border-t border-[#252525] shrink-0 select-none space-y-1.5">
        
        {/* Scrubber Row - Shown only when computer is active */}
        {isComputerActive && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <button 
                onClick={() => {
                  setScrubberValue(prev => Math.max(0, prev - 15));
                  handleBack();
                }}
                title="Passo anterior"
                className="hover:text-white transition-colors cursor-pointer p-0.5"
              >
                <SkipBack size={15} strokeWidth={2} />
              </button>
              <button 
                onClick={() => {
                  setScrubberValue(prev => Math.min(100, prev + 15));
                  handleForward();
                }}
                title="Próximo passo"
                className="hover:text-white transition-colors cursor-pointer p-0.5"
              >
                <SkipForward size={15} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 relative flex items-center h-4 group">
              <div className="h-1 w-full bg-[#262626] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ width: `${scrubberValue}%` }}
                />
              </div>

              <div 
                className="absolute size-2 rounded-full bg-blue-500 ring-2 ring-blue-400/40 shadow-md shadow-blue-500/30 transition-all duration-150 pointer-events-none group-hover:scale-125"
                style={{ left: `calc(${scrubberValue}% - 4px)` }}
              />

              <input 
                type="range"
                min="0"
                max="100"
                value={scrubberValue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setScrubberValue(val);
                  const isNowLive = val >= 94;
                  setIsLive(isNowLive);
                  if (navHistory.length > 0) {
                    const targetIdx = Math.min(
                      navHistory.length - 1,
                      Math.max(0, Math.round((val / 100) * (navHistory.length - 1)))
                    );
                    setHistoryIndex(targetIdx);
                    const item = navHistory[targetIdx];
                    if (item) {
                      setCurrentUrl(item.url);
                      setPageTitle(item.title);
                      if (item.screenshot) {
                        setLiveScreenshot(item.screenshot);
                      }
                    }
                  }
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              />
            </div>

            <div 
              onClick={() => {
                setScrubberValue(100);
                setIsLive(true);
                const latest = navHistory[navHistory.length - 1];
                if (latest) {
                  setCurrentUrl(latest.url);
                  setPageTitle(latest.title);
                  if (latest.screenshot) {
                    setLiveScreenshot(latest.screenshot);
                  }
                }
              }}
              className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer transition-colors"
              title="Voltar ao vivo"
            >
              <span className={`size-1.5 rounded-full ${isLive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-emerald-500/40'}`} />
              <span className={`text-[11px] ${isLive ? 'text-white font-semibold' : 'text-zinc-400'}`}>Ao vivo</span>
            </div>
          </div>
        )}

        {/* Bottom Status Row */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div className="flex items-center gap-1.5 font-medium text-[11.5px]">
            {!isComputerActive ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="size-2 rounded-full bg-zinc-600" />
                <span>O computador do Kvant está inativo</span>
              </div>
            ) : isWorking ? (
              <WorkingLoader />
            ) : isBooting ? (
              <div className="flex items-center gap-1.5 text-cyan-300/80">
                <div className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Inicializando computador do agente · {bootSecondsRemaining}s restantes</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5" style={{ color: '#68ca3c' }}>
                <Check size={13} strokeWidth={2.5} />
                <span>Tarefa Concluída</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
