import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import * as Babel from '@babel/standalone';
import * as PhosphorIcons from '@phosphor-icons/react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DynamicRuntimeRunner] Render error in DynamicApp:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      return (
        <div className="p-6 bg-red-950/30 border border-red-500/30 rounded-xl text-red-200 text-xs font-mono space-y-3 m-4">
          <div className="font-bold text-red-400 flex items-center gap-2">
            <span>⚠️ Erro de Renderização no Runtime (DynamicApp.tsx):</span>
          </div>
          <p className="text-white/80 whitespace-pre-wrap">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fallback universal icon for any unknown or typo icon name
const FallbackIcon = ({ size = 18, className = '', ...props }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// Proxy for Phosphor & Lucide icons: prevents undefined icon crashes
const SafePhosphorIcons = new Proxy(PhosphorIcons, {
  get(target: any, prop: string) {
    if (typeof prop !== 'string') return target[prop];
    if (prop in target && target[prop] !== undefined) return target[prop];
    if (prop === 'TrendingUp' || prop === 'TrendUp') return target.TrendUp || FallbackIcon;
    if (prop === 'TrendingDown' || prop === 'TrendDown') return target.TrendDown || FallbackIcon;
    const lower = prop.toLowerCase();
    for (const k of Object.keys(target)) {
      if (k.toLowerCase() === lower && target[k]) return target[k];
    }
    return FallbackIcon;
  }
});

// Mock Framer Motion compatibility
const createMotionComponent = (tag: string) => {
  return React.forwardRef<any, any>(
    ({ initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, layout, ...props }, ref) => {
      return React.createElement(tag, { ...props, ref });
    }
  );
};

const motionElements = [
  'div', 'button', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'section', 'article', 'nav', 'header', 'footer',
  'main', 'form', 'input', 'textarea', 'img', 'svg', 'a', 'label'
];

const motionObj: Record<string, any> = {};
for (const tag of motionElements) {
  motionObj[tag] = createMotionComponent(tag);
}

const SafeMotion = new Proxy(motionObj, {
  get(target, prop: string) {
    if (prop in target) return target[prop];
    return createMotionComponent(prop);
  }
});

const AnimatePresence = ({ children }: { children?: ReactNode }) => <>{children}</>;

// Safely instantiate new Function by filtering out keys that are not valid JS identifier names
function createSafeFunction(scope: Record<string, any>, body: string) {
  const keys: string[] = [];
  const values: any[] = [];
  for (const [key, val] of Object.entries(scope)) {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      keys.push(key);
      values.push(val);
    }
  }
  return {
    fn: new Function(...keys, body),
    values
  };
}

// Safe hook factory that prevents fatal crashes when hooks are evaluated outside of component rendering
const safeHook = <T extends (...args: any[]) => any>(hookName: string, fallback: T): T => {
  return ((...args: any[]) => {
    try {
      const realHook = (React as any)[hookName];
      if (typeof realHook === 'function') {
        return realHook(...args);
      }
    } catch {
      // Hook was invoked outside of a React component render pass
      return fallback(...args);
    }
    return fallback(...args);
  }) as T;
};

const safeUseState = safeHook('useState', (init: any) => {
  const val = typeof init === 'function' ? init() : init;
  return [val, () => {}];
});

const safeUseEffect = safeHook('useEffect', () => {});
const safeUseLayoutEffect = safeHook('useLayoutEffect', () => {});
const safeUseMemo = safeHook('useMemo', (fn: any) => (typeof fn === 'function' ? fn() : fn));
const safeUseCallback = safeHook('useCallback', (fn: any) => fn);
const safeUseRef = safeHook('useRef', (init: any) => ({ current: init }));
const safeUseContext = safeHook('useContext', () => ({}));
const safeUseReducer = safeHook('useReducer', (_reducer: any, init: any) => [init, () => {}]);
const safeUseId = safeHook('useId', () => 'dynamic-id-' + Math.random().toString(36).slice(2, 7));

