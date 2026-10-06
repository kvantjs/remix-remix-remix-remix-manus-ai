export const logger = {
  warn: (...args: any[]) => console.warn('[Orb]', ...args),
  error: (...args: any[]) => console.error('[Orb]', ...args),
  info: (...args: any[]) => console.info('[Orb]', ...args),
  log: (...args: any[]) => console.log('[Orb]', ...args),
};
