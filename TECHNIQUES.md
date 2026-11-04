# Catálogo de técnicas — Atlas

> Gerado automaticamente por `npm run docs` a partir de `src/data/techniques.ts` e dos marcadores `@tech` no código.
> **214 técnicas** em 10 páginas + casca compartilhada. A coluna “Onde” aponta o **arquivo:linha real** do marcador — não edite este arquivo à mão.
> Para levar uma técnica a outro projeto, peça pelo **nome** exato; para entender o “como”, leia o [GUIA.md](./GUIA.md).

## Índice

- [01 · Lumen](#01--lumen) — `/` · 19 técnicas
- [02 · Prisma](#02--prisma) — `/prisma` · 28 técnicas
- [03 · Tipo](#03--tipo) — `/tipo` · 19 técnicas
- [04 · Pulse](#04--pulse) — `/pulse` · 23 técnicas
- [05 · Gravity](#05--gravity) — `/gravity` · 21 técnicas
- [06 · Orbit](#06--orbit) — `/orbit` · 18 técnicas
- [07 · Nebula](#07--nebula) — `/nebula` · 21 técnicas
- [08 · Mundi](#08--mundi) — `/mundi` · 17 técnicas
- [09 · Nativo](#09--nativo) — `/nativo` · 20 técnicas
- [10 · Terminal](#10--terminal) — `/terminal` · 18 técnicas
- [Casca compartilhada](#casca-compartilhada)

## 01 · Lumen

**Rota:** `/` · **Tagline:** Shader em tempo real

Landing page com fragment shader WebGL2 puro, tipografia animada e microinterações.

Tags: `WebGL2` `GLSL` `SplitText` `Motion`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **WebGL2 puro (sem biblioteca)** | Fragment shader em tela cheia com ~100 linhas de JS: compila, linka e desenha sem Three.js. | `src/pages/lumen/ShaderCanvas.tsx:7` |
| 2 | **Triângulo full-screen via gl_VertexID** | Nenhum buffer ou atributo: o vertex shader gera 3 vértices a partir do índice. | `src/pages/lumen/ShaderCanvas.tsx:22` |
| 3 | **Domain warping com FBM** | Ruído fractal deformando as próprias coordenadas (q → r → f) para gerar fluidos orgânicos. | `src/pages/lumen/ShaderCanvas.tsx:33` |
| 4 | **Lente que segue o mouse** | Distorção do espaço de UV por `exp(-d)`; a intensidade cresce com a velocidade do ponteiro. | `src/pages/lumen/ShaderCanvas.tsx:69` |
| 5 | **Resolução dinâmica** | Mede o tempo médio de frame a cada 30 quadros e escala o canvas entre 0.35× e 1.5× para segurar 60fps. | `src/pages/lumen/ShaderCanvas.tsx:213` |
| 6 | **Pausa inteligente do render loop** | IntersectionObserver + visibilitychange param o rAF quando o canvas não está visível. | `src/pages/lumen/ShaderCanvas.tsx:232` |
| 7 | **Canvas criado no efeito (StrictMode-safe)** | Evita reaproveitar um contexto WebGL já perdido por loseContext() no remount do StrictMode. | `src/pages/lumen/ShaderCanvas.tsx:115` |
| 8 | **GSAP SplitText com máscara por caractere** | Letras sobem de dentro de `overflow: clip` com stagger e rotação (`mask: "chars"`). | `src/pages/lumen/Lumen.tsx:65` |
| 9 | **Blur reveal por palavra** | Subtítulo entra palavra a palavra com `filter: blur()` animado. | `src/pages/lumen/Lumen.tsx:74` |
| 10 | **Parallax do hero com useScroll/useTransform** | Título desce, shader dá zoom e conteúdo some conforme o scroll da seção. | `src/pages/lumen/Lumen.tsx:50` |
| 11 | **Marquee guiada pela velocidade do scroll** | `useVelocity` + `useSpring` aceleram, invertem e inclinam (`skewX`) o texto contínuo. | `src/pages/lumen/Lumen.tsx:147` |
| 12 | **Contadores animados em viewport** | `useInView` dispara `animate()` que escreve direto no DOM (sem re-render por frame). | `src/pages/lumen/Lumen.tsx:195` |
| 13 | **Botão magnético** | O wrapper é puxado ao cursor por springs e o conteúdo interno se desloca 45% (parallax interno). | `src/components/Magnetic.tsx:8` |
| 14 | **Cards com tilt 3D + spotlight** | rotateX/Y por springs + `radial-gradient` posicionado por CSS variables (`--mx/--my`) atualizadas no pointermove. | `src/pages/lumen/Lumen.tsx:246` |
| 15 | **Cards empilhados com sticky** | Cada card gruda (`position: sticky`) e encolhe/escurece conforme os seguintes chegam (`useScroll` com `target`). | `src/pages/lumen/Lumen.tsx:362` |
| 16 | **mix-blend-mode: difference no título** | O texto inverte a cor do shader por baixo, mantendo contraste em qualquer área. | `src/pages/lumen/lumen.css:147` |
| 17 | **Bento grid + color-mix()** | Grid de 6 colunas com spans e cores derivadas de um único `--accent` via `color-mix(in oklab)`. | `src/pages/lumen/lumen.css:327` |
| 18 | **Texto com gradiente e contorno** | `background-clip: text` nos números e `-webkit-text-stroke` nos textos do marquee. | `src/pages/lumen/lumen.css:238` |
| 19 | **CSS nesting nativo** | Seletores aninhados (`&`) sem pré-processador. | `src/pages/lumen/lumen.css:7` |

## 02 · Prisma

**Rota:** `/prisma` · **Tagline:** CSS que parece mágica

Quase tudo em CSS moderno: scroll-driven animations, anchor positioning, @property, container queries.

Tags: `@property` `view()` `anchor` `:has()`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **@property (propriedades tipadas)** | Registrar `--angle`, `--hue`, `--shift` e `--p` permite animar/interpolar variáveis CSS (gradiente girando, matiz derivando). | `src/pages/prisma/prisma.css:20` |
| 2 | **Cor relativa em OKLCH** | `oklch(from var(--c1) l c calc(h + 70))` deriva uma paleta inteira de um único matiz. | `src/pages/prisma/prisma.css:82` |
| 3 | **Interpolação de gradiente em OKLCH** | `linear-gradient(90deg in oklch longer hue, …)` — gradientes vivos, sem “lama” no meio. | `src/pages/prisma/prisma.css:146` |
| 4 | **light-dark() + color-scheme** | Tema claro/escuro declarado numa linha por token, sem media query duplicada. | `src/pages/prisma/prisma.css:70` |
| 5 | **Troca de tema com View Transition circular** | `document.startViewTransition` + `flushSync` revelam o tema novo em círculo a partir do clique. | `src/pages/prisma/Prisma.tsx:46` |
| 6 | **Scroll-driven: barra de progresso** | `animation-timeline: scroll(root)` — sem listener de scroll, roda no compositor. | `src/pages/prisma/prisma.css:137` |
| 7 | **Scroll-driven: reveals com view()** | `animation-timeline: view()` + `animation-range: entry 0% cover 46%`; 5 keyframes diferentes escolhidos por `--fx`. O efeito é visível na entrada e o cartão termina inteiro. | `src/pages/prisma/prisma.css:552` |
| 8 | **Parallax por scroll em CSS puro** | Cada card do hero sobe numa velocidade (`--rise`) ligada ao `scroll(root)`. | `src/pages/prisma/prisma.css:443` |
| 9 | **view-timeline nomeada** | `view-timeline: --story` conduz cubo, anel e legendas com uma única linha do tempo. | `src/pages/prisma/prisma.css:1245` |
| 10 | **Cena 3D só com CSS** | Cubo com seis faces, `preserve-3d`, `perspective` e vidro (`backdrop-filter`). | `src/pages/prisma/prisma.css:1133` |
| 11 | **Contador CSS animado por @property** | `--p` (integer) animado alimenta `counter-reset` e um `conic-gradient` — o “%” do anel é texto gerado por CSS. | `src/pages/prisma/prisma.css:1183` |
| 12 | **Borda cônica rotativa** | `conic-gradient(from var(--angle))` recortado com `mask-composite: exclude`. | `src/pages/prisma/prisma.css:494` |
| 13 | **Motion path em CSS** | Blobs percorrem um caminho com `offset-path: path()` + `offset-distance` animado. | `src/pages/prisma/prisma.css:372` |
| 14 | **Filtros SVG: gooey e turbulência** | `feGaussianBlur + feColorMatrix` funde os blobs; `feTurbulence + feDisplacementMap` deforma o título no hover. | `src/pages/prisma/Prisma.tsx:67` |
| 15 | **Container queries + cqi** | O cartão muda de layout conforme a largura do próprio container (redimensionável via `resize`). | `src/pages/prisma/prisma.css:689` |
| 16 | **scroll-state container query** | `container-type: scroll-state` + `@container scroll-state(stuck: top)` estiliza o header quando ele gruda. | `src/pages/prisma/prisma.css:173` |
| 17 | **:has() como lógica de UI** | Plano selecionado muda a paleta do pai; hover dimming dos irmãos; toggle de deriva de cor via checkbox — sem JS. | `src/pages/prisma/prisma.css:717` |
| 18 | **Transição de @property (morph de matiz)** | `transition: --hue .9s` faz toda a paleta local mudar suavemente ao trocar de plano. | `src/pages/prisma/prisma.css:728` |
| 19 | **:user-invalid / :user-valid** | Validação visual só depois da interação do usuário. | `src/pages/prisma/prisma.css:911` |
| 20 | **field-sizing: content** | Textarea que cresce sozinho conforme o texto. | `src/pages/prisma/prisma.css:895` |
| 21 | **Anchor positioning** | `anchor-name`, `position-anchor`, `position-area` e `position-try-fallbacks: flip-block` posicionam tooltips/menus sem Popper. | `src/pages/prisma/prisma.css:1024` |
| 22 | **Popover API + @starting-style** | Top layer nativo (Esc/clique fora) com animação de entrada/saída (`allow-discrete`). | `src/pages/prisma/prisma.css:992` |
| 23 | **details exclusivo + interpolate-size** | `<details name>` vira acordeão exclusivo; `::details-content` anima de 0 a `auto`. | `src/pages/prisma/prisma.css:1093` |
| 24 | **Carrossel CSS nativo** | scroll-snap + `::scroll-marker`, `::scroll-marker-group`, `::scroll-button()` e `:target-current` (Chrome 135+). | `src/pages/prisma/prisma.css:1353` |
| 25 | **view(inline) em slides** | Cada slide escala/ganha opacidade conforme se aproxima do centro do scroller horizontal. | `src/pages/prisma/prisma.css:1444` |
| 26 | **@layer + escopo por classe** | Camada `prisma` evita brigar com o reset do Tailwind; tudo sob `.prisma`. | `src/pages/prisma/prisma.css:11` |
| 27 | **Progressive enhancement com @supports** | Sem `animation-timeline` a página continua legível (cena 3D vira lista estática). | `src/pages/prisma/prisma.css:153` |
| 28 | **text-wrap: balance / pretty** | Títulos equilibrados e parágrafos sem “viúvas”. | `src/pages/prisma/prisma.css:112` |

## 03 · Tipo

**Rota:** `/tipo` · **Tagline:** Editorial & tipografia

Revista digital: scroll horizontal pinado, fonte variável reativa ao mouse, Flip e traços SVG.

Tags: `GSAP` `ScrollTrigger` `Lenis` `Variable Font`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **Fonte variável reativa ao cursor** | Cada letra mede a distância ao ponteiro e mapeia para 4 eixos da Fraunces (wght, opsz, SOFT, WONK). | `src/pages/tipo/Tipo.tsx:38` |
| 2 | **Ponteiro virtual em telas de toque** | Sem mouse recente, uma senoide varre a palavra e mantém o efeito vivo. | `src/pages/tipo/Tipo.tsx:59` |
| 3 | **Loops no gsap.ticker** | Efeitos contínuos (proximidade, lente, marquee) usam o ticker do GSAP e são removidos no cleanup. | `src/pages/tipo/Tipo.tsx:74` |
| 4 | **ScrollTrigger scrub (barra de leitura)** | scaleX da barra ligado ao progresso total da página. | `src/pages/tipo/Tipo.tsx:142` |
| 5 | **SplitText por linhas com máscara + autoSplit** | Títulos revelam linha a linha; `autoSplit` refaz o split em resize/carregamento de fonte. | `src/pages/tipo/Tipo.tsx:152` |
| 6 | **Texto que acende com o scroll** | SplitText por palavras + `stagger` com `scrub: true` vai de 12% a 100% de opacidade. | `src/pages/tipo/Tipo.tsx:173` |
| 7 | **Marca-texto animado** | `background-size` transiciona de 0 a 100% quando o `<mark>` entra (ScrollTrigger.onToggle). | `src/pages/tipo/Tipo.tsx:189` |
| 8 | **Scroll horizontal “pinado”** | `pin: true` + `scrub` + `end: () => "+=" + dist` + `invalidateOnRefresh` convertem scroll vertical em horizontal. | `src/pages/tipo/Tipo.tsx:196` |
| 9 | **containerAnimation (parallax interno)** | Os glifos gigantes têm trigger ligado à animação horizontal e deslizam/rotacionam em velocidades próprias. | `src/pages/tipo/Tipo.tsx:225` |
| 10 | **gsap.matchMedia** | A coreografia pinada só existe ≥900px; no mobile vira lista vertical. | `src/pages/tipo/Tipo.tsx:202` |
| 11 | **DrawSVGPlugin** | O traço vermelho se desenha com o scroll (`drawSVG: 0% → 100%`). | `src/pages/tipo/Tipo.tsx:249` |
| 12 | **MotionPathPlugin** | A “caneta” segue o caminho do traço com `autoRotate`. | `src/pages/tipo/Tipo.tsx:253` |
| 13 | **GSAP Flip** | Alternar grade/lista e filtrar reposiciona os MESMOS elementos com animação (`getState` → `flushSync` → `Flip.from`, com `onEnter/onLeave`). | `src/pages/tipo/Tipo.tsx:294` |
| 14 | **Lente com clip-path** | Segunda camada de texto revelada por `clip-path: circle(var(--r) at var(--x) var(--y))` com posição suavizada. | `src/pages/tipo/Tipo.tsx:314` |
| 15 | **Marquee com impulso de velocidade** | `getVelocity()` gera um “boost” que decai por frame e altera o `timeScale` do loop. | `src/pages/tipo/Tipo.tsx:262` |
| 16 | **Grão de papel inline** | SVG `feTurbulence` em data-URI sobreposto com `mix-blend-mode: multiply` — sem imagem. | `src/pages/tipo/tipo.css:26` |
| 17 | **Texto circular com textPath** | Selo giratório feito de SVG + `rotate` animado. | `src/pages/tipo/Tipo.tsx:374` |
| 18 | **Eixos tipográficos em hover** | As capas das matérias transicionam `font-variation-settings` (peso/suavidade/wonk). | `src/pages/tipo/tipo.css:433` |
| 19 | **gsap.context + cleanup** | Toda a coreografia é revertida no unmount (compatível com StrictMode). | `src/pages/tipo/Tipo.tsx:135` |

## 04 · Pulse

**Rota:** `/pulse` · **Tagline:** Dashboard em tempo real

React 19 de ponta a ponta: Actions, useOptimistic, Web Worker, virtualização e gráficos em SVG.

Tags: `React 19` `Zustand` `Virtual` `d3-shape`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **use(promise) + Suspense** | React 19 lê a Promise do worker direto no render e suspende até resolver. | `src/pages/pulse/Pulse.tsx:127` |
| 2 | **Web Worker de módulo** | `new Worker(new URL(...), { type: "module" })` gera e agrega 50.000 eventos fora da thread principal. | `src/pages/pulse/dataset.ts:44` |
| 3 | **Transferable ArrayBuffers** | As colunas voltam do worker por transferência (zero-copy), não por clone. | `src/pages/pulse/dataset.worker.ts:72` |
| 4 | **Dados colunares com TypedArrays** | Float64Array/Uint8Array/Float32Array em vez de 50k objetos; filtro e ordenação operam sobre índices (Uint32Array). | `src/pages/pulse/dataset.ts:10` |
| 5 | **Virtualização (TanStack Virtual)** | Só ~30 linhas existem no DOM, mesmo com 50.000 eventos. | `src/pages/pulse/EventsTable.tsx:89` |
| 6 | **useDeferredValue** | A digitação nunca trava: a filtragem roda em prioridade menor (indicador “stale”). | `src/pages/pulse/EventsTable.tsx:51` |
| 7 | **useTransition** | Ordenar colunas é uma transição interrompível. | `src/pages/pulse/EventsTable.tsx:58` |
| 8 | **Actions: form action + useActionState** | Formulário assíncrono com estado de retorno (erro/sucesso) sem onSubmit manual. | `src/pages/pulse/Incidents.tsx:78` |
| 9 | **useOptimistic** | O incidente aparece na hora (“salvando…”) e é revertido sozinho se a ação falhar. | `src/pages/pulse/Incidents.tsx:69` |
| 10 | **useFormStatus** | O botão sabe que o form está pendente sem prop drilling. | `src/pages/pulse/Incidents.tsx:48` |
| 11 | **ref como prop (sem forwardRef)** | React 19: componentes de função recebem `ref` direto. | `src/pages/pulse/EventsTable.tsx:24` |
| 12 | **Título do documento no componente (React 19)** | Metadados de documento declarados no JSX (hoisting nativo do React 19). | `src/pages/pulse/Pulse.tsx:248` |
| 13 | **Zustand com selectors** | Store fora do React; cada card assina só o que usa, re-render cirúrgico a 1Hz. | `src/pages/pulse/store.ts:7` |
| 14 | **Gráficos com d3-scale + d3-shape** | Paths de `area`, `line` (curveMonotoneX), `pie` e `arc` gerados com d3 e renderizados em SVG puro. | `src/pages/pulse/charts.tsx:43` |
| 15 | **Janela deslizante com Web Animations API** | Cada tick desloca o gráfico 1 passo e anima translateX de +passo → 0 por 1s linear (movimento contínuo). | `src/pages/pulse/charts.tsx:110` |
| 16 | **Crosshair e tooltip com Pointer Events** | Índice mais próximo via `scale.invert`, tooltip posicionado e limitado à largura. | `src/pages/pulse/charts.tsx:179` |
| 17 | **Números animados sem re-render** | Spring do Motion escreve `textContent` direto no DOM. | `src/pages/pulse/charts.tsx:20` |
| 18 | **Reorder (drag para priorizar)** | `Reorder.Group/Item` + `AnimatePresence` para lista arrastável com saída animada. | `src/pages/pulse/Incidents.tsx:127` |
| 19 | **Command palette (⌘K) com dialog nativo** | Busca fuzzy, navegação por setas, execução por Enter e navegação entre páginas. | `src/pages/pulse/CommandPalette.tsx:30` |
| 20 | **Tailwind v4: tokens, @container e starting:** | Cores em OKLCH via `@theme`, `@md/@xl` por container, `starting:` para entradas, `aria-pressed:`/`aria-selected:`/`open:` variants. | `src/pages/pulse/Pulse.tsx:44` |
| 21 | **Heatmap com color-mix()** | Intensidade vira `color-mix(in oklch, mint X%, ink)` por célula; entrada escalonada via `transition-delay`. | `src/pages/pulse/charts.tsx:273` |
| 22 | **Donut interativo** | Hover liga arcos, legenda e número central; arcos animados por springs. | `src/pages/pulse/charts.tsx:212` |
| 23 | **Skeleton enquanto o worker trabalha** | Fallback de Suspense com `animate-pulse`. | `src/pages/pulse/Pulse.tsx:187` |

## 05 · Gravity

**Rota:** `/gravity` · **Tagline:** Física, som e brincadeira

Neo-brutalismo com motor de física (Matter.js), síntese de áudio, partículas em canvas e drag.

Tags: `Matter.js` `Web Audio` `Canvas 2D` `Springs`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **Motor de física (Matter.js)** | Corpos rígidos, restituição, atrito, paredes e colisões reais. | `src/pages/gravity/Playground.tsx:41` |
| 2 | **Passo fixo com acumulador** | A simulação avança em 1/60s independente da taxa do monitor (determinística). | `src/pages/gravity/Playground.tsx:296` |
| 3 | **DOM sincronizado com a física** | Pílulas HTML estilizadas com CSS; a cada frame recebem `translate3d + rotate` do corpo. | `src/pages/gravity/Playground.tsx:327` |
| 4 | **Canvas 2D para bolas e partículas** | Dezenas de bolas e centenas de partículas sem custo de layout; sombras “duras” desenhadas manualmente. | `src/pages/gravity/Playground.tsx:338` |
| 5 | **Arrasto próprio (Constraint + Pointer Events)** | `Query.point` acha o corpo; uma `Constraint` mola o puxa até o ponteiro; `setPointerCapture`. | `src/pages/gravity/Playground.tsx:184` |
| 6 | **touch-action só onde precisa** | Somente as pílulas bloqueiam o scroll — o resto da página rola normalmente no mobile. | `src/pages/gravity/Playground.tsx:446` |
| 7 | **Modos de gravidade** | Normal, zero-g, invertida, ímã (força radial até o cursor) e inclinação via `deviceorientation`. | `src/pages/gravity/Playground.tsx:243` |
| 8 | **Explosão por impulso** | Velocidade e rotação aleatórias em todos os corpos + rajada de partículas. | `src/pages/gravity/Playground.tsx:255` |
| 9 | **Colisão → som + faíscas** | `collisionStart` calcula velocidade relativa; intensidade define volume, timbre e número de partículas (com cooldown). | `src/pages/gravity/Playground.tsx:163` |
| 10 | **Síntese com Web Audio API** | Osciladores, filtros, envelopes exponenciais e compressor; nenhum arquivo de áudio. | `src/pages/gravity/audio.ts:5` |
| 11 | **Ruído branco como AudioBuffer** | Base de snare, hi-hat e clap (com filtros high/band-pass). | `src/pages/gravity/audio.ts:35` |
| 12 | **Escala pentatônica** | Cada corpo toca uma nota da escala — qualquer colisão soa musical. | `src/pages/gravity/audio.ts:52` |
| 13 | **Osciloscópio com AnalyserNode** | Dados de domínio do tempo desenhados em canvas, pausando fora da tela. | `src/pages/gravity/Gravity.tsx:23` |
| 14 | **Pads jogáveis por toque e teclado** | Q W E R / A S D F disparam sons; estado visual por `data-lit`. | `src/pages/gravity/Gravity.tsx:93` |
| 15 | **Drag com inércia e limites elásticos** | `drag`, `dragConstraints`, `dragElastic` e `dragTransition` (power/timeConstant/bounce). | `src/pages/gravity/Gravity.tsx:162` |
| 16 | **z-index dinâmico** | O adesivo tocado sobe para o topo da pilha. | `src/pages/gravity/Gravity.tsx:170` |
| 17 | **Entrada com spring (queda)** | `whileInView` + spring com baixa amortização cria “quique”. | `src/pages/gravity/Gravity.tsx:167` |
| 18 | **Carta holográfica** | Tilt por springs + foil (`repeating-linear-gradient` posicionado por CSS vars) com `mix-blend-mode: color-dodge/overlay`. | `src/pages/gravity/Gravity.tsx:206` |
| 19 | **Camadas com translateZ** | Texto da carta em 3 profundidades (`transform-style: preserve-3d`). | `src/pages/gravity/Gravity.tsx:256` |
| 20 | **Neo-brutalismo com Tailwind** | Sombras duras, bordas 3px, `data-[grab=true]:`, `text-stroke` e valores arbitrários. | `src/pages/gravity/Playground.tsx:435` |
| 21 | **Loops pausados fora da tela** | IntersectionObserver liga/desliga física, osciloscópio e render. | `src/pages/gravity/Playground.tsx:404` |

## 06 · Orbit

**Rota:** `/orbit` · **Tagline:** 3D guiado por scroll

Cena Three.js (R3F) com vidro de transmissão, partículas GPU morfando e pós-processamento.

Tags: `R3F` `Three.js` `Bloom` `GPU morph`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **React Three Fiber (cena declarativa)** | Three.js como componentes React, com `useFrame` para o loop. | `src/pages/orbit/Scene.tsx:13` |
| 2 | **MeshTransmissionMaterial (vidro)** | Refração com espessura, IOR, distorção temporal e aberração cromática. | `src/pages/orbit/Scene.tsx:75` |
| 3 | **Ambiente procedural com Lightformers** | Estúdio de luz desenhado em código — zero HDRI baixado. | `src/pages/orbit/Scene.tsx:222` |
| 4 | **Partículas com ShaderMaterial custom** | 26.000 pontos com sprite suave e blending aditivo, tudo em GLSL. | `src/pages/orbit/Scene.tsx:29` |
| 5 | **Morph entre 4 formas na GPU** | Atributos `aP1/aP2/aP3` guardam alvos; o vertex shader interpola com atraso individual (`smoothstep(aRand…)`) — a CPU só envia `uMorph`. | `src/pages/orbit/morph.ts:84` |
| 6 | **Geração procedural de formas** | Esfera de Fibonacci, toro, casca de cubo e galáxia espiral de 3 braços. | `src/pages/orbit/morph.ts:10` |
| 7 | **Câmera guiada pelo scroll** | Trajetória orbital paramétrica (raio, altura, ângulo) em função do progresso. | `src/pages/orbit/Scene.tsx:187` |
| 8 | **Damping independente de FPS** | `MathUtils.damp` suaviza progresso, escala e parallax com a mesma sensação em 30 ou 144 fps. | `src/pages/orbit/Scene.tsx:194` |
| 9 | **Estado em refs, não em state** | Progresso do scroll vive num `useRef` lido no `useFrame` — nenhum re-render por frame. | `src/pages/orbit/Orbit.tsx:64` |
| 10 | **InstancedMesh** | 140 estilhaços metálicos em um único draw call, matrizes atualizadas por frame. | `src/pages/orbit/Scene.tsx:140` |
| 11 | **Pós-processamento** | Bloom (mipmapBlur), ChromaticAberration, Noise e Vignette via EffectComposer. | `src/pages/orbit/Scene.tsx:241` |
| 12 | **Emissivo > 1 com toneMapped=false** | O núcleo usa cor HDR para o Bloom “pegar” só nele. | `src/pages/orbit/Scene.tsx:126` |
| 13 | **PerformanceMonitor → DPR adaptativo** | Mede FPS e ajusta a resolução do canvas em tempo real. | `src/pages/orbit/Scene.tsx:256` |
| 14 | **eventSource no documento** | Ponteiro chega ao R3F mesmo com o texto por cima (`eventSource={documentElement}`). | `src/pages/orbit/Scene.tsx:268` |
| 15 | **Parallax do ponteiro na joia** | `state.pointer` com damping move a joia sutilmente. | `src/pages/orbit/Scene.tsx:94` |
| 16 | **Fog para profundidade** | Esmaece partículas/estilhaços distantes. | `src/pages/orbit/Scene.tsx:217` |
| 17 | **HUD atualizado direto no DOM** | Leituras de scroll/uMorph e capítulo ativo escritas por ref, sem state. | `src/pages/orbit/Orbit.tsx:73` |
| 18 | **Cards de vidro com blur-in** | `whileInView` com `filter: blur()` + `backdrop-filter` sobre o canvas. | `src/pages/orbit/Orbit.tsx:130` |

## 07 · Nebula

**Rota:** `/nebula` · **Tagline:** Computação na GPU

WebGPU de verdade: compute shader em WGSL simulando até 2 milhões de partículas, com fallback em Canvas 2D.

Tags: `WebGPU` `WGSL` `Compute` `Instancing`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **WebGPU: adapter, device e contexto de canvas** | `navigator.gpu.requestAdapter()` → `requestDevice()` → `canvas.getContext("webgpu").configure()`; retorna null quando não há suporte. | `src/pages/nebula/engine.ts:78` |
| 2 | **Compute shader em WGSL (simulação na GPU)** | Cada thread atualiza UMA partícula (`@workgroup_size(64)`); milhões de partículas sem a CPU tocar nos dados. | `src/pages/nebula/compute.wgsl:66` |
| 3 | **Curl noise (fluxo incompressível)** | Curl de ruído de valor por diferenças finitas: o campo de velocidades tem divergência zero e escoa como fluido. | `src/pages/nebula/compute.wgsl:53` |
| 4 | **Uniform buffer com layout explícito** | Struct `Params` de 12 campos (48 bytes) com ordem e alinhamento WGSL respeitados. | `src/pages/nebula/compute.wgsl:15` |
| 5 | **Uniforms escritos por frame com layout explícito** | Float32Array + Uint32Array sobre o mesmo ArrayBuffer (o campo `count` é u32); `queue.writeBuffer` a cada frame. | `src/pages/nebula/engine.ts:413` |
| 6 | **Storage buffer compartilhado entre compute e render** | Um único buffer STORAGE escrito pelo compute e lido pelo vertex shader no mesmo frame — nada volta para a CPU. | `src/pages/nebula/engine.ts:209` |
| 7 | **Instancing sem vertex buffer** | `draw(4, count)` com `vertex_index` (canto do quad) e `instance_index` (partícula) — zero atributos de vértice. | `src/pages/nebula/render.wgsl:33` |
| 8 | **Blending aditivo** | Fator `one + one`: partículas somam luz; por isso a textura intermediária é HDR. | `src/pages/nebula/engine.ts:153` |
| 9 | **Rastros por acumulação em textura HDR** | Pass de fade (preto translúcido) por cima do frame anterior + partículas em `rgba16float` (`loadOp: "load"`). | `src/pages/nebula/engine.ts:380` |
| 10 | **Tone mapping de Reinhard + vinheta no blit** | Comprime valores HDR (x/(1+x)) e aplica vinheta ao copiar a textura para o canvas. | `src/pages/nebula/blit.wgsl:26` |
| 11 | **Tamanho e brilho adaptativos à contagem de partículas** | size ∝ 1/√n com piso de ~1px; o ganho cai quando o piso age para a imagem não estourar. | `src/pages/nebula/engine.ts:430` |
| 12 | **Autopilot do atrator (Lissajous quando ocioso)** | Sem movimento do mouse há 2,5 s o atrator percorre uma curva de Lissajous. | `src/pages/nebula/engine.ts:357` |
| 13 | **Validação de shader com getCompilationInfo + fallback** | Erros de WGSL viram mensagem `arquivo linha:coluna` e disparam o fallback em vez de tela preta. | `src/pages/nebula/engine.ts:112` |
| 14 | **Fallback em Canvas 2D com a mesma interface do motor WebGPU** | Mesma API (`NebulaEngine`), CPU, até 12 mil partículas e rastro por retângulo translúcido. | `src/pages/nebula/fallback2d.ts:15` |
| 15 | **Ciclo de vida seguro (StrictMode, dispose, device.lost)** | Flag `cancelled` para descartar inicializações assíncronas obsoletas, `dispose()` completo e troca para o fallback se o device for perdido. | `src/pages/nebula/engine.ts:329` |
| 16 | **Shaders importados com ?raw (Vite)** | `import src from "./x.wgsl?raw"` entrega o arquivo como string: o mesmo texto roda na GPU e aparece no visualizador de código. | `src/pages/nebula/engine.ts:18` |
| 17 | **Realce de sintaxe WGSL sem biblioteca** | Uma regex com 6 grupos + `matchAll` gera spans coloridos preservando o texto entre os tokens. | `src/pages/nebula/highlight.tsx:6` |
| 18 | **Introspecção da GPU (adapter.info, features, limits)** | Mostra nome da GPU, features opcionais e limites relevantes reportados pelo adapter. | `src/pages/nebula/Nebula.tsx:304` |
| 19 | **Intl.NumberFormat em notação compacta** | "250 mil", "1 mi", "2 mi" em pt-BR sem formatação manual. | `src/pages/nebula/Nebula.tsx:33` |
| 20 | **CSS @scope (estilos isolados sem prefixar tudo)** | `@scope (.nebula)` limita as regras à página; seletores curtos (`h1`, `button`) não vazam. | `src/pages/nebula/nebula.css:4` |
| 21 | **text-box: trim para alinhar o título pela altura das maiúsculas** | `text-box: trim-both cap alphabetic` remove o espaço vazio acima/abaixo do texto. | `src/pages/nebula/nebula.css:55` |

## 08 · Mundi

**Rota:** `/mundi` · **Tagline:** Cartografia viva

Globo e mapas com d3-geo: dia/noite em tempo real, morph entre projeções, círculos de Tissot e coroplético.

Tags: `d3-geo` `TopoJSON` `Canvas` `Delaunay`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **Dados do mundo em TopoJSON (importado como módulo JSON)** | `world-atlas` (Natural Earth) em TopoJSON: 177 países em ~100 KB; `feature()` e `mesh()` geram GeoJSON e fronteiras. | `src/pages/mundi/geo.ts:31` |
| 2 | **Renderização de GeoJSON direto no contexto 2D (geoPath com canvas)** | `geoPath(projection, ctx)` chama moveTo/lineTo no Canvas em vez de gerar SVG; `clipAngle(90)` descarta o hemisfério de trás. | `src/pages/mundi/Globe.tsx:66` |
| 3 | **Terminador dia/noite em tempo real** | Ponto subsolar (declinação + equação do tempo) e `geoCircle` de 90° em torno do ponto anti-solar, em 3 camadas para o crepúsculo. | `src/pages/mundi/geo.ts:171` |
| 4 | **Arrastar com Pointer Events, setPointerCapture e inércia** | A velocidade do último movimento vira inércia que decai (×0,94/frame); `setPointerCapture` mantém o arrasto fora do canvas. | `src/pages/mundi/Globe.tsx:286` |
| 5 | **Hit-testing de vizinho mais próximo com Delaunay** | `Delaunay.find` devolve a cidade mais próxima do cursor sem comparar com todas. | `src/pages/mundi/Globe.tsx:158` |
| 6 | **Escala de raio por raiz quadrada (área proporcional ao valor)** | `scaleSqrt` faz a ÁREA do marcador — não o raio — proporcional à população. | `src/pages/mundi/Globe.tsx:60` |
| 7 | **Loop de render pausado fora da tela e em aba oculta** | IntersectionObserver + visibilitychange ligam/desligam o rAF do globo. | `src/pages/mundi/Globe.tsx:270` |
| 8 | **Morph entre projeções (interpolação de projeções cruas)** | Mistura ponto a ponto `(1−t)·A(λ,φ) + t·B(λ,φ)` de duas projeções e anima `t` com Motion; `fitExtent` reencaixa a cada quadro. | `src/pages/mundi/geo.ts:92` |
| 9 | **Círculos de Tissot (indicatrizes de deformação)** | Círculos geodésicos iguais cuja deformação mostra o erro de cada projeção. | `src/pages/mundi/geo.ts:59` |
| 10 | **Mapa coroplético com interpoladores d3-scale-chromatic** | Valor normalizado u ∈ [0,1] (linear ou log) → cor com Viridis/Turbo/RdYlBu; área calculada com `geoArea`. | `src/pages/mundi/Lab.tsx:23` |
| 11 | **Hit-testing com isPointInPath no canvas** | Reconstrói o caminho de cada país com a transformação atual e pergunta ao canvas `isPointInPath` — exato mesmo com morph e zoom. | `src/pages/mundi/Lab.tsx:186` |
| 12 | **Zoom no ponto do cursor (Ctrl + roda / pinça do trackpad)** | Matriz de zoom `k,x,y` mantém o ponto sob o cursor parado; wheel NÃO passivo, só com Ctrl/⌘. | `src/pages/mundi/Lab.tsx:221` |
| 13 | **Redesenho sob demanda com rAF agrupado** | `redraw()` agenda uma única pintura por frame; o mapa fica a 0% de CPU quando parado. | `src/pages/mundi/Lab.tsx:174` |
| 14 | **Legenda interativa que filtra o mapa** | Gradiente CSS montado de 24 amostras do interpolador; passar o mouse destaca só os países da faixa. | `src/pages/mundi/Lab.tsx:388` |
| 15 | **Relógio local com Intl.DateTimeFormat e fusos IANA** | `timeZone: "Asia/Tokyo"` resolve horário de verão e regras históricas sozinho; o dia/noite compara o Sol com a cidade. | `src/pages/mundi/Mundi.tsx:45` |
| 16 | **Textura de papel gerada com SVG feTurbulence (data URI)** | Ruído fractal sutil como imagem de fundo em CSS — 0 KB de imagem raster. | `src/pages/mundi/mundi.css:21` |
| 17 | **Barras de ranking com custom property por linha e animação CSS** | O React escreve só `--w`; largura, grade de fundo e animação `scaleX` são CSS. | `src/pages/mundi/mundi.css:407` |

## 09 · Nativo

**Rota:** `/nativo` · **Tagline:** A plataforma web

Ficha técnica com 14 laboratórios de APIs nativas: Web Crypto, Locks, OPFS, Intl, Temporal, scheduler.yield e mais.

Tags: `Web APIs` `Intl` `OPFS` `BroadcastChannel`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **Detecção de recursos (feature detection) em vez de user-agent** | 42 testes (`in`, `typeof`, `CSS.supports`, try/catch de sintaxe) alimentam a matriz de suporte. | `src/pages/nativo/support.ts:34` |
| 2 | **Intl.Segmenter (grafemas e palavras)** | Conta o que o usuário VÊ (grafemas) e palavras em qualquer idioma — `length` conta unidades UTF-16. | `src/pages/nativo/IntlLab.tsx:20` |
| 3 | **Intl.DisplayNames (países, idiomas e moedas traduzidos)** | Nomes de regiões, idiomas e moedas em qualquer locale a partir de códigos ISO — zero tabelas no bundle. | `src/pages/nativo/IntlLab.tsx:66` |
| 4 | **Intl.RelativeTimeFormat, ListFormat e Collator** | "há 3 dias", "A, B e C" e ordenação natural (arquivo2 < arquivo10) com as regras do idioma. | `src/pages/nativo/IntlLab.tsx:93` |
| 5 | **Temporal (datas imutáveis com fuso)** | Aritmética de datas com fusos IANA e horário de verão corretos; só roda onde `Temporal` existe. | `src/pages/nativo/IntlLab.tsx:133` |
| 6 | **Web Crypto: SHA-256 e AES-GCM** | `crypto.subtle.digest` e ciclo generateKey/encrypt/decrypt com IV aleatório; resultados obsoletos são descartados. | `src/pages/nativo/CryptoLab.tsx:48` |
| 7 | **Compression Streams (gzip/deflate nativos)** | `Blob.stream().pipeThrough(new CompressionStream("gzip"))` sem biblioteca. | `src/pages/nativo/CryptoLab.tsx:83` |
| 8 | **URLPattern (roteamento nativo por padrão de URL)** | `new URLPattern({ pathname })` com grupos nomeados e regex (`:n(\d+)`). | `src/pages/nativo/PatternLab.tsx:22` |
| 9 | **EyeDropper API (conta-gotas de tela inteira)** | Lê a cor de qualquer pixel da tela; trata o cancelamento (AbortError). | `src/pages/nativo/DeviceLab.tsx:22` |
| 10 | **Clipboard API assíncrona** | `navigator.clipboard.writeText` com tratamento de recusa. | `src/pages/nativo/DeviceLab.tsx:36` |
| 11 | **Eleição de líder entre abas com Web Locks** | `navigator.locks.request` mantém o lock até a promessa resolver; AbortController cancela a fila no cleanup. | `src/pages/nativo/TabsLab.tsx:35` |
| 12 | **Presença e mensagens entre abas com BroadcastChannel** | Heartbeat de 2 s + expiração de 6 s para presença; mensagens chegam às demais abas por structured clone. | `src/pages/nativo/TabsLab.tsx:58` |
| 13 | **scheduler.yield() para fatiar tarefas longas** | Cede a thread entre fatias (fallback `setTimeout(0)`); medido com rAF para provar a diferença. | `src/pages/nativo/SchedulerLab.tsx:28` |
| 14 | **Screen Wake Lock (impede a tela de apagar)** | Mantém a tela acesa; o evento `release` sincroniza a UI quando o navegador solta o lock. | `src/pages/nativo/DeviceLab.tsx:74` |
| 15 | **OPFS — sistema de arquivos privado de origem** | `navigator.storage.getDirectory()` + FileSystemFileHandle + `createWritable()`; mostra uso/cota via `storage.estimate()`. | `src/pages/nativo/DeviceLab.tsx:166` |
| 16 | **PerformanceObserver (Core Web Vitals ao vivo)** | Observa LCP, CLS, long tasks e latência de eventos com `buffered: true`. | `src/pages/nativo/VitalsLab.tsx:36` |
| 17 | **matchMedia reativo com useSyncExternalStore** | Preferências do sistema (tema, movimento, contraste, ponteiro…) atualizam sem polling. | `src/lib/hooks.ts:16`<br>`src/pages/nativo/VitalsLab.tsx:162` |
| 18 | **ResizeObserver (reage ao tamanho do ELEMENTO, não da janela)** | `contentBoxSize` entrega medidas fracionárias sem forçar layout. | `src/pages/nativo/VitalsLab.tsx:139` |
| 19 | **CSS subgrid (linhas compartilhadas entre cartões)** | Cartões vizinhos herdam as 4 linhas da grade-pai e alinham cabeçalho/título/corpo. | `src/pages/nativo/nativo.css:181` |
| 20 | **field-sizing: content e :has() em formulários** | Textarea que cresce sozinho e cartão que reage ao foco de qualquer campo interno. | `src/pages/nativo/nativo.css:263` |

## 10 · Terminal

**Rota:** `/terminal` · **Tagline:** Um shell retrô

Web Component com Shadow DOM imitando um monitor CRT, shell funcional que navega pelo site e um donut ASCII 3D.

Tags: `Web Components` `Shadow DOM` `ASCII 3D` `CRT`

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **Web Component (Custom Element + Shadow DOM)** | `<atlas-crt>` estende HTMLElement, encapsula o CSS no Shadow DOM e expõe `power` como atributo observado. | `src/pages/terminal/crt-element.ts:104` |
| 2 | **Constructable Stylesheets (adoptedStyleSheets)** | A folha de estilo é criada uma vez (`new CSSStyleSheet()`) e compartilhada por todos os shadow roots. | `src/pages/terminal/crt-element.ts:16` |
| 3 | **Efeito CRT em CSS (scanlines, vinheta, flicker, power-on)** | Camadas absolutas: `repeating-linear-gradient` + `multiply`, barra de varredura, vinheta, reflexo; power-on com `scaleY` no `:host([power])`. | `src/pages/terminal/crt-element.ts:69` |
| 4 | **Custom Element no React 19 (atributos e slot)** | React 19 passa strings como atributos em elementos customizados; filhos entram no `<slot>`. | `src/pages/terminal/Terminal.tsx:230` |
| 5 | **::part() + custom properties atravessando o Shadow DOM** | A página dimensiona o componente por `::part(screen)` e troca a cor do fósforo com `--crt-tint`. | `src/pages/terminal/terminal.css:21` |
| 6 | **Brilho de fósforo e aberração cromática só com text-shadow** | Três sombras: halo na cor do fósforo + fantasmas vermelho e ciano de 1px. | `src/pages/terminal/terminal.css:47` |
| 7 | **Registro extensível de comandos (objeto nome → { help, run })** | Adicionar uma chave cria o comando, a linha do `help` e a sugestão de Tab. | `src/pages/terminal/commands.ts:91` |
| 8 | **Parser de linha de comando com aspas (regex + matchAll)** | `echo "olá mundo"` → ["echo", "olá mundo"]. | `src/pages/terminal/commands.ts:242` |
| 9 | **Autocompletar por Tab com prefixo comum** | Completa comandos e argumentos (páginas, temas); com ambiguidade lista as opções. | `src/pages/terminal/commands.ts:266` |
| 10 | **Histórico de comandos com ↑/↓, Tab e Ctrl+L** | Índice de histórico + rascunho preservado; Ctrl+L limpa, Ctrl+C descarta a linha. | `src/pages/terminal/Terminal.tsx:190` |
| 11 | **Sequência de boot assíncrona e cancelável** | Linhas entram por timeouts encadeados; qualquer tecla pula a animação; cleanup cancela os timers (StrictMode-safe). | `src/pages/terminal/Terminal.tsx:103` |
| 12 | **Navegação programática com View Transition** | `navigate(path, { viewTransition: true })` aciona a mesma transição circular do dock. | `src/pages/terminal/Terminal.tsx:158` |
| 13 | **package.json importado como módulo (comando stack)** | Lista de bibliotecas e versões lida do `package.json` real, sem duplicar nada. | `src/pages/terminal/commands.ts:157` |
| 14 | **Detecção de hardware do navegador (neofetch)** | hardwareConcurrency, deviceMemory, userAgentData, tela, tema, fuso e nome da GPU via WEBGL_debug_renderer_info. | `src/pages/terminal/commands.ts:66` |
| 15 | **Toro 3D em ASCII (z-buffer + iluminação)** | Pontos do toro → rotação → perspectiva → z-buffer por célula → rampa de caracteres pela luminância. | `src/pages/terminal/donut.ts:22` |
| 16 | **Chuva de caracteres em canvas com rastro por fade** | Retângulo preto translúcido por frame; cabeças que reiniciam aleatoriamente dessincronizam as colunas. | `src/pages/terminal/matrix.ts:14` |
| 17 | **Saída de terminal acessível (role log)** | `role="log"` implica aria-live polite: leitores de tela anunciam só o que for acrescentado. | `src/pages/terminal/Terminal.tsx:238` |
| 18 | **Atalhos clicáveis (chips) para telas de toque** | Botões que executam comandos com um toque — o terminal funciona sem teclado físico. | `src/pages/terminal/Terminal.tsx:288` |

## Casca compartilhada

Presente em todas as rotas (`src/shell/`, `src/router.tsx`, `src/index.css`, `src/lib/`).

| # | Técnica | O que é | Onde (arquivo:linha) |
|---|---------|---------|----------------------|
| 1 | **Code-splitting por rota** | Cada página é um chunk separado (React Router `lazy`); Three, Matter e GSAP só baixam quando você visita a rota. | `src/router.tsx:15` |
| 2 | **View Transitions API entre páginas** | `<Link viewTransition>` + CSS: a página nova é revelada por um círculo (`clip-path`) que nasce no ponto do clique. | `src/index.css:78` |
| 3 | **view-transition-name para elementos persistentes** | Dock e botão de técnicas ficam fixos enquanto o resto da página transita. | `src/index.css:117` |
| 4 | **Dock com magnificação (estilo macOS)** | A distância do cursor a cada item vira tamanho via `useTransform` + `useSpring`; indicador ativo com `layoutId` (shared layout animation). | `src/shell/Dock.tsx:44` |
| 5 | **Container query units (cqw)** | O glifo do dock escala com o tamanho do tile usando `container-type` + `font-size: 42cqw`. | `src/shell/dock.css:34` |
| 6 | **Cursor customizado com inércia** | Anel que segue com lerp em rAF, cresce sobre elementos interativos, `mix-blend-mode: difference`; atualiza via transform direto (sem re-render). | `src/shell/Cursor.tsx:8` |
| 7 | **Dialog nativo com animação de entrada/saída em CSS** | Painel lateral nativo (top layer, foco preso, Esc) animado com `@starting-style` + `transition-behavior: allow-discrete`. | `src/shell/techpanel.css:42` |
| 8 | **Tailwind CSS v4 (CSS-first)** | Configuração por `@theme` direto no CSS (cores OKLCH, fontes, easings) e plugin do Vite — sem tailwind.config.js. | `src/index.css:14` |
| 9 | **Scroll suave com Lenis + ticker do GSAP** | Um único requestAnimationFrame conduz Lenis, ScrollTrigger e animações; respeita `prefers-reduced-motion`. | `src/lib/useSmoothScroll.ts:25` |
| 10 | **Guia visual de técnicas (spotlight)** | Clicar numa técnica fecha o painel, contorna o bloco real na página e abre um cartão em três partes: onde você está olhando, como a técnica foi feita e em qual arquivo. | `src/shell/Spotlight.tsx:11` |
