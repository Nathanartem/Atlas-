/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  pages.ts — metadados das páginas (fonte única)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Consumido por: Dock (ícones), TechPanel (título/cor), Lumen (cards da home + contadores),
 *  Terminal (comandos `ls`/`open`), Pulse (paleta ⌘K) e pelos scripts de documentação.
 *  Para criar uma página: acrescente um objeto aqui + a rota em router.tsx (ver receita lá).
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface PageMeta {
  id: string
  path: string
  name: string
  number: string
  /** Cor de destaque (usada no dock e nos cards da home) */
  accent: string
  tagline: string
  summary: string
  tags: string[]
}

export const pages: PageMeta[] = [
  {
    id: 'lumen',
    path: '/',
    name: 'Lumen',
    number: '01',
    accent: '#8b5cf6',
    tagline: 'Shader em tempo real',
    summary: 'Landing page com fragment shader WebGL2 puro, tipografia animada e microinterações.',
    tags: ['WebGL2', 'GLSL', 'SplitText', 'Motion'],
  },
  {
    id: 'prisma',
    path: '/prisma',
    name: 'Prisma',
    number: '02',
    accent: '#ff7ac6',
    tagline: 'CSS que parece mágica',
    summary: 'Quase tudo em CSS moderno: scroll-driven animations, anchor positioning, @property, container queries.',
    tags: ['@property', 'view()', 'anchor', ':has()'],
  },
  {
    id: 'tipo',
    path: '/tipo',
    name: 'Tipo',
    number: '03',
    accent: '#ff4d1c',
    tagline: 'Editorial & tipografia',
    summary: 'Revista digital: scroll horizontal pinado, fonte variável reativa ao mouse, Flip e traços SVG.',
    tags: ['GSAP', 'ScrollTrigger', 'Lenis', 'Variable Font'],
  },
  {
    id: 'pulse',
    path: '/pulse',
    name: 'Pulse',
    number: '04',
    accent: '#3ee6a8',
    tagline: 'Dashboard em tempo real',
    summary: 'React 19 de ponta a ponta: Actions, useOptimistic, Web Worker, virtualização e gráficos em SVG.',
    tags: ['React 19', 'Zustand', 'Virtual', 'd3-shape'],
  },
  {
    id: 'gravity',
    path: '/gravity',
    name: 'Gravity',
    number: '05',
    accent: '#ffd23f',
    tagline: 'Física, som e brincadeira',
    summary: 'Neo-brutalismo com motor de física (Matter.js), síntese de áudio, partículas em canvas e drag.',
    tags: ['Matter.js', 'Web Audio', 'Canvas 2D', 'Springs'],
  },
  {
    id: 'orbit',
    path: '/orbit',
    name: 'Orbit',
    number: '06',
    accent: '#6ee7ff',
    tagline: '3D guiado por scroll',
    summary: 'Cena Three.js (R3F) com vidro de transmissão, partículas GPU morfando e pós-processamento.',
    tags: ['R3F', 'Three.js', 'Bloom', 'GPU morph'],
  },
  {
    id: 'nebula',
    path: '/nebula',
    name: 'Nebula',
    number: '07',
    accent: '#c6ff3d',
    tagline: 'Computação na GPU',
    summary: 'WebGPU de verdade: compute shader em WGSL simulando até 2 milhões de partículas, com fallback em Canvas 2D.',
    tags: ['WebGPU', 'WGSL', 'Compute', 'Instancing'],
  },
  {
    id: 'mundi',
    path: '/mundi',
    name: 'Mundi',
    number: '08',
    accent: '#d9a441',
    tagline: 'Cartografia viva',
    summary: 'Globo e mapas com d3-geo: dia/noite em tempo real, morph entre projeções, círculos de Tissot e coroplético.',
    tags: ['d3-geo', 'TopoJSON', 'Canvas', 'Delaunay'],
  },
  {
    id: 'nativo',
    path: '/nativo',
    name: 'Nativo',
    number: '09',
    accent: '#2f4bff',
    tagline: 'A plataforma web',
    summary: 'Ficha técnica com 14 laboratórios de APIs nativas: Web Crypto, Locks, OPFS, Intl, Temporal, scheduler.yield e mais.',
    tags: ['Web APIs', 'Intl', 'OPFS', 'BroadcastChannel'],
  },
  {
    id: 'terminal',
    path: '/terminal',
    name: 'Terminal',
    number: '10',
    accent: '#39ff88',
    tagline: 'Um shell retrô',
    summary: 'Web Component com Shadow DOM imitando um monitor CRT, shell funcional que navega pelo site e um donut ASCII 3D.',
    tags: ['Web Components', 'Shadow DOM', 'ASCII 3D', 'CRT'],
  },
]

export const pageByPath = (path: string) =>
  pages.find((p) => p.path === path) ?? pages[0]
