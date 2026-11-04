import { createBrowserRouter } from 'react-router'
import { BootFallback, Shell } from './shell/Shell.tsx'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  router.tsx — mapa de rotas do site (uma entrada por página)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Como adicionar uma página nova (receita):
 *   1. crie `src/pages/<id>/<Nome>.tsx` com `export default function Nome()` (e seu .css)
 *   2. registre a rota abaixo (copie uma linha `lazy`)
 *   3. acrescente a página em `src/data/pages.ts` (nome, cor, resumo) → ela entra no dock e nos cards da home
 *   4. liste as técnicas em `src/data/techniques.ts` e marque o código com um comentário "@tech" + nome exato
 *   5. `npm run check:docs` confirma que tudo está em harmonia
 *
 * @tech Code-splitting por rota
 * Cada página (e suas libs pesadas — Three, Matter, GSAP) vira um chunk baixado só quando necessário.
 * `lazy` do React Router carrega o módulo ANTES de navegar, então a View Transition acontece sem flash
 * de "carregando". O `import()` dinâmico é o que faz o Vite/Rolldown gerar um arquivo separado por rota.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Shell,
    HydrateFallback: BootFallback,
    children: [
      { index: true, lazy: async () => ({ Component: (await import('./pages/lumen/Lumen.tsx')).default }) },
      { path: 'prisma', lazy: async () => ({ Component: (await import('./pages/prisma/Prisma.tsx')).default }) },
      { path: 'tipo', lazy: async () => ({ Component: (await import('./pages/tipo/Tipo.tsx')).default }) },
      { path: 'pulse', lazy: async () => ({ Component: (await import('./pages/pulse/Pulse.tsx')).default }) },
      { path: 'gravity', lazy: async () => ({ Component: (await import('./pages/gravity/Gravity.tsx')).default }) },
      { path: 'orbit', lazy: async () => ({ Component: (await import('./pages/orbit/Orbit.tsx')).default }) },
      { path: 'nebula', lazy: async () => ({ Component: (await import('./pages/nebula/Nebula.tsx')).default }) },
      { path: 'mundi', lazy: async () => ({ Component: (await import('./pages/mundi/Mundi.tsx')).default }) },
      { path: 'nativo', lazy: async () => ({ Component: (await import('./pages/nativo/Nativo.tsx')).default }) },
      { path: 'terminal', lazy: async () => ({ Component: (await import('./pages/terminal/Terminal.tsx')).default }) },
      { path: '*', Component: () => <p style={{ color: '#fff', padding: 40 }}>404</p> },
    ],
  },
])
