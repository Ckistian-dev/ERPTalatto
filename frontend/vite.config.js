import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // 🎯 Use a URL gerada pela Cloudflare aqui (se estiver usando origin)
    // origin: 'http://localhost:5173',
    allowedHosts: [
      'localhost:5173' // Se a cloudflare gerar um domínio específico, adicione-o aqui também
    ],
    hmr: {
      // Definir apenas a clientPort resolve o conflito de portas no túnel HTTPS
      clientPort: 443
    }
  },
  resolve: {
    alias: {
      'imask': path.resolve(__dirname, 'node_modules/imask/dist/imask.js'),
      'react-imask': path.resolve(__dirname, 'node_modules/react-imask/dist/react-imask.js')
    }
  },
  optimizeDeps: {
    include: [
      'react-grid-layout'
    ]
  }
});