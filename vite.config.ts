import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ═══════════════════════════════════════════════════════════════════════════
//  vite.config.ts — configuração do build/dev server (Vite 8 · Rolldown + lightningcss)
// ═══════════════════════════════════════════════════════════════════════════
//  • react()       → @vitejs/plugin-react: JSX + Fast Refresh
//  • tailwindcss() → @tailwindcss/vite: Tailwind v4 sem PostCSS e sem tailwind.config.js (tokens em src/index.css)
//  • worker.format → 'es': Web Workers como módulos ES (necessário para `new Worker(url, { type: 'module' })`
//                    em src/pages/pulse/dataset.ts)
//  Importações especiais usadas no projeto: `?raw` (shaders .wgsl como texto) e `.json` (world-atlas, package.json).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
})
