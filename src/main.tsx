/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  main.tsx — ponto de entrada da aplicação
 * ═══════════════════════════════════════════════════════════════════════════
 *  Fluxo: index.html (<div id="root">) → main.tsx → <RouterProvider> → router.tsx → Shell → página
 *   • `index.css`  ........ Tailwind v4 + tokens + transições de página (global)
 *   • `StrictMode` ........ em desenvolvimento monta/desmonta/monta cada efeito para expor limpezas
 *                          incompletas — por isso TODO efeito do projeto devolve um cleanup
 *   • `react-router/dom` .. o RouterProvider "DOM" liga o roteador ao navegador (History API)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import { router } from './router.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
