import React, { useState, useEffect, useRef } from 'react';
import { 
  SkipBack, 
  SkipForward, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  ArrowClockwise, 
  Lock, 
  Spinner, 
  Globe, 
  Hand, 
  LockOpen, 
  ShieldWarning,
  Power,
  Path
} from '@phosphor-icons/react';
import { ToolCallTrace } from '../types/project';
import { DynamicRuntimeRunner } from './DynamicRuntimeRunner';
import { Favicon, extractCleanDomain } from '@/lib/favicon';

interface KvantComputerProps {
  toolCalls?: ToolCallTrace[];
  isWorking?: boolean;
  workingTime?: string;
  statusText?: string;
  contextText?: string;
  customFiles?: Record<string, string>;
  onRunTestTool?: (prompt: string) => void;
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

// Intelligent Web URL Parser - accurately extracts destination URLs requested by user
export function resolveWebUrl(raw: string): string {
  let clean = (raw || '').trim();
  if (!clean) return 'https://news.ycombinator.com';

  // 1. Direct explicit URL match (http/https, www, or domain with known TLDs or localhost/IP)
  const explicitUrlRegex = /(https?:\/\/[^\s"'<>]+|localhost(?::\d+)?(?:\/[^\s"'<>]*)?|127\.0\.0\.1(?::\d+)?(?:\/[^\s"'<>]*)?|www\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?::\d+)?(?:\/[^\s"'<>]*)?|[a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|ai|tech|co|app|br|uk|de|fr|es|it|me|info|tv|xyz|dev|cloud|page|link|shop|store|online|site|space|top|club|pro|cc|to|is|gg|live|news|world|agency|studio|global|fm|social|blog|directory|guru|solutions|design|center|life)(?:\.[a-zA-Z]{2,3})*(?::\d+)?(?:\/[^\s"'<>]*)?)/i;
  
  const urlMatch = clean.match(explicitUrlRegex);
  if (urlMatch) {
    let u = urlMatch[0].replace(/[,;:!?)]+$/, '').trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    return u;
  }

  // 2. Explicit search requests (e.g. "pesquise por X", "procure na web por Y")
  const searchMatch = clean.match(/(?:pesquis(?:e|ar)|busqu(?:e|ar)|procur(?:e|ar)|search for|search|procure na web por|pesquise por)\s+["']?([^"'\n\r]+)["']?/i);
  const lower = clean.toLowerCase();
  if (searchMatch && !lower.includes('endereço') && !lower.includes('endereco') && !lower.includes('acesse') && !lower.includes('abra o site')) {
    const query = searchMatch[1].trim().replace(/^(?:sobre|por)\s+/i, '').trim();
    return 'https://news.ycombinator.com';
  }

  // 3. Strip command prefixes and boilerplate
  clean = clean
    .replace(/^(?:por\s+favor\s*,?\s*|agente\s*,?\s*|por\s+gentileza\s*,?\s*|please\s*,?\s*|assistente\s*,?\s*)?/i, '')
    .replace(/^(?:acesse|acessar|abra|abrir|navegue(?:\s+até|\s+para)?|navegar|visite|visitar|vá\s+(?:para|até|ao)|va\s+(?:para|ate|ao)|ir\s+para|entre\s+(?:no|na)|entrar\s+(?:no|na)|coloque|carregue|digite|open|navigate\s+to|visit|go\s+to|browse|load)\s+/i, '')
    .replace(/^(?:o\s+endereço(?:\s+na\s+web|\s+web)?|um\s+endereço(?:\s+na\s+web|\s+web)?|o\s+site|um\s+site|a\s+página|uma\s+página|o\s+portal|um\s+portal|a\s+url|uma\s+url|o\s+link|um\s+link|o\s+domínio|um\s+domínio|webpage|page|address)\s*/i, '')
    .replace(/^(?:de|do|da|dos|das|o|a|os|as|um|uma|no|na|em|para|pra|como|chamado|chamada|of|at|to|in|named|called|like)\s+/i, '')
    .replace(/\s+(?:pelo|no|no\s+computador(?:\s+na\s+nuvem)?|na\s+nuvem|pelo\s+computador|no\s+navegador|no\s+browser|no\s+pc|in\s+cloud|in\s+browser)$/i, '')
    .trim();

  // Strip leading punctuation, quotes, brackets
  clean = clean.replace(/^[:\-–—\s"'`<([]+/, '').replace(/[>'"`\)\]]+$/, '').replace(/^(?:de|do|da|dos|das|o|a|os|as|um|uma)\s+/i, '').trim();

  if (!clean || /^(?:endereço|endereco|site|web|internet|computador|navegador|browser|página|pagina|portal|url|link)$/i.test(clean)) {
    return 'https://news.ycombinator.com';
  }

  // 4. Known brand check
  const cleanLower = clean.toLowerCase();
  for (const [brand, bUrl] of Object.entries(KNOWN_WEB_PORTALS)) {
    if (cleanLower === brand || cleanLower === `do ${brand}` || cleanLower === `da ${brand}` || cleanLower.startsWith(brand + ' ') || cleanLower.endsWith(' ' + brand)) {
      return bUrl;
    }
  }

  // 5. Check if it's a domain with path or tld
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/.*)?$/i.test(clean)) {
    return `https://${clean}`;
  }

  // 6. Clean single word slug (e.g. "techcrunch", "airbnb")
  if (/^[a-zA-Z0-9-]+$/i.test(clean)) {
    return `https://${clean}.com`;
  }

  // 7. Check if any word in the phrase matches a known brand
  const words = cleanLower.split(/\s+/);
  for (const w of words) {
    if (KNOWN_WEB_PORTALS[w]) {
      return KNOWN_WEB_PORTALS[w];
    }
  }

  // 8. Default to news portal
  return 'https://news.ycombinator.com';
}

interface NavHistoryItem {
  url: string;
  title: string;
  timestamp: string;
  action?: string;
}

export function KvantComputer({
  toolCalls,
  isWorking = false,
  workingTime,
  statusText = 'Computador do Agente Ativo',
  contextText,
  customFiles
}: KvantComputerProps) {
  const [currentUrl, setCurrentUrl] = useState<string>('https://news.ycombinator.com');
  const [pageTitle, setPageTitle] = useState<string>('Hacker News');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExternalWeb, setIsExternalWeb] = useState<boolean>(true);
  const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);