const SafeReact = new Proxy(React, {
  get(target: any, prop: string) {
    if (prop === 'useState') return safeUseState;
    if (prop === 'useEffect') return safeUseEffect;
    if (prop === 'useLayoutEffect') return safeUseLayoutEffect;
    if (prop === 'useMemo') return safeUseMemo;
    if (prop === 'useCallback') return safeUseCallback;
    if (prop === 'useRef') return safeUseRef;
    if (prop === 'useContext') return safeUseContext;
    if (prop === 'useReducer') return safeUseReducer;
    if (prop === 'useId') return safeUseId;
    return target[prop];
  }
});

// Helper to sanitize code before passing to Babel
function sanitizeSourceCode(rawCode: string): { code: string; mainComponentName: string } {
  if (!rawCode) return { code: '', mainComponentName: 'App' };
  let code = rawCode.trim();

  // 1. Strip outer markdown fences if present
  if (code.startsWith('```')) {
    code = code.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '');
    code = code.replace(/\n?```\s*$/, '');
  }

  // If code contains inner markdown fences, extract the best code block
  const codeBlockMatch = code.match(/```(?:tsx|typescript|jsx|javascript)?([\s\S]*?)```/);
  if (codeBlockMatch) {
    code = codeBlockMatch[1].trim();
  }

  // 2. Remove all import statements (single-line or multi-line)
  code = code.replace(/import\s+type\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  code = code.replace(/import\s+['"][^'"]+\.(?:css|scss|less|sass)['"];?/g, '');
  code = code.replace(/import\s+['"][^'"]+\.(?:png|jpg|jpeg|svg|webp|gif|ico)['"];?/g, '');
  code = code.replace(/import\s+(?:(?:\*\s+as\s+[\w$]+)|(?:\{[\s\S]*?\})|(?:[\w$,\s{}*]+))\s+from\s+['"][^'"]+['"];?/g, '');
  code = code.replace(/import\s+['"][^'"]+['"];?/g, '');

  // 3. Detect main component name
  let mainComponentName = 'App';
  const exportDefFn = code.match(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/);
  if (exportDefFn) {
    mainComponentName = exportDefFn[1];
  } else {
    const exportDefId = code.match(/export\s+default\s+([A-Za-z0-9_$]+)\s*;?/);
    if (exportDefId && exportDefId[1] !== 'function' && exportDefId[1] !== 'class') {
      mainComponentName = exportDefId[1];
    }
  }

  // 4. Transform exports cleanly
  code = code
    // export default function App(...) -> function App(...)
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/g, 'function $1')
    // export default function(...) -> function __DefaultDynamicApp__(...)
    .replace(/export\s+default\s+function\s*\(/g, 'function __DefaultDynamicApp__(')
    // export default class App -> class App
    .replace(/export\s+default\s+class\s+([A-Za-z0-9_$]+)/g, 'class $1')
    // export default (...) => -> const __DefaultDynamicApp__ = (...) =>
    .replace(/export\s+default\s+((?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>)/g, 'const __DefaultDynamicApp__ = $1')
    // export default Identifier; -> remove statement
    .replace(/export\s+default\s+[A-Za-z0-9_$]+\s*;?/g, '')
    // remove named export keywords: export const Foo -> const Foo, export function Bar -> function Bar
    .replace(/export\s+(const|let|var|function|class|type|interface|enum)\s+/g, '$1 ')
    // remove export { ... };
    .replace(/export\s*\{[\s\S]*?\};?/g, '');

  return { code, mainComponentName };
}

interface DynamicRuntimeRunnerProps {
  code: string;
  customFiles?: Record<string, string>;
}

export function DynamicRuntimeRunner({ code, customFiles = {} }: DynamicRuntimeRunnerProps) {
  const [ComponentToRender, setComponentToRender] = useState<React.ComponentType<any> | null>(null);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    if (!code || !code.trim()) {
      setComponentToRender(null);
      setCompilationError(null);
      return;
    }

    setIsCompiling(true);
    setCompilationError(null);

    try {
      // 1. Compile subcomponents from customFiles if any
      const subComponents: Record<string, any> = {};

      // 1a. Process and inject custom CSS files dynamically into document head
      let aggregatedCss = '';
      for (const [filePath, fileContent] of Object.entries(customFiles)) {
        if (filePath.endsWith('.css') && fileContent && typeof fileContent === 'string') {
          aggregatedCss += `\n/* --- STYLE MODULE: ${filePath} --- */\n${fileContent}\n`;
        }
      }

      if (typeof document !== 'undefined') {
        let styleElement = document.getElementById('dynamic-runtime-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.setAttribute('id', 'dynamic-runtime-css');
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = aggregatedCss;
      }

      // 1b. Parse and expose JSON, MD, TXT files into the subcomponents dictionary for imports
      for (const [filePath, fileContent] of Object.entries(customFiles)) {
        if (!fileContent || typeof fileContent !== 'string' || !fileContent.trim()) continue;
        
        if (filePath.endsWith('.json')) {
          try {
            const parsedJson = JSON.parse(fileContent);
            const fileNameBase = filePath.split('/').pop()?.replace(/\.json$/, '');
            if (fileNameBase) {
              subComponents[fileNameBase] = parsedJson;
            }
            subComponents[filePath] = parsedJson;
          } catch (jsonErr) {
            console.warn(`[DynamicRuntimeRunner] Fail to parse JSON file (${filePath}):`, jsonErr);
          }
        } else if (filePath.endsWith('.md') || filePath.endsWith('.txt')) {
          const fileNameBase = filePath.split('/').pop()?.replace(/\.(md|txt)$/, '');
          if (fileNameBase) {
            subComponents[fileNameBase] = fileContent;
          }
          subComponents[filePath] = fileContent;
        }
      }

      for (const [filePath, fileContent] of Object.entries(customFiles)) {
        if (!fileContent || typeof fileContent !== 'string' || !fileContent.trim()) continue;
        if (filePath.endsWith('.css') || filePath.endsWith('.json') || filePath.endsWith('.md') || filePath.endsWith('.txt')) continue;
        if (filePath.includes('App.tsx') && (code.includes('export default') || code.length > 50)) continue;

        try {
          const { code: subProcessed, mainComponentName: subName } = sanitizeSourceCode(fileContent);
          const subCompiled = Babel.transform(subProcessed, {
            presets: [
              ['react', { runtime: 'classic' }],
              ['typescript', { isTSX: true, allExtensions: true }]
            ],
            filename: filePath,
            parserOpts: { allowReturnOutsideFunction: true }
          }).code;

          if (subCompiled) {
            const subScope: Record<string, any> = {
              React: SafeReact,
              useState: safeUseState,
              useEffect: safeUseEffect,
              useContext: safeUseContext,
              useReducer: safeUseReducer,
              useCallback: safeUseCallback,
              useMemo: safeUseMemo,
              useRef: safeUseRef,
              useId: safeUseId,
              useLayoutEffect: safeUseLayoutEffect,
              Fragment: React.Fragment,
              createElement: React.createElement,
              cloneElement: React.cloneElement,
              Children: React.Children,
              memo: React.memo,
              forwardRef: React.forwardRef,
              ...SafePhosphorIcons,
              Lucide: SafePhosphorIcons,
              icons: SafePhosphorIcons,
              PhosphorIcons,
              ...PhosphorIcons,
              TrendingUp: PhosphorIcons.TrendUp || FallbackIcon,
              TrendingDown: PhosphorIcons.TrendDown || FallbackIcon,
              TrendUp: PhosphorIcons.TrendUp || FallbackIcon,
              TrendDown: PhosphorIcons.TrendDown || FallbackIcon,
              motion: SafeMotion,
              AnimatePresence,
              clsx: (...args: any[]) => args.filter(Boolean).join(' '),
              cn: (...args: any[]) => args.filter(Boolean).join(' ')
            };

            const subResolver = `\nreturn (typeof ${subName} !== 'undefined' ? ${subName} : typeof __DefaultDynamicApp__ !== 'undefined' ? __DefaultDynamicApp__ : null);`;
            const { fn: subEvaluator, values: subValues } = createSafeFunction(subScope, subCompiled + subResolver);
            const SubComp = subEvaluator(...subValues);
            if (SubComp) {
              subComponents[subName] = SubComp;
              const fileNameBase = filePath.split('/').pop()?.replace(/\.(tsx|jsx|ts|js)$/, '');
              if (fileNameBase) {
                subComponents[fileNameBase] = SubComp;
              }
            }
          }
        } catch (subErr) {
          console.warn(`[DynamicRuntimeRunner] Non-critical subcomponent compile notice (${filePath}):`, subErr);
        }
      }

      // 2. Sanitize main code and detect component name
      const { code: processed, mainComponentName } = sanitizeSourceCode(code);

      // 3. Compile main component with Babel TypeScript + JSX
      let compiled: string | null | undefined = null;
      
      try {
        compiled = Babel.transform(processed, {
          presets: [
            ['react', { runtime: 'classic' }],
            ['typescript', { isTSX: true, allExtensions: true }]
          ],
          filename: 'DynamicApp.tsx',
          parserOpts: { allowReturnOutsideFunction: true }
        }).code;
      } catch (babelErr: any) {
        // Fallback pass: strip complex TypeScript types if any syntax error
        const relaxedCode = processed
          .replace(/interface\s+[A-Za-z0-9_$]+\s*\{[\s\S]*?\}/g, '')
          .replace(/type\s+[A-Za-z0-9_$]+\s*=[\s\S]*?;/g, '');
        
        compiled = Babel.transform(relaxedCode, {
          presets: [
            ['react', { runtime: 'classic' }],
            ['typescript', { isTSX: true, allExtensions: true }]
          ],
          filename: 'DynamicApp.tsx',
          parserOpts: { allowReturnOutsideFunction: true }
        }).code;
      }

      if (!compiled) {
        throw new Error('Falha ao compilar o código do DynamicApp.tsx');
      }

      // Ensure hooks are available on window/globalThis for any loose execution
      if (typeof window !== 'undefined') {
        (window as any).React = SafeReact;
        (window as any).useEffect = safeUseEffect;
        (window as any).useState = safeUseState;
        (window as any).useRef = safeUseRef;
        (window as any).useMemo = safeUseMemo;
        (window as any).useCallback = safeUseCallback;
        (window as any).useContext = safeUseContext;
        (window as any).useReducer = safeUseReducer;
        (window as any).useId = safeUseId;
        (window as any).useLayoutEffect = safeUseLayoutEffect;
      }

      // 4. Assemble execution scope with all subcomponents and helpers
      const scope: Record<string, any> = {
        React: SafeReact,
        useState: safeUseState,
        useEffect: safeUseEffect,
        useContext: safeUseContext,
        useReducer: safeUseReducer,
        useCallback: safeUseCallback,
        useMemo: safeUseMemo,
        useRef: safeUseRef,
        useId: safeUseId,
        useLayoutEffect: safeUseLayoutEffect,
        Fragment: React.Fragment,
        createElement: React.createElement,
        cloneElement: React.cloneElement,
        Children: React.Children,
        memo: React.memo,
        forwardRef: React.forwardRef,
        // Lucide Icons (Safe with Fallback)
        ...SafePhosphorIcons,
        Lucide: SafePhosphorIcons,
        icons: SafePhosphorIcons,
        // Phosphor Icons
        PhosphorIcons,
        ...PhosphorIcons,
        TrendingUp: PhosphorIcons.TrendUp || FallbackIcon,
        TrendingDown: PhosphorIcons.TrendDown || FallbackIcon,
        TrendUp: PhosphorIcons.TrendUp || FallbackIcon,
        TrendDown: PhosphorIcons.TrendDown || FallbackIcon,
        // Framer Motion / Motion Compatibility
        motion: SafeMotion,
        AnimatePresence,
        // Common utility helpers
        clsx: (...args: any[]) => args.filter(Boolean).join(' '),
        cn: (...args: any[]) => args.filter(Boolean).join(' '),
        confetti: () => console.log('🎉 Confetti action executed'),
        // Multi-file subcomponents
        ...subComponents
      };

      // 5. Construct execution wrapper with robust component resolver
      const returnResolver = `
\nreturn (
  (typeof __DefaultDynamicApp__ !== 'undefined' && __DefaultDynamicApp__) ||
  (typeof ${mainComponentName} !== 'undefined' && ${mainComponentName}) ||
  (typeof App !== 'undefined' && App) ||
  (typeof Main !== 'undefined' && Main) ||
  (typeof Dashboard !== 'undefined' && Dashboard) ||
  (typeof Store !== 'undefined' && Store) ||
  (typeof Shop !== 'undefined' && Shop) ||
  (typeof Application !== 'undefined' && Application) ||
  (typeof Home !== 'undefined' && Home) ||
  (typeof Page !== 'undefined' && Page) ||
  (typeof Root !== 'undefined' && Root) ||
  null
);
`;

      const { fn: evaluator, values: scopeValues } = createSafeFunction(scope, compiled + returnResolver);
      const ComponentResult = evaluator(...scopeValues);

      if (!ComponentResult || (typeof ComponentResult !== 'function' && typeof ComponentResult !== 'object')) {
        throw new Error('Nenhum componente React válido encontrado (certifique-se de usar "export default function App()").');
      }

      setComponentToRender(() => ComponentResult);
      setCompilationError(null);
    } catch (err: any) {
      console.error('[DynamicRuntimeRunner] Compilation error in DynamicApp.tsx:', err);
      setCompilationError(err.message || String(err));
    } finally {
      setIsCompiling(false);
    }
  }, [code, customFiles]);

  if (compilationError) {
    return (
      <div className="p-6 bg-red-950/25 border border-red-500/30 rounded-xl text-red-200 text-xs font-mono space-y-3 m-4 shadow-xl">
        <div className="font-bold text-red-400 flex items-center gap-2">
          <PhosphorIcons.Warning size={16} className="text-red-400 shrink-0" />
          <span>Erro no DynamicApp.tsx</span>
        </div>
        <p className="text-white/80 whitespace-pre-wrap bg-black/40 p-3 rounded-lg border border-white/5">{compilationError}</p>
        <p className="text-white/50 text-[11px] font-sans">
          O preview foi mantido seguro. Envie uma instrução no chat para o agente gerar um novo componente.
        </p>
      </div>
    );
  }

  if (isCompiling) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-white/40 text-xs gap-2.5">
        <div className="size-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Compilando DynamicApp.tsx no Runtime...</span>
      </div>
    );
  }

  if (!ComponentToRender) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40">
          <PhosphorIcons.Sparkle size={24} className="text-blue-400 animate-pulse" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-sm font-semibold text-white">Preview de Runtime Pronto</h2>
          <p className="text-xs text-white/40 leading-relaxed">
            Envie qualquer prompt para o agente (ex: <em>"Crie uma loja de roupas esportivas com carrinho"</em>). O código gerado será compilado e renderizado ao vivo aqui.
          </p>
        </div>
      </div>
    );
  }

  const RenderedComponent = ComponentToRender;

  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="p-6 bg-red-950/30 border border-red-500/30 rounded-xl text-red-200 text-xs font-mono space-y-2 m-4">
          <div className="font-bold text-red-400 flex items-center gap-2">
            <PhosphorIcons.Warning size={15} className="text-red-400 shrink-0" />
            <span>Erro em tempo de execução no DynamicApp.tsx:</span>
          </div>
          <p className="text-white/80">{error.message}</p>
        </div>
      )}
    >
      <div className="w-full h-full min-h-full flex flex-col bg-transparent overflow-auto">
        <RenderedComponent />
      </div>
    </ErrorBoundary>
  );
}
