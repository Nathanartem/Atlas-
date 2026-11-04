import { Outlet, ScrollRestoration } from 'react-router'
import { Cursor } from './Cursor.tsx'
import { Dock } from './Dock.tsx'
import { Spotlight } from './Spotlight.tsx'
import { TechPanel } from './TechPanel.tsx'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Shell.tsx — a "casca" que envolve TODAS as páginas
 * ═══════════════════════════════════════════════════════════════════════════
 *  <Outlet/> é onde o React Router renderiza a página da rota atual. Tudo ao redor persiste
 *  entre navegações (não remonta): Dock (navegação), TechPanel (catálogo da página atual) e Cursor.
 *  `ScrollRestoration` devolve a posição de rolagem ao voltar/avançar no histórico.
 *  Detalhes de cada peça: Dock.tsx · TechPanel.tsx · Cursor.tsx (e os .css com o mesmo nome).
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Shell() {
  return (
    <>
      <Outlet />
      <Dock />
      <TechPanel />
      <Spotlight />
      <Cursor />
      <ScrollRestoration />
    </>
  )
}

export function BootFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: '#07060d',
        color: '#8b5cf6',
        font: '500 12px/1 ui-monospace, monospace',
        letterSpacing: '0.2em',
      }}
    >
      ATLAS · CARREGANDO
    </div>
  )
}
