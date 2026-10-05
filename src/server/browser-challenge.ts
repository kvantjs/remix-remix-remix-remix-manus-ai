export type BrowserChallenge = {
  detected: true;
  provider: 'cloudflare' | 'captcha' | 'unknown';
  kind: 'challenge' | 'captcha';
  reason: string;
  url: string;
  title: string;
  detectedAt: string;
  requiresUserAction: true;
  policy: 'stop_and_request_handoff';
};

const cloudflareSignals = [
  'just a moment', 'checking your browser', 'checking if the site connection is secure',
  'cf-chl-', 'challenge-platform', 'cloudflare ray id', 'attention required', 'verify you are human'
];
const captchaSignals = [
  'g-recaptcha', 'hcaptcha', 'h-captcha', 'cf-turnstile', 'turnstile', 'captcha',
  "i'm not a robot", 'im not a robot', 'prove you are human'
];

export function detectBrowserChallenge(input: { url: string; title?: string; bodyText?: string; html?: string }): BrowserChallenge | null {
  const title = String(input.title || '');
  const bodyText = String(input.bodyText || '');
  const html = String(input.html || '');
  const haystack = `${input.url} ${title} ${bodyText} ${html}`.toLocaleLowerCase();
  const cloudflare = cloudflareSignals.find((signal) => haystack.includes(signal));
  const captcha = captchaSignals.find((signal) => haystack.includes(signal));
  if (!cloudflare && !captcha) return null;
  const isCloudflare = Boolean(cloudflare && !captcha);
  return {
    detected: true,
    provider: isCloudflare ? 'cloudflare' : 'captcha',
    kind: isCloudflare ? 'challenge' : 'captcha',
    reason: isCloudflare ? `Desafio Cloudflare detectado por "${cloudflare}".` : `CAPTCHA/Turnstile detectado por "${captcha}".`,
    url: input.url,
    title,
    detectedAt: new Date().toISOString(),
    requiresUserAction: true,
    policy: 'stop_and_request_handoff'
  };
}

export function challengeMessage(challenge: BrowserChallenge) {
  return `Automação interrompida: ${challenge.reason} Acesse o navegador ao vivo, conclua o desafio manualmente se tiver autorização e depois solicite uma nova inspeção. Não tentarei contornar o mecanismo.`;
}
