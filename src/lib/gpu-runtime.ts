export interface GpuGate {
  state: { paused: boolean; lowPower: boolean };
  frameMs?: number;
  dispose: () => void;
}

export function attachGpuGate(element: HTMLElement): GpuGate {
  let paused = false;
  const onVisibilityChange = () => {
    paused = document.hidden;
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  return {
    state: { paused: false, lowPower: false },
    frameMs: 0,
    dispose: () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    }
  };
}

export function deferUntilVisible(element: HTMLElement, cb: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    cb();
    return () => {};
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      observer.disconnect();
      cb();
    }
  });
  observer.observe(element);
  return () => observer.disconnect();
}
