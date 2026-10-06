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
  XCircle
} from '@phosphor-icons/react';
import { ToolCallTrace } from '../types/project';
import { DynamicRuntimeRunner } from './DynamicRuntimeRunner';
import { Favicon, extractCleanDomain } from '@/lib/favicon';
import { OrbBloop } from '@/components/orb/bloop/index';
import { BloopState } from '@/components/orb/bloop/types';
import { BLOOP_PALETTES, BloopPaletteName } from '@/components/orb/bloop/palettes';

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

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('api.')) {
      // Hard block on api subdomains in the UI to match server policy
      return 'https://news.ycombinator.com?blocked_api_access';
    }
  } catch {}
  return url;
}

// Intelligent Web URL Parser - accurately extracts destination URLs requested by user
export function resolveWebUrl(raw: string): string {
  let clean = (raw || '').trim();
  if (!clean) return sanitizeUrl('https://news.ycombinator.com');

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
    return sanitizeUrl('https://news.ycombinator.com');
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
    return sanitizeUrl('https://news.ycombinator.com');
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

  // 8. Default to news portal
  return sanitizeUrl('https://news.ycombinator.com');
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
  customFiles,
  agentIntent,
  browserStatus: externalBrowserStatus
}: KvantComputerProps) {
  const [currentUrl, setCurrentUrl] = useState<string>('https://news.ycombinator.com');

  // Trigger computer activation when research or computer intent is detected
  useEffect(() => {
    if (agentIntent && (agentIntent.mode === 'web_research' || agentIntent.mode === 'cloud_computer') && !isComputerActive) {
      handleTurnOnComputer();
    }
  }, [agentIntent]);

  const [pageTitle, setPageTitle] = useState<string>('Hacker News');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExternalWeb, setIsExternalWeb] = useState<boolean>(true);
  const [liveScreenshot, setLiveScreenshot] = useState<string | null>(null);
  const [browserStatus, setBrowserStatus] = useState<'loading' | 'interactive' | 'error' | 'blocked'>('interactive');
  
  // Update browserStatus from props if provided
  useEffect(() => {
    if (externalBrowserStatus) {
      setBrowserStatus(externalBrowserStatus);
    }
  }, [externalBrowserStatus]);
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

  const [userControlMode, setUserControlMode] = useState<boolean>(false);
  const [forceLiveIframe, setForceLiveIframe] = useState<boolean>(false);
  const [forceIdle, setForceIdle] = useState<boolean>(false);
  const prevIsWorkingRef = useRef(isWorking);

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

  // Define if the computer is currently in an idle/finished state
  const isIdle = isComputerActive && (forceIdle || (!isWorking && !isLoading && !userControlMode && !liveScreenshot && !customCode));

  // Reset forceIdle when active work or interaction begins
  useEffect(() => {
    if (isWorking || isLoading || userControlMode) {
      setForceIdle(false);
    }
  }, [isWorking, isLoading, userControlMode]);

  // Automatically "close" the browser and clear content when the agent finishes its work
  useEffect(() => {
    if (prevIsWorkingRef.current && !isWorking) {
      // Small delay to let the user see the final result before closing
      const timer = setTimeout(() => {
        setLiveScreenshot(null);
        setIframeLoaded(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevIsWorkingRef.current = isWorking;
  }, [isWorking]);

  // Inactivity fallback: If no interaction or state change happens for 30s, 
  // automatically close the browser and show the Idle screen.
  useEffect(() => {
    // Only track inactivity if the computer is active and NOT already idle
    if (!isComputerActive || isIdle) return;

    // Reset timer on any significant state change (monitored via dependencies)
    const inactivityTimer = setTimeout(() => {
      // Small safety check: don't close if user is manually controlling or it's a security challenge
      if (userControlMode || isCaptchaOrChallenge) return;

      setForceIdle(true);
      setLiveScreenshot(null);
      setIframeLoaded(false);
      setForceLiveIframe(false);
    }, 30000); // 30 seconds

    return () => clearTimeout(inactivityTimer);
  }, [
    isWorking, 
    isLoading, 
    userControlMode, 
    isCaptchaOrChallenge,
    agentCursor.x, 
    agentCursor.y, 
    agentCursor.status,
    toolCalls?.length, 
    liveScreenshot, 
    customCode, 
    isComputerActive,
    currentUrl,
    isIdle
  ]);

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
    if (userControlMode) return targetVal;
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
        setBrowserStatus('interactive');
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
        // Also send message to iframe if it's there
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

  const toggleUserControl = () => {
    setUserControlMode((current) => {
      const next = !current;
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
            {!isComputerActive ? 'Computador do Kvant Inativo' : (isLoading ? 'Manus está interagindo...' : 'Manus está usando o Navegador')}
          </span>
          <span className="text-border-divider-subtle text-xs">|</span>
          <span className="text-text-content-secondary/80 font-mono text-[11px] truncate tracking-tight">
            {!isComputerActive ? 'manus://computador-inativo' : currentUrl}
          </span>
        </div>

        {isComputerActive && (
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-colors ${
                browserStatus === 'loading' || isLoading ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' :
                browserStatus === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                browserStatus === 'blocked' ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' :
                'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
            }`}>
              <div className={`size-1.5 rounded-full ${
                browserStatus === 'loading' || isLoading ? 'bg-amber-400 animate-pulse' :
                browserStatus === 'error' ? 'bg-red-500' :
                browserStatus === 'blocked' ? 'bg-orange-500' :
                'bg-emerald-500'
              }`} />
              <span className="text-[9px] font-mono uppercase tracking-wider font-bold">
                {browserStatus === 'loading' || isLoading ? 'Navegando' : 
                 browserStatus === 'error' ? 'Erro' : 
                 browserStatus === 'blocked' ? 'Bloqueado' : 
                 'Interativo'}
              </span>
            </div>

            <button
              onClick={() => setForceLiveIframe(!forceLiveIframe)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                forceLiveIframe 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                : 'bg-white/5 border-white/10 text-text-content-secondary hover:bg-white/10'
              }`}
            >
              <Globe size={12} />
              <span className="text-[10px] font-medium">{forceLiveIframe ? 'Live Browser' : 'Agent View'}</span>
            </button>
          </div>
        )}
      </div>

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
        ) : isIdle ? (
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
                  <div className="absolute inset-0 bg-[#f7f7f7] flex items-center justify-center overflow-hidden group/screenshot">
                    <img
                      src={liveScreenshot}
                      alt={`Captura ao vivo de ${pageTitle || currentUrl}`}
                      className={`h-full w-full object-contain pointer-events-none transition-all duration-700 group-hover/screenshot:scale-[1.01] ${isLoading && agentCursor.status?.includes('Rolando') ? '-translate-y-8 opacity-90 blur-[0.5px]' : ''}`}
                      onError={() => setLiveScreenshot(null)}
                    />
                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-2.5 py-1.5 text-[10px] font-bold text-slate-800 shadow-xl backdrop-blur-md animate-in fade-in duration-300">
                      <div className="relative flex size-2 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                      </div>
                      Navegação Real do Agente
                    </div>

                    {isLoading && (
                      <div className="absolute inset-0 z-10 bg-[#1a1a1a] backdrop-blur-[1.5px] flex flex-col items-center justify-center animate-in fade-in duration-300">
                        <div className="bg-[#202020] border border-[#404040] rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 scale-110">
                          <div className="size-6 flex items-center justify-center bg-[#404040] rounded-lg">
                            <OrbBloop
                              size={24}
                              audioMode="ambient"
                              demoMode={true}
                              state={BloopState.think}
                              bloopColorMain={BLOOP_PALETTES[BloopPaletteName.blue].main}
                              bloopColorLow={BLOOP_PALETTES[BloopPaletteName.blue].low}
                              bloopColorMid={BLOOP_PALETTES[BloopPaletteName.blue].mid}
                              bloopColorHigh={BLOOP_PALETTES[BloopPaletteName.blue].high}
                            />
                          </div>
                          <div className="flex flex-col bg-[#404040] p-2 rounded-xl">
                            <div className="bg-[#50a2ff] px-2 py-0.5 rounded-md mb-1">
                              <p className="text-xs font-bold text-[#ffffff] tracking-wide uppercase">{agentCursor.status || 'Interagindo com a página...'}</p>
                            </div>
                            <p className="text-[10px] text-[#cecece] font-mono"><span className="text-[#828282] mr-1">›</span>Agente Manus em controle remoto</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {browserStatus === 'loading' && !isLoading && (
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
                          <button 
                            onClick={() => {
                              setBrowserStatus('loading');
                              runAgentLiveActionAnimation('navigate', currentUrl);
                            }}
                            className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                          >
                            Tentar Novamente
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-black/5 bg-black/5 px-2 py-1 text-[9px] font-medium text-slate-500">
                      Modo Observador
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
                  </>
                )}
              </div>
            ) : (
                <div className={`w-full h-full flex-1 relative overflow-auto bg-[#1a1a1a] text-[#f8f8f6] ${userControlMode ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <DynamicRuntimeRunner code={customCode} />
              </div>
            )}

            {/* Removed "Você está no controle" banner per simplicity request */}
          </div>
        )}

        {/* AGENT MOUSE CURSOR: Positioned over the remote desktop */}
        {agentCursor.visible && isComputerActive && !isLoading && !isIdle && (isWorking || userControlMode || liveScreenshot || customCode) && (
          <span 
            className="absolute pointer-events-none transition-all duration-300 ease-out z-50 bg-transparent !bg-transparent border-none !border-none shadow-none !shadow-none"
            style={{
              left: `${agentCursor.x}px`,
              top: `${agentCursor.y}px`,
              backgroundColor: 'transparent'
            }}
          >
            <span className="relative flex items-center bg-transparent !bg-transparent" style={{ backgroundColor: 'transparent' }}>
              {agentCursor.isClicking && (
                <span className="absolute inset-0 size-10 -left-2 -top-2 rounded-full bg-blue-500/20 animate-ping" />
              )}
              <img 
                src="https://imgdb.io/i/QpsKRP4.png" 
                alt="Agent Cursor"
                className={`size-6 object-contain transition-transform duration-200 bg-transparent !bg-transparent ${agentCursor.isClicking ? 'scale-75 brightness-110' : 'scale-100'}`}
                style={{ backgroundColor: 'transparent' }}
              />
            </span>
          </span>
        )}

        {/* Agent Keystroke HUD removed per user request */}

        {/* Agent Typing Banner removed per user request */}

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
                  className="h-full bg-blue-500 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ width: `${scrubberValue}%` }}
                />
              </div>

              <div 
                className="absolute size-3 rounded-full bg-blue-500 ring-2 ring-blue-400/40 shadow-md shadow-blue-500/30 transition-all duration-150 pointer-events-none group-hover:scale-110"
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
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium shrink-0 cursor-pointer transition-colors"
              title="Voltar ao vivo"
            >
              <span className={`size-1.5 rounded-full ${isLive ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-blue-500/40'}`} />
              <span className={`text-[11px] ${isLive ? 'text-blue-400 font-semibold drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]' : 'text-blue-400/60'}`}>Ao vivo</span>
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
              <div className="flex items-center gap-1.5 text-zinc-400">
                <div className="size-4 flex items-center justify-center">
                  <OrbBloop
                    size={16}
                    audioMode="ambient"
                    demoMode={true}
                    state={BloopState.listen}
                    bloopColorMain={BLOOP_PALETTES[BloopPaletteName.blue].main}
                    bloopColorLow={BLOOP_PALETTES[BloopPaletteName.blue].low}
                    bloopColorMid={BLOOP_PALETTES[BloopPaletteName.blue].mid}
                    bloopColorHigh={BLOOP_PALETTES[BloopPaletteName.blue].high}
                  />
                </div>
                <span>Agente executando ação no computador...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-300">
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