  // Computer active / inactive state (Inactive by default per user request)
  const [isComputerActive, setIsComputerActive] = useState<boolean>(false);

  const handleTurnOnComputer = (targetUrlAfterBoot?: string) => {
    setIsComputerActive(true);
    if (targetUrlAfterBoot) {
      setCurrentUrl(targetUrlAfterBoot);
      setPageTitle(new URL(targetUrlAfterBoot).hostname || targetUrlAfterBoot);
    }
  };

  const handleTurnOffComputer = () => {
    setIsComputerActive(false);
  };

  // History stack for navigation & scrubber
  const [navHistory, setNavHistory] = useState<NavHistoryItem[]>([
    {
      url: 'https://news.ycombinator.com',
      title: 'Hacker News',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Página Inicial'
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // Timeline scrubber state
  const [scrubberValue, setScrubberValue] = useState<number>(100);
  const [isLive, setIsLive] = useState<boolean>(true);

  // Realistic Agent Mouse Cursor
  const [agentCursor, setAgentCursor] = useState({
    x: 380,
    y: 190,
    visible: true,
    isClicking: false,
    label: 'Manus',
    status: 'Agente no controle'
  });
  
  // Agent Keystroke HUD
  const [typedKeys, setTypedKeys] = useState<string[]>([]);
  const [activeTypingBanner, setActiveTypingBanner] = useState<string | null>(null);

  // Exclusive agent mode notification when user tries to click the remote desktop
  const [showObserverNotice, setShowObserverNotice] = useState<boolean>(false);
  const [userControlMode, setUserControlMode] = useState<boolean>(false);
  const [forceLiveIframe, setForceLiveIframe] = useState<boolean>(true);
  const noticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check if customFiles has an active React code file
  const customCode = 
    customFiles?.['client/src/App.tsx'] || 
    customFiles?.['Home.tsx'] || 
    customFiles?.['App.tsx'] ||
    (customFiles && Object.keys(customFiles).length > 0 ? Object.values(customFiles)[0] : undefined);

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
    if (userControlMode) return targetVal;
    clearAllAnimationTimers();
    setIsLoading(true);

    if (actionType === 'navigate') {
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
        status: `Acessando ${displayHostname}...`
      });

      const t1 = setTimeout(() => {
        setAgentCursor(prev => ({
          ...prev,
          isClicking: true,
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
          status: `Interagindo em ${displayHostname}`
        });
      }, 1400);
      animationTimersRef.current.push(t3);

      const t4 = setTimeout(() => {
        setAgentCursor(prev => ({
          ...prev,
          x: 450,
          y: 260,
          status: `Agente ativo`
        }));
        setIsLoading(false);
      }, 2200);
      animationTimersRef.current.push(t4);

      const t5 = setTimeout(() => {
        setAgentCursor(prev => ({
          ...prev,
          isClicking: false,
          status: `Pronto`
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
        status: `Clicando em "${targetVal}"...`
      });

      const t1 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, isClicking: true }));
      }, 400);
      animationTimersRef.current.push(t1);

      const t2 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, isClicking: false, status: `Clique concluído` }));
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
        status: 'Rolando a página...'
      });

      const t1 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, y: 330, isClicking: true }));
        iframeRef.current?.contentWindow?.postMessage({ type: 'AGENT_EXEC_SCROLL', deltaY: 450 }, '*');
      }, 350);
      animationTimersRef.current.push(t1);

      const t2 = setTimeout(() => {
        setAgentCursor(prev => ({ ...prev, isClicking: false, status: 'Rolagem concluída' }));
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
        status: `Digitando: "${targetVal}"`
      });
      setActiveTypingBanner(targetVal);
      setTypedKeys(targetVal.slice(0, 10).split(''));

      const t1 = setTimeout(() => {
        setTypedKeys([]);
        setActiveTypingBanner(null);
        setAgentCursor(prev => ({ ...prev, isClicking: false, status: `Digitação concluída` }));
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

  // Listen to chat prompt / context to navigate
  useEffect(() => {
    if (contextText && contextText !== lastContextTextRef.current) {
      lastContextTextRef.current = contextText;
      const isExplicitNavigation = /https?:\/\/|www\.|(?:acesse|acessar|abra|abrir|navegue|navegar|visite|visitar|pesquis(?:e|ar)|busqu(?:e|ar)|procure|search|open|go\s+to)\b/i.test(contextText);
      const dest = isExplicitNavigation ? resolveWebUrl(contextText) : currentUrl;

      if (!isComputerActive) {
        handleTurnOnComputer(isExplicitNavigation ? dest : undefined);
      } else if (isExplicitNavigation) {
        setCurrentUrl(dest);
        setIsExternalWeb(true);
        runAgentLiveActionAnimation('navigate', dest);

        const newHistory = [...navHistory.slice(0, historyIndex + 1), {
          url: dest,
          title: dest,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Instrução do Usuário'
        }];
        setNavHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setScrubberValue(100);
        setIsLive(true);
      }
    }
  }, [contextText, customCode, isComputerActive]);

  // Synchronize when Agent runs tool calls in Chat
  useEffect(() => {
    if (toolCalls && toolCalls.length > 0) {
      if (!isComputerActive) {
        handleTurnOnComputer();
      }
      const lastTool = toolCalls[toolCalls.length - 1];
      if (!lastTool) return;

      if (lastTool.screenData?.screenshot) {
        setLiveScreenshot(lastTool.screenData.screenshot);
      }

      const toolKey = `${lastTool.id}_${lastTool.status}`;
      if (lastProcessedToolRef.current === toolKey) return;
      lastProcessedToolRef.current = toolKey;

      if (lastTool.toolName.includes('navigate') || lastTool.toolName === 'browser') {
        const rawUrl = lastTool.screenData?.url || lastTool.arguments?.url || 'https://news.ycombinator.com';
        const clean = resolveWebUrl(rawUrl);
        setCurrentUrl(clean);
        setIsExternalWeb(true);
        runAgentLiveActionAnimation('navigate', clean);

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
        runAgentLiveActionAnimation('click', target);
      } else if (lastTool.toolName.includes('scroll')) {
        runAgentLiveActionAnimation('scroll', 'down');
      } else if (lastTool.toolName.includes('type')) {
        const text = lastTool.arguments?.text || 'texto';
        runAgentLiveActionAnimation('type', text);
      } else if (lastTool.toolName.includes('search') || lastTool.toolName.includes('inspect')) {
        const rawUrl = lastTool.screenData?.url || lastTool.arguments?.url || currentUrl;
        setCurrentUrl(rawUrl);
        setPageTitle(lastTool.screenData?.title || new URL(rawUrl).hostname);
        setIsExternalWeb(true);
        setIsLoading(false);
      }
    }
  }, [toolCalls, currentUrl]);

  const handleBack = () => {
    if (historyIndex > 0) {
      const prevItem = navHistory[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setCurrentUrl(prevItem.url);
      setPageTitle(prevItem.title);
      setScrubberValue(Math.round(((historyIndex - 1) / Math.max(1, navHistory.length - 1)) * 100));
    }
  };

  const handleForward = () => {
    if (historyIndex < navHistory.length - 1) {
      const nextItem = navHistory[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setCurrentUrl(nextItem.url);
      setPageTitle(nextItem.title);
      setScrubberValue(Math.round(((historyIndex + 1) / (navHistory.length - 1)) * 100));
    }
  };

  // Observer notice on user attempt to click directly in viewport
  const handleUserAttemptClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setShowObserverNotice(true);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => {
      setShowObserverNotice(false);
    }, 2800);

    const rect = chromiumWindowRef.current?.getBoundingClientRect();
    if (rect) {
      const relX = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
      const relY = Math.max(40, Math.min(rect.height - 20, e.clientY - rect.top));
      setAgentCursor(prev => ({
        ...prev,
        x: relX,
        y: relY,
        status: 'Controle exclusivo do agente'
      }));
    }
  };

  const toggleUserControl = () => {
    setUserControlMode((current) => {
      const next = !current;
      setShowObserverNotice(false);
      setLiveScreenshot(null);
      setIframeLoaded(false);
      setAgentCursor((cursor) => ({
        ...cursor,
        visible: !next,
        status: next ? 'Controle do usuário' : 'Agente no controle'
      }));
      return next;
    });
  };

  const proxySrc = `/api/browser/proxy?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-canvas-main text-text-content-primary select-none overflow-hidden font-sans">
      
      {/* 1. AGENT SUB-HEADER */}
      <div className="h-8 px-4 bg-bg-surface-panel border-b border-border-divider-subtle flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="text-text-content-secondary font-normal text-[11.5px] tracking-tight">
            {!isComputerActive ? 'Computador do Core Inativo' : 'Manus está usando o Navegador'}
          </span>
          <span className="text-border-divider-subtle text-xs">|</span>
          <span className="text-text-content-secondary/80 font-mono text-[11px] truncate tracking-tight">
            {!isComputerActive ? 'core://computador-inativo' : currentUrl}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isComputerActive && (
            <button
              type="button"
              onClick={handleTurnOffComputer}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono border border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20 transition-all cursor-pointer"
              title="Desligar o computador do Core e liberar ambiente"
            >
              <Power size={11} className="text-red-400" />
              <span>Desligar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setForceLiveIframe(prev => !prev)}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono transition-colors ${forceLiveIframe ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15' : 'border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'}`}
            title={forceLiveIframe ? 'Navegador ao vivo em tempo real ativo' : 'Alternar para navegador ao vivo'}
          >
            <Globe size={10} className={forceLiveIframe ? 'text-emerald-400 animate-pulse' : ''} />
            <span>{forceLiveIframe ? 'Transmissão Ao Vivo' : 'Captura de Tela'}</span>
          </button>
          <button
            type="button"
            onClick={toggleUserControl}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono transition-colors ${userControlMode ? 'border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15' : 'border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/15'}`}
            title={userControlMode ? 'Devolver o controle ao agente' : 'Assumir o controle do navegador'}
          >
            {userControlMode ? <LockOpen size={10} /> : <Hand size={10} />}
            <span>{userControlMode ? 'Retomar controle do agente' : 'Assumir controle'}</span>
          </button>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono ${userControlMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            <Lock size={10} className={userControlMode ? 'text-amber-300' : 'text-emerald-400'} />
            <span>{userControlMode ? 'Controle manual ativo' : 'Controle exclusivo do agente'}</span>
          </div>
        </div>
      </div>

      {/* 2. CHROMIUM BROWSER WINDOW (AUTHENTIC CLOUD COMPUTER INTERFACE) */}
      <div 
        ref={chromiumWindowRef}
        className="flex-1 flex flex-col bg-bg-canvas-main overflow-hidden relative"
      >
        {/* BROWSER TAB BAR */}
        <div className="h-9 bg-bg-canvas-main/80 flex items-center px-2 pt-1 gap-1 border-b border-border-divider-subtle/50 select-none shrink-0 relative z-10 overflow-x-auto custom-scrollbar">
          <div className="px-3 py-1.5 rounded-t-md text-[11px] flex items-center gap-2 max-w-[240px] border-t border-x bg-bg-surface-panel text-text-content-primary border-border-divider-subtle shadow-xs">
            {isComputerActive ? (
              <Favicon urlOrDomain={currentUrl} size={12} className="shrink-0" />
            ) : (
              <Power size={12} className="text-zinc-400 shrink-0" />
            )}
            <span className="truncate font-normal">
              {!isComputerActive ? 'Computador Inativo' : (pageTitle || 'Navegador')}
            </span>
          </div>

          <div className="ml-auto hidden sm:flex items-center gap-2 text-[10px] text-text-content-secondary font-mono pr-2">
            <span className={`size-1.5 rounded-full ${isComputerActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-text-content-secondary">{isComputerActive ? 'Agente Conectado' : 'Computador Desligado'}</span>
          </div>
        </div>

        {/* BROWSER NAVIGATION BAR */}
        <div className="h-9 bg-bg-surface-panel/90 border-b border-border-divider-subtle flex items-center px-3 gap-2 text-xs shrink-0 select-none relative z-10">
          <div className="flex items-center gap-1 text-text-content-secondary">
            <button 
              onClick={handleBack}
              disabled={!isComputerActive || historyIndex <= 0}
              className="p-1 rounded hover:bg-bg-action-hover hover:text-text-content-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors" 
              title="Voltar histórico"
            >
              <ArrowLeft size={13} strokeWidth={2} />
            </button>
            <button 
              onClick={handleForward}
              disabled={!isComputerActive || historyIndex >= navHistory.length - 1}
              className="p-1 rounded hover:bg-bg-action-hover hover:text-text-content-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors" 
              title="Avançar histórico"
            >
              <ArrowRight size={13} strokeWidth={2} />
            </button>
            <button 
              onClick={() => {
                if (!isComputerActive) return;
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 800);
              }}
              disabled={!isComputerActive}
              className="p-1 rounded hover:bg-bg-action-hover hover:text-text-content-primary disabled:opacity-30 transition-colors" 
              title="Recarregar página"
            >
              <ArrowClockwise size={12} strokeWidth={2} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
            </button>
          </div>

          {/* Clean Read-Only Address Pill */}
          <div className="flex-1 bg-bg-canvas-main/80 border border-border-divider-subtle/50 rounded-full h-6 px-2.5 flex items-center gap-1.5 text-xs">
            {isComputerActive ? (
              <>
                <Lock size={10} className="text-emerald-400 shrink-0" />
                <Favicon urlOrDomain={currentUrl} size={12} className="shrink-0" />
                <span className="text-text-content-primary/95 font-mono text-[11px] truncate tracking-tight select-text">
                  {currentUrl}
                </span>
              </>
            ) : (
              <>
                <Path size={12} className="text-zinc-400 shrink-0" />
                <span className="text-zinc-300 font-mono text-xs font-semibold tracking-wide select-text">
                  /
                </span>
              </>
            )}
          </div>

          {/* Agent profile indicator */}
          <div 
            className="size-5 rounded-full bg-[#1a73e8] border border-white/20 flex items-center justify-center text-white text-[9px] font-semibold select-none" 
            title="Sessão do Agente Manus"
          >
            M
          </div>
        </div>

        {/* BROWSER WEBPAGE VIEWPORT */}
        {!isComputerActive ? (
          /* INACTIVE COMPUTER SCREEN PER USER REQUEST */
          <div className="flex-1 bg-[#0b0c0f] flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
            <div className="max-w-md w-full flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Image requested by user with no background container */}
              <img 
                src="https://imgdb.io/i/KnGlMFk.png" 
                alt="O computador do Core está inativo" 
                className="w-56 sm:w-64 md:w-72 h-auto object-contain drop-shadow-md"
              />

              {/* Title text */}
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                O computador do Core está inativo
              </h3>

              {/* Subtext */}
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm">
                Envie uma instrução ao agente no chat para ligar o computador e iniciar as automações.
              </p>
            </div>
          </div>
        ) : (
          <div 
            onClick={userControlMode || isCaptchaOrChallenge || forceLiveIframe ? undefined : handleUserAttemptClick}
            className={`relative flex-1 bg-white overflow-hidden flex flex-col min-h-0 ${userControlMode || isCaptchaOrChallenge || forceLiveIframe ? 'cursor-default select-auto' : 'cursor-not-allowed select-none'}`}
          >
            {isLoading && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-30 animate-pulse" />
            )}

            {/* Floating CAPTCHA / Security Challenge Alert Banner */}
            {isCaptchaOrChallenge && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-amber-500/95 text-slate-950 font-medium text-xs px-4 py-2 rounded-xl shadow-2xl border border-amber-300 flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
                <ShieldWarning size={16} className="text-slate-950 shrink-0 animate-bounce" />
                <span><strong>CAPTCHA / Desafio de Segurança Detectado!</strong> O navegador ao vivo está liberado para interagir.</span>
                <button
                  type="button"
                  onClick={() => {
                    setUserControlMode(true);
                    setForceLiveIframe(true);
                  }}
                  className="bg-slate-950 text-amber-300 hover:bg-slate-900 px-3 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  Resolver no Navegador Ao Vivo ➔
                </button>
              </div>
            )}

            {/* Complete website rendered via proxy or dynamic runtime */}
            {isExternalWeb || !customCode ? (
              <div className="relative w-full h-full flex-1">
                {!shouldShowLiveIframe && liveScreenshot ? (
                  <div className="absolute inset-0 bg-[#f7f7f7] flex items-center justify-center overflow-hidden">
                    <img
                      src={liveScreenshot}
                      alt={`Captura ao vivo de ${pageTitle || currentUrl}`}
                      className="h-full w-full object-contain pointer-events-none"
                      onError={() => setLiveScreenshot(null)}
                    />
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-black/10 bg-white/85 px-2 py-1 text-[9px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Captura ao vivo do Chromium
                    </div>
                  </div>
                ) : (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={proxySrc}
                      title="Computador na Nuvem"
                      className={`w-full h-full border-0 absolute inset-0 bg-white ${userControlMode || isCaptchaOrChallenge || forceLiveIframe ? 'pointer-events-auto' : 'pointer-events-none'}`}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                      onLoad={() => {
                        setIframeLoaded(true);
                        setIsLoading(false);
                      }}
                    />
                    {!iframeLoaded && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f4f6f8] p-6">
                        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-center shadow-xl backdrop-blur-sm">
                          <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-slate-900 text-white overflow-hidden p-1.5">
                            <Favicon urlOrDomain={currentUrl} size={18} fallbackIcon={<Globe size={16} />} />
                          </div>
                          <p className="text-xs font-semibold text-slate-800">Navegador do agente conectado</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Preparando a captura visual de <span className="font-mono text-slate-600">{pageTitle || currentUrl}</span>.</p>
                          <div className="mx-auto mt-3 h-1 w-32 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-1/2 rounded-full bg-cyan-500 execution-sheen" /></div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
                <div className={`w-full h-full flex-1 relative overflow-auto bg-[#090907] text-[#f8f8f6] ${userControlMode ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <DynamicRuntimeRunner code={customCode} />
              </div>
            )}

            {/* Observer Mode / Exclusive Agent Notice (Appears if user clicks into screen) */}
            {showObserverNotice && !userControlMode && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-40 animate-in fade-in duration-200">
                <div className="bg-[#18181b] border border-cyan-500/30 rounded-xl p-4 max-w-sm w-full shadow-2xl text-center space-y-2.5 animate-in zoom-in-95">
                  <div className="size-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                    <Lock size={18} />
                  </div>
                  <div className="text-sm font-semibold text-white">Controle Exclusivo do Agente</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Apenas o <strong>Agente Manus</strong> opera este computador na nuvem. Envie instruções pelo chat para navegar ou interagir.
                  </p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowObserverNotice(false);
                    }}
                    className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

            {userControlMode && (
              <div className="absolute left-3 bottom-3 z-40 flex items-center gap-2 rounded-full border border-amber-400/30 bg-[#17130c]/90 px-3 py-1.5 text-[10px] text-amber-200 shadow-xl backdrop-blur-md">
                <Hand size={12} />
                <span>Você está no controle · clique e navegue normalmente</span>
              </div>
            )}
          </div>
        )}

        {/* AGENT MOUSE CURSOR: Positioned over the remote desktop */}
        {agentCursor.visible && isComputerActive && (
          <div 
            className="absolute pointer-events-none transition-all duration-300 ease-out z-50"
            style={{
              left: `${agentCursor.x}px`,
              top: `${agentCursor.y}px`
            }}
          >
            <div className="relative">
              <svg 
                className={`w-5 h-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-white fill-white stroke-black stroke-[1.4] transition-transform duration-150 ${agentCursor.isClicking ? 'scale-90 translate-y-0.5' : 'scale-100'}`} 
                viewBox="0 0 24 24"
              >
                <path d="M0,0 L0,18 L5,13.5 L9.5,22.5 L12,21.5 L7.5,12.5 L14,12.5 Z" />
              </svg>

              {agentCursor.isClicking && (
                <span className="absolute -top-3 -left-3 size-10 rounded-full border-2 border-cyan-400 bg-cyan-400/25 animate-ping pointer-events-none" />
              )}

              <div className="absolute left-4 top-2 flex flex-col gap-0.5 pointer-events-none">
                <div className="bg-[#111113]/90 backdrop-blur-md text-white text-[9.5px] font-mono px-2 py-0.5 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5 whitespace-nowrap animate-in fade-in">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-semibold">{agentCursor.label}</span>
                </div>
                {agentCursor.status && (
                  <div className="bg-black/85 backdrop-blur-xs text-cyan-300 text-[8.5px] px-2 py-0.5 rounded shadow border border-cyan-500/30 whitespace-nowrap">
                    {agentCursor.status}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Agent Keystroke HUD */}
        {typedKeys.length > 0 && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-cyan-500/40 rounded-xl px-4 py-2 shadow-2xl flex items-center gap-2 z-50 animate-in fade-in zoom-in-95">
            <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-wider">Teclas do Agente:</span>
            <div className="flex items-center gap-1">
              {typedKeys.map((key, i) => (
                <kbd key={i} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-cyan-300 text-xs font-mono font-bold shadow-xs animate-in zoom-in">
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        )}

        {/* Agent Typing Banner */}
        {activeTypingBanner && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#09090b]/95 text-cyan-300 text-xs px-4 py-1.5 rounded-full border border-cyan-500/40 shadow-2xl flex items-center gap-2 z-50 animate-in fade-in">
            <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Agente digitando: <strong>"{activeTypingBanner}"</strong></span>
          </div>
        )}

      </div>

      {/* 3. BOTTOM CONTROLS & TIMELINE SCRUBBER BAR */}
      <div className="px-4 py-2 bg-[#171717] border-t border-[#252525] shrink-0 select-none space-y-1.5">
        
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
                  className="h-full bg-[#0070f3] rounded-full transition-all duration-150"
                  style={{ width: `${scrubberValue}%` }}
                />
              </div>

              <div 
                className="absolute size-3 rounded-full bg-[#0070f3] ring-2 ring-white/20 shadow-md transition-all duration-150 pointer-events-none"
                style={{ left: `calc(${scrubberValue}% - 6px)` }}
              />

              <input 
                type="range"
                min="0"
                max="100"
                value={scrubberValue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setScrubberValue(val);
                  setIsLive(val >= 94);
                  if (val < 94 && navHistory.length > 1) {
                    const targetIdx = Math.round((val / 100) * (navHistory.length - 1));
                    const item = navHistory[targetIdx];
                    if (item) {
                      setCurrentUrl(item.url);
                      setPageTitle(item.title);
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
                }
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium shrink-0 cursor-pointer"
              title="Voltar ao vivo"
            >
              <span className={`size-1.5 rounded-full ${isLive ? 'bg-[#0070f3] animate-pulse' : 'bg-zinc-500'}`} />
              <span className={`text-[11px] ${isLive ? 'text-zinc-200 font-semibold' : 'text-zinc-500'}`}>Ao vivo</span>
            </div>
          </div>
        )}

        {/* Bottom Status Row */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div className="flex items-center gap-1.5 font-medium text-[11.5px]">
            {!isComputerActive ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="size-2 rounded-full bg-zinc-600" />
                <span>O computador do Core está inativo</span>
              </div>
            ) : isWorking ? (
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Spinner size={13} className="animate-spin" />
                <span>Agente executando ação no computador...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#22c55e]">
                <Check size={13} strokeWidth={2.5} />
                <span>Computador Ativo · Tarefa concluída{workingTime && workingTime !== '0s' ? ` · Trabalhou por ${workingTime}` : ''}</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
            VM Linux x86_64 | {isComputerActive ? 'Sessão Ativa' : 'Sessão Inativa'}
          </div>
        </div>

      </div>

    </div>
  );
}
