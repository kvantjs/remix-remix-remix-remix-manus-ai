export const toastManager = {
  add: (item: { type?: string; title?: string; description?: string }) => {
    console.info(`[Toast] ${item.title}: ${item.description}`);
  }
};
