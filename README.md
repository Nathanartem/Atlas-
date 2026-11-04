# Atlas — laboratório de front-end

Base de estudo e **catálogo de técnicas modernas de front-end**. São **10 páginas totalmente diferentes** (design, bibliotecas e linguagem visual próprios), todas dentro de uma casca compartilhada com transições de página, dock de navegação e um painel que lista as técnicas da página atual.

| Documento | Para quê |
|---|---|
| [`GUIA.md`](./GUIA.md) | **Guia detalhado**: o que cada página faz, o método usado em cada técnica e onde está no código |
| [`TECHNIQUES.md`](./TECHNIQUES.md) | Catálogo gerado (214 técnicas) com o **arquivo:linha** real de cada uma |
| botão **`{ } Técnicas`** (no site) | A mesma lista da página em que você está |

> Os três são validados contra o código: `npm run check:docs`.

## As 10 páginas

| # | Rota | Página | Foco |
|---|------|--------|------|
| 01 | `/` | **Lumen** | WebGL2 puro (shader FBM), GSAP SplitText, marquee por velocidade, cards tilt/spotlight, stacking sticky |
| 02 | `/prisma` | **Prisma** | CSS moderno sem biblioteca: scroll-driven animations, `@property`, oklch relativo, anchor positioning, `scroll-state`, `:has()`, carrossel nativo |
| 03 | `/tipo` | **Tipo** | Tipografia editorial: fonte variável reativa, scroll horizontal pinado, DrawSVG + MotionPath, GSAP Flip, lente com `clip-path` |
| 04 | `/pulse` | **Pulse** | Dashboard: React 19 (`use`, Actions, `useOptimistic`), Web Worker com 50k linhas, TanStack Virtual, d3, Zustand, Tailwind v4 |
| 05 | `/gravity` | **Gravity** | Física (Matter.js) ligada ao DOM, síntese de áudio (Web Audio), drag com inércia, neo-brutalismo |
| 06 | `/orbit` | **Orbit** | 3D com React Three Fiber: vidro de transmissão, 26 mil partículas com morph na GPU, câmera guiada pelo scroll |
| 07 | `/nebula` | **Nebula** | **WebGPU**: compute shader em WGSL simulando até 2 milhões de partículas, com fallback em Canvas 2D |
| 08 | `/mundi` | **Mundi** | Cartografia com d3-geo: globo com dia/noite em tempo real, morph entre projeções, círculos de Tissot, coroplético |
| 09 | `/nativo` | **Nativo** | 14 laboratórios de APIs nativas: Web Crypto, Web Locks, OPFS, Intl, Temporal, `scheduler.yield`… |
| 10 | `/terminal` | **Terminal** | Web Component com Shadow DOM (monitor CRT), shell funcional que navega pelo site, donut ASCII 3D |

## Stack

Vite 8 · React 19 · TypeScript 7 · Tailwind CSS 4 · React Router 8 · Motion · GSAP (ScrollTrigger, SplitText, Flip, DrawSVG, MotionPath) · Lenis · three + R3F + drei + postprocessing · WebGPU/WebGL2 puros · Matter.js · d3 (geo, shape, scale, delaunay, scale-chromatic) · Zustand · TanStack Virtual · TopoJSON · Oxlint.

## Como rodar

É preciso **Node.js 22.18 ou mais recente** (os scripts de documentação são TypeScript executado direto pelo Node).

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc -b + vite build (um chunk por página)
npm run preview      # serve o build de produção
npm run lint         # oxlint
npm run docs         # regenera TECHNIQUES.md (arquivo:linha dos marcadores @tech)
npm run check:docs   # valida código ↔ catálogo ↔ GUIA.md (falha se divergirem)
```

No Windows, se o PowerShell recusar o `npm` (“execução de scripts foi desabilitada”), use `npm.cmd` no lugar de `npm`, ou rode uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

A home só baixa o que a primeira página precisa. Three.js, Matter.js, GSAP, o mapa e o WebGPU entram no download apenas quando a rota correspondente é visitada.

Recomendado: navegador Chromium recente (Chrome/Edge 135+). Nebula usa WebGPU (com fallback), Prisma usa CSS muito novo (anchor positioning, `scroll-state`, carrossel nativo) e Nativo mostra, na própria página, o que o seu navegador suporta.

## Estrutura

```
src/
  main.tsx, router.tsx      rotas lazy (um chunk por página)
  index.css                 Tailwind v4 (@theme), base, View Transitions
  shell/                    Dock, Cursor, TechPanel, Spotlight, Shell (layout raiz)
  components/               Magnetic (reutilizável)
  lib/                      useSmoothScroll (Lenis+GSAP), hooks
  data/
    pages.ts                metadados das páginas
    techniques.ts           catálogo — fonte única do painel, do Terminal e dos docs
  pages/
    lumen/ prisma/ tipo/ pulse/ gravity/ orbit/ nebula/ mundi/ terminal/ nativo/
scripts/                    gen-techniques.ts · check-docs.ts · docs-lib.ts
```

## Como o código está documentado

- **Cabeçalho em cada arquivo**: bloco “ARQUIVO / O QUE FAZ / MAPA” listando as partes na ordem em que aparecem.
- **Marcadores `@tech`**: um comentário com a etiqueta `@tech` seguida do nome exato da técnica fica **logo acima** da implementação, explicando *como* ela funciona.
- **`GUIA.md`**: a explicação completa, por página, citando cada técnica pelo nome.
- **`npm run check:docs`** garante que as três coisas concordam (todo nome do catálogo tem marcador e explicação; todo caminho e símbolo citado existe).

## Como pedir uma técnica para um projeto seu

1. Abra o painel `{ } Técnicas` no site (ou `TECHNIQUES.md`) e ache o **nome**.
2. Peça “quero a técnica *X* no meu projeto”: o `arquivo:linha` leva direto ao trecho.
3. A seção “Receitas” do `GUIA.md` lista os arquivos mínimos e as dependências de cada técnica.

## Convenções

- **CSS de página é global depois de carregado** (SPA): classes e `@keyframes` têm prefixo da página (`prisma-*`, `lumen-*`, `nat-*`…) ou usam `@layer` / `@scope`.
- Todo efeito React devolve **cleanup** (o StrictMode monta duas vezes em desenvolvimento).
- Animações respeitam `prefers-reduced-motion`.
- Loops pesados (WebGL, WebGPU, canvas, física) **pausam** fora da tela via `IntersectionObserver`.
