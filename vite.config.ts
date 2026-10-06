import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// AI Studio can resolve dependencies from the preview workspace and from the
// project workspace at the same time. Absolute aliases make React's identity
// unambiguous, which is required for hooks to share the renderer dispatcher.
const reactPackage = path.resolve(process.cwd(), 'node_modules/react');
const reactDomPackage = path.resolve(process.cwd(), 'node_modules/react-dom');

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
        react: reactPackage,
        'react/jsx-runtime': path.join(reactPackage, 'jsx-runtime.js'),
        'react/jsx-dev-runtime': path.join(reactPackage, 'jsx-dev-runtime.js'),
        'react-dom': reactDomPackage,
        'react-dom/client': path.join(reactDomPackage, 'client.js'),
      },
      dedupe: ['react', 'react-dom', '@base-ui/react', 'react/jsx-runtime'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@base-ui/react'],
    },
    server: {
      // AI Studio and the local Preview proxy use a generated host name.
      // Vite must accept that host instead of returning its startup guard page.
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
