# Guia do Atlas — como cada página foi construída

> Este guia explica **o que cada página faz, que método foi usado e onde está no código**. Ele é validado automaticamente
> contra o código (`npm run check:docs`): todo caminho `src/...` citado existe, todo `arquivo → símbolo` aponta para algo real,
> e **toda** técnica do catálogo aparece aqui entre aspas angulares (&laquo;assim&raquo;) com a explicação de *como foi feita*.
>
> Companheiros deste documento:
> - [`TECHNIQUES.md`](./TECHNIQUES.md) — tabela gerada com **arquivo:linha** exatos de cada técnica (`npm run docs`)
> - o botão **`{ } Técnicas`** de cada página — a mesma lista, dentro do site; **clique numa técnica** para o holofote apontar onde ela vive na página
> - os comentários no próprio código: cada arquivo começa com um bloco “ARQUIVO / O QUE FAZ / MAPA” e cada técnica tem um
>   marcador `@tech` com o texto explicativo logo acima da implementação

---

## Sumário

1. [Como usar este guia](#1-como-usar-este-guia)
2. [Visão geral do projeto](#2-visão-geral-do-projeto)
3. [A casca compartilhada](#3-a-casca-compartilhada)
4. [Padrões que todas as páginas seguem](#4-padrões-que-todas-as-páginas-seguem)
5. [01 · Lumen](#5-01--lumen--shader-em-tempo-real)
6. [02 · Prisma](#6-02--prisma--css-que-parece-mágica)
7. [03 · Tipo](#7-03--tipo--editorial--tipografia)
8. [04 · Pulse](#8-04--pulse--dashboard-em-tempo-real)
9. [05 · Gravity](#9-05--gravity--física-som-e-brincadeira)
10. [06 · Orbit](#10-06--orbit--3d-guiado-por-scroll)
11. [07 · Nebula](#11-07--nebula--computação-na-gpu)
12. [08 · Mundi](#12-08--mundi--cartografia-viva)
13. [09 · Nativo](#13-09--nativo--a-plataforma-web)
14. [10 · Terminal](#14-10--terminal--um-shell-retrô)
15. [Receitas: levar uma técnica para o seu projeto](#15-receitas-levar-uma-técnica-para-o-seu-projeto)
16. [Como manter o guia em harmonia com o código](#16-como-manter-o-guia-em-harmonia-com-o-código)
17. [Solução de problemas](#17-solução-de-problemas)

---

## 1. Como usar este guia

**Quer saber “como a técnica X foi feita?”** Procure o nome dela (Ctrl+F) — cada técnica aparece entre aspas angulares (&laquo;Nome&raquo;) na seção da página
dela, com 1 a 4 frases do *porquê* e do *como*, mais a referência de código no formato `Arquivo.ext → símbolo`.

**Quer ver o código?** Três caminhos, do mais direto ao mais amplo:

| Você quer… | Faça isto |
|---|---|
| Ir exatamente ao trecho | Abra [`TECHNIQUES.md`](./TECHNIQUES.md): a coluna *Onde* tem `arquivo:linha` (gerada dos marcadores). |
| Ler o trecho com explicação | No editor, busque `@tech <nome>`: o comentário acima do código repete o raciocínio deste guia. |
| Entender o arquivo inteiro | Todo arquivo abre com um cabeçalho “mapa do arquivo” listando as partes na ordem em que aparecem. |

**Convenção dos marcadores.** Um comentário que começa com `@tech` seguido do nome exato da técnica marca *onde* ela é
implementada. Os nomes vêm de `src/data/techniques.ts` (o catálogo). Se você renomear uma técnica, o `check:docs` aponta onde
ajustar o marcador e este guia.

**Formato das referências.** `` `Lumen.tsx → Marquee` `` significa “no arquivo `Lumen.tsx`, o símbolo `Marquee`”. Caminhos completos
(`` `src/pages/nebula/engine.ts` ``) aparecem quando o nome do arquivo seria ambíguo.

---

## 2. Visão geral do projeto

**O que é.** O Atlas é uma *base de estudo e catálogo* de técnicas modernas de front-end: **10 páginas totalmente diferentes**
(visual, bibliotecas e linguagem próprios) dentro de uma mesma aplicação React. Não é um produto — é uma vitrine para você
escolher uma técnica, ler como foi feita e levá-la ao seu projeto.

### 2.1 Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Build | **Vite 8** (Rolldown + lightningcss) | Builds rápidos, `?raw`, workers como módulos, CSS moderno |
| UI | **React 19.3** | `use()`, Actions, `useOptimistic`, `ref` como prop, `<title>` no componente, elementos customizados |
| Linguagem | **TypeScript 7** (nativo) | `erasableSyntaxOnly` + `verbatimModuleSyntax`: o código é “apagável”, o Node 24 roda scripts `.ts` direto |
| Rotas | **React Router 8** | `lazy` por rota (code-splitting) e `viewTransition` |
| Estilo | **Tailwind CSS 4** + CSS nativo | Pulse/Gravity usam Tailwind; as outras têm CSS próprio (nesting, `@layer`, `@scope`…) |
| Animação | **Motion 14**, **GSAP 3.15**, **Lenis** | Springs/layout (Motion), timelines com scroll (GSAP), scroll suave (Lenis) |
| Gráficos | **WebGL2** puro, **WebGPU** puro, **three + R3F**, **d3-geo** | Do shader mínimo à cena 3D e ao mapa-múndi |
| Dados | **Zustand**, **TanStack Virtual**, **d3-shape/scale**, **TopoJSON** | Store fora do React, listas gigantes, gráficos SVG, geografia |
| Física | **Matter.js** | Corpos rígidos 2D |

### 2.2 Estrutura de pastas

```
src/
  main.tsx                 entrada: StrictMode + RouterProvider
  router.tsx               rotas (uma entrada `lazy` por página)
  index.css                Tailwind v4 (@theme), reset, View Transitions
  shell/                   Dock · TechPanel · Spotlight · Cursor · Shell (envolvem TODAS as páginas)
  components/Magnetic.tsx  componente reutilizável
  lib/                     hooks.ts · useSmoothScroll.ts
  data/
    pages.ts               metadados das 10 páginas (fonte única)
    techniques.ts          catálogo de técnicas (fonte única do painel, do Terminal e dos docs)
  pages/
    lumen/ prisma/ tipo/ pulse/ gravity/ orbit/        (as 6 primeiras)
    nebula/ mundi/ nativo/ terminal/                   (as 4 novas)
scripts/                   gen-techniques.ts · check-docs.ts · docs-lib.ts
GUIA.md  TECHNIQUES.md  README.md
```

### 2.3 Como rodar

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc -b + vite build (um chunk por rota)
npm run lint         # oxlint
npm run docs         # regenera TECHNIQUES.md (arquivo:linha dos marcadores)
npm run check:docs   # valida código ↔ catálogo ↔ este guia
```

Use um navegador Chromium recente (Chrome/Edge 135+). Cada página degrada com elegância quando falta suporte (Prisma sem
carrossel nativo, Nebula sem WebGPU → Canvas 2D, Nativo mostra “indisponível”).

---

## 3. A casca compartilhada

A casca é o que **persiste entre páginas**: o `Shell.tsx` renderiza `<Outlet/>` (a página da rota) e, ao redor, o Dock, o painel
de técnicas e o cursor. Nada disso remonta ao navegar.

### 3.1 Roteamento e divisão em chunks

«Code-splitting por rota» — em `router.tsx → router` cada rota usa `lazy: async () => ({ Component: (await import('./pages/x/X.tsx')).default })`.
O `import()` dinâmico faz o bundler gerar **um arquivo por página**; Three.js (Orbit), Matter (Gravity) e GSAP (Tipo/Lumen) só
são baixados na primeira visita à rota. Como o `lazy` resolve o módulo **antes** de concluir a navegação, a View Transition
(abaixo) nunca mostra um “carregando”. Para criar uma página nova siga a receita no cabeçalho de `router.tsx`.

### 3.2 Transição entre páginas

«View Transitions API entre páginas» — `<Link viewTransition>` (e `navigate(path, { viewTransition: true })`) chama
`document.startViewTransition()`. O navegador captura a página antiga e monta a nova ao vivo; em `index.css` animamos a nova
com `clip-path: circle()` de 0% a 150% centrado em `--vt-x/--vt-y`. Essas variáveis são gravadas em `Dock.tsx → setTransitionOrigin`
no clique, por isso o círculo nasce embaixo do dedo. Tudo é CSS; o JS só informa o ponto.

«view-transition-name para elementos persistentes» — o dock e o botão “Técnicas” existem nas duas páginas da transição.
Dar-lhes `view-transition-name` (`.vt-persist-dock`, `.vt-persist-tech` em `index.css`) os tira do snapshot “root”; zeramos a duração
e escondemos o `old`, então eles ficam parados enquanto o resto se revela.

### 3.3 Dock (navegação)

«Dock com magnificação (estilo macOS)» — em `Dock.tsx → DockItem`, o `onPointerMove` do `<nav>` grava `mouseX` (um `MotionValue`).
Cada item calcula a distância entre `mouseX` e o próprio centro (`useTransform`), mapeia `[-140, 0, 140] → [base, peak, base]`
e passa por `useSpring` para dar o efeito gelatinoso. Nenhum re-render do React acontece por movimento do mouse. O indicador da
página ativa usa `layoutId="dock-active"`: o Motion anima **o mesmo elemento** de um item para outro. Em telas estreitas (≤ 640 px)
`base === peak` (sem magnificação, tiles de 36 px), o dock rola na horizontal e `scrollIntoView` mantém o item ativo visível — com 10 páginas ele não caberia no celular.

«Container query units (cqw)» — o tile do dock é um `container-type: inline-size` (`dock.css → .dock__tile`); o glifo usa
`font-size: 42cqw`, isto é, 42% da **largura do tile**. Quando a magnificação muda o tamanho do tile, o ícone acompanha sem JS.

### 3.4 Cursor e painel de técnicas

«Cursor customizado com inércia» — `Cursor.tsx → Cursor` cria um ponto (segue o ponteiro na hora) e um anel que o persegue com
`rx += (x − rx) · 0,16` a cada frame. Cresce sobre elementos interativos (`closest('a, button, …')` → `data-hot`) e usa
`mix-blend-mode: difference` (`cursor.css`) para ficar legível em qualquer fundo. Só existe com `(pointer: fine)` e escreve `transform`
direto no DOM, sem re-render.

«Dialog nativo com animação de entrada/saída em CSS» — `TechPanel.tsx → TechPanel` abre `<dialog>` com `showModal()` (top layer,
foco preso, Esc, `::backdrop`). A parte difícil é animar a **saída**: `techpanel.css → .tech-dialog` usa
`transition: display .5s allow-discrete, overlay .5s allow-discrete` (mantém o elemento visível enquanto anima) e o estado fechado
`translate: 100% 0; opacity: 0`. A lista exibida vem de `techniques[page.id]` (`src/data/techniques.ts`).

«Guia visual de técnicas (spotlight)» — cada item do painel é um botão. Ao clicar, o diálogo fecha e `spotlight.ts → showSpotlight`
avisa o `Spotlight.tsx`: ele procura `[data-spot]` (o campo `spot` do catálogo), rola até o trecho com `scrollToTarget` e desenha o
contorno **na borda real** do elemento (cantos brancos + etiqueta colada). O escurecimento são quatro faixas ao redor do bloco, então
o miolo continua recebendo o mouse. O cartão explica em três partes — onde na página (`spotLook`), como foi utilizada (`what`) e onde
no código (`where`). Blocos que ocupam a tela não ganham um retângulo flutuante: o contorno vai até a borda deles e o véu fica mais claro.
Esc, o véu ou “fechar guia” encerram. Sem o atributo, cai em `[data-spot-page]` na raiz da página.

### 3.5 Estilo global e scroll

«Tailwind CSS v4 (CSS-first)» — não há `tailwind.config.js`: `index.css` faz `@import 'tailwindcss'` e declara tokens em `@theme`
(`--color-ink-*`, `--color-mint`, `--font-chunk`, `--ease-out-expo`…). Cada token vira utilitários (`bg-ink-900`, `text-mint`).
O plugin `@tailwindcss/vite` (`vite.config.ts`) compila e varre o código atrás das classes. Cores em OKLCH.

«Scroll suave com Lenis + ticker do GSAP» — `lib/useSmoothScroll.ts → useSmoothScroll` cria um Lenis e o move **dentro do `gsap.ticker`**
(`lenis.raf(time * 1000)`): um único requestAnimationFrame conduz Lenis, ScrollTrigger e tweens. `lenis.on('scroll', ScrollTrigger.update)`
mantém os triggers sincronizados e `lagSmoothing(0)` impede saltos. Respeita `prefers-reduced-motion` e devolve cleanup completo.
Páginas que precisam de scroll nativo (Pulse, Mundi, Nativo…) simplesmente não chamam o hook.

---

## 4. Padrões que todas as páginas seguem

Estes padrões aparecem em todo o código; vale conhecê-los antes de mergulhar nas páginas.

1. **Todo efeito devolve cleanup.** O `StrictMode` monta → desmonta → monta cada `useEffect` em desenvolvimento. Se um efeito deixa
   listener, rAF, observer, worker ou contexto GPU vivos, o bug aparece na hora. Exemplos: `ShaderCanvas.tsx` (cria o canvas no
   efeito), `engine.ts → dispose`, `Terminal.tsx` (timers do boot), `TabsLab.tsx` (BroadcastChannel e Web Locks).
2. **Laços pesados pausam quando invisíveis.** `IntersectionObserver` + `visibilitychange` ligam/desligam o rAF (Lumen, Gravity, Mundi).
3. **Estado de alta frequência não passa pelo React.** Posição do mouse, progresso do scroll, tempo de física: vivem em `useRef`,
   `MotionValue` ou variáveis do closure e são escritos direto no DOM/GPU (`Cursor.tsx`, `Orbit.tsx`, `Playground.tsx`).
4. **CSS de página é global depois de carregado.** Em SPA, o CSS de uma página continua no documento ao navegar. Por isso cada
   página usa prefixo (`lumen-`, `prisma-`, `nat-`…), `@layer` (Prisma) ou `@scope` (Nebula).
5. **`prefers-reduced-motion` é respeitado**: animações contínuas desligam ou viram um quadro estático.
6. **Degradação graciosa.** Detectar recurso, tentar, cair num plano B (WebGPU → Canvas 2D; `scheduler.yield` → `setTimeout`).
7. **Textos e dados de exemplo em pt-BR**, dados sintéticos claramente identificados (Mundi, Pulse).

---

## 5. 01 · Lumen — shader em tempo real

**Rota** `/` · **Arquivos** `src/pages/lumen/` · **Tema** landing page escura com um fundo gerado por GPU.

Lumen é a porta de entrada. O fundo do hero é um **fragment shader escrito à mão em WebGL2**, sem Three.js. Sobre ele há tipografia
animada, uma faixa de texto que reage ao scroll, contadores, uma grade “bento” de cards que levam às outras 9 páginas e uma pilha de
cards que “empilham” ao rolar.

| Arquivo | Papel |
|---|---|
| `Lumen.tsx` | Composição: `Hero`, `Marquee`, `Numbers`/`Counter`, `Worlds`/`WorldCard`, `Stack`/`StackCard`, `Footer` |
| `ShaderCanvas.tsx` | O componente WebGL2: shaders `VERT`/`FRAG`, loop, resolução dinâmica e pausa |
| `lumen.css` | Todo o visual (nesting nativo) |
| `components/Magnetic.tsx` | Botão magnético (reutilizável) |

### 5.1 O shader de fundo (WebGL2 puro)

«WebGL2 puro (sem biblioteca)» — `ShaderCanvas.tsx → ShaderCanvas` faz o mínimo necessário: `getContext('webgl2')`, compila dois shaders,
liga o programa, busca a localização dos uniforms (`uRes`, `uTime`, `uMouse`, `uVel`) e chama `drawArrays` uma vez por frame. Se não houver WebGL2 ou a
compilação falhar, o componente marca `data-fallback` no contêiner e deixa o canvas transparente; por baixo existe um gradiente radial (`lumen.css → .lumen-hero__shader`, comentário “fallback sem WebGL”) — nada de tela preta.

«Triângulo full-screen via gl_VertexID» — em vez de um quadrado (2 triângulos + buffer), `VERT` gera **um** triângulo maior que a tela a partir do
índice do vértice: `(gl_VertexID << 1) & 2` e `gl_VertexID & 2` produzem (0,0), (2,0), (0,2); multiplicar por 2 e subtrair 1 leva a
(−1,−1), (3,−1), (−1,3). A parte visível é totalmente coberta, sem diagonal, **sem nenhum buffer ou atributo**.

«Domain warping com FBM» — `FRAG` soma 5 oitavas de ruído de valor (FBM) e usa o resultado para **deformar as coordenadas do próprio FBM**:
`q = fbm(p)`, `r = fbm(p + 4q)`, `f = fbm(p + 4r)`. As dobras de fluido nascem dessa composição; as cores são `mix`ados por
`smoothstep` sobre `f`, `|q|` e `|r|`. Vinheta e grão de filme fecham o look.

«Lente que segue o mouse» — antes do FBM, `p += (p - m) * exp(-d * 5.0) * (0.12 + uVel * 0.6)` “estufa” o espaço perto do cursor; `uVel` é a
velocidade suavizada do mouse, então a lente cresce quando você mexe rápido. O mouse é suavizado em JS (`mouse += (target − mouse) · 0,08`).

«Resolução dinâmica» — a cada 30 frames o loop mede o tempo médio. Acima de 22 ms reduz a escala do canvas em 15%; abaixo de 15 ms sobe 6%
(entre 0,35× e 1,5×/DPR). O CSS estica o canvas, então o usuário só percebe menos nitidez — nunca engasgos.

«Pausa inteligente do render loop» — `start`/`stop`/`sync` ligam o rAF apenas se o canvas está visível (`IntersectionObserver`) **e** a aba está
ativa (`document.hidden`). Com `prefers-reduced-motion`, desenha um único quadro.

«Canvas criado no efeito (StrictMode-safe)» — o `<canvas>` é criado dentro do `useEffect` (e não no JSX). O StrictMode monta/desmonta/monta; reaproveitar o
mesmo elemento devolveria um contexto WebGL já perdido por `loseContext()` no cleanup. Cada montagem cria um canvas novo e o cleanup o remove.

### 5.2 Tipografia e movimento

«GSAP SplitText com máscara por caractere» — `Lumen.tsx → Hero` usa `SplitText.create('.lumen-title', { type: 'chars', mask: 'chars', aria: 'auto' })`.
Cada letra ganha uma máscara com `overflow: clip`; animar `yPercent: 115` faz a letra subir “de dentro de um buraco”. `aria: 'auto'`
preserva o texto para leitores de tela. Tudo dentro de `gsap.context` com `ctx.revert()` no cleanup.

«Blur reveal por palavra» — mesma ferramenta com `type: 'words'`: cada palavra anima de `opacity 0 / y 18 / filter: blur(10px)` para nítida, com stagger de
0,045 s — o texto “entra em foco”.

«Parallax do hero com useScroll/useTransform» — `useScroll({ target, offset: ['start start', 'end start'] })` devolve o progresso 0→1 da
seção; `useTransform` converte em estilos: título desce 28%, shader dá zoom de 1→1,25× e o conteúdo some. São `MotionValue`s: o Motion
escreve no DOM sem re-render.

«Marquee guiada pela velocidade do scroll» — `Lumen.tsx → Marquee` encadeia `useScroll → useVelocity → useSpring` e deriva `factor` (acelera/inverte)
e `skew` (inclina até ±9°). `useAnimationFrame` soma o deslocamento base ao impulso; o conteúdo é duplicado e `wrap(-50, 0, v)` volta ao
início a 50%, formando um loop sem emenda.

«Contadores animados em viewport» — `Lumen.tsx → Counter` espera `useInView(ref, { once: true })` e roda `animate(0, to)` escrevendo `textContent`
direto no nó em `onUpdate`: 60 atualizações/s sem nenhum re-render. Os números vêm dos dados reais (`pages.length`, soma de `techniques`).

«Botão magnético» — `components/Magnetic.tsx → Magnetic`: o `pointermove` mede a distância do cursor ao centro e grava em `MotionValue`s × `strength`;
`useSpring` dá o puxão elástico (e o retorno em `onPointerLeave`); `useTransform(x, v => v * 0.45)` desloca o **conteúdo interno** 45% a
mais que o wrapper — parallax interno.

### 5.3 Cards e layout

«Cards com tilt 3D + spotlight» — `Lumen.tsx → WorldCard` combina duas camadas: o ponteiro vira x,y em [0,1] (springs) → `rotateX/rotateY` de ±7°/±9° com
`transformPerspective`; e o mesmo ponteiro grava `--mx/--my`, que o CSS usa num `radial-gradient` em `a::before`. Cada card recebe uma única
cor (`--accent`).

«Cards empilhados com sticky» — `Lumen.tsx → Stack`: cada card fica num wrapper `position: sticky` com `top: calc(14vh + 28px·i)`, formando uma pilha.
`StackCard` usa `useTransform` para encolher (`scale`) e escurecer (`dim`) o card conforme os seguintes chegam.

«mix-blend-mode: difference no título» — `lumen.css → .lumen-title` subtrai a cor do título (branco) da do fundo: sobre o shader escuro fica claro, sobre áreas claras
inverte. Contraste garantido sem calcular nada.

«Bento grid + color-mix()» — `lumen.css → .lumen-worlds__grid` é uma grade de 6 colunas; cada card ocupa 2, 3 ou 4 (`.lumen-span-*`). A cor de cada card é derivada de
um único `--accent` com `color-mix(in oklab, var(--accent) X%, …)` (fundo, borda, tags). Em `Lumen.tsx → Worlds` o array `spans` define o padrão
4+2 · 2+2+2 · 3+3 · 2+4 para as 9 páginas.

«Texto com gradiente e contorno» — no marquee, `-webkit-text-stroke` desenha só o contorno (palavras pares vazadas); nos números, gradiente + `background-clip: text`
+ `color: transparent` pintam as letras.

«CSS nesting nativo» — `lumen.css` inteiro usa seletores aninhados com `&` direto no CSS, sem Sass/PostCSS.

**Para reaproveitar:** o shader e seu componente são autossuficientes (copie `ShaderCanvas.tsx`); `Magnetic.tsx` também. Dependências: `gsap`, `motion`.

---

## 6. 02 · Prisma — CSS que parece mágica

**Rota** `/prisma` · **Arquivos** `src/pages/prisma/` · **Tema** quase nenhum JavaScript: o comportamento é CSS moderno.

O `Prisma.tsx` é só marcação (JSX) e dois pequenos comportamentos (trocar tema, ler o slider de matiz). Todo o resto — animações guiadas pelo
scroll, tooltips ancorados, acordeão, temas por `:has()`, carrossel, cubo 3D — está em `prisma.css`.

| Seção (id) | O que demonstra |
|---|---|
| header | `scroll-state(stuck)`, slider de matiz, deriva de cor, tema com View Transition |
| `#topo` | blobs “gooey” em `offset-path`, título com filtro de turbulência, parallax em CSS |
| `#luz` | cartões com animações guiadas por `view()` |
| `#container` | container queries + unidades `cqi` |
| `#has` | `:has()`, `@property`, validação com `:user-invalid`, `field-sizing` |
| `#ancora` | anchor positioning, Popover API, `<details name>` |
| `#cubo` | cubo 3D conduzido por `view-timeline` nomeada |
| `#carrossel` | carrossel nativo |

### 6.1 Sistema de cor

«@property (propriedades tipadas)» — uma variável CSS comum é texto; o navegador não sabe animá-la. `@property --angle { syntax: '<angle>'; … }` registra o **tipo**,
e aí `@keyframes { to { --angle: 360deg } }` anima de verdade. Usamos para girar o gradiente cônico (`--angle`), derivar o matiz (`--shift`),
transicionar a paleta (`--hue`) e contar o anel de progresso (`--p`).

«Cor relativa em OKLCH» — `--c2: oklch(from var(--c1) l c calc(h + 70))` lê L, C e H de `--c1` e devolve uma cor com o matiz deslocado. Uma paleta de 3 cores harmônicas
nasce de **um** matiz; mexer em `--hue` recalcula tudo. OKLCH é perceptualmente uniforme.

«Interpolação de gradiente em OKLCH» — `linear-gradient(90deg in oklch longer hue, …)` interpola no espaço OKLCH pelo caminho longo do matiz: sem o cinza “lamacento” do sRGB.

«light-dark() + color-scheme» — `color-scheme: light` (e `dark` em `[data-theme='dark']`) + `light-dark(A, B)` dão um token por cor, sem blocos duplicados de `@media`.

«Transição de @property (morph de matiz)» — por `--hue` ser `@property <number>`, `transition: --hue .9s` **interpola** o número; ao trocar de plano em `.has-lab`, todas as cores
derivadas deslizam.

### 6.2 Animações guiadas por scroll

«Scroll-driven: barra de progresso» — `prisma.css → .prisma-progress` usa `animation-timeline: scroll(root)`: o “relógio” da animação passa a ser a posição do scroll. A barra cresce com
`scale: 0 → 1` no compositor — sem listener, sem rAF.

«Scroll-driven: reveals com view()» — `.reveal` usa `animation-timeline: view()` (visibilidade do próprio elemento) e `animation-range: entry 0% cover 46%` (cada cartão surge de um jeito enquanto entra e fica completo ainda no meio da tela). A keyframe vem de
`animation: var(--fx)`; o JSX grava `--fx: prisma-rise|pop|wipe|blur|flip` em cada cartão, então **uma regra gera 5 entradas diferentes**.

«Parallax por scroll em CSS puro» — os 3 cartões do hero compartilham a animação `prisma-parallax` presa a `scroll(root)` (`animation-range: 0 100vh`); a distância final vem de
`--rise` (inline no JSX): mesmo keyframe, velocidades diferentes.

«view-timeline nomeada» — `.story` declara `view-timeline: --story`; cubo, anel e legendas usam `animation-timeline: --story` e andam sincronizados por **uma** timeline.

«view(inline) em slides» — no carrossel, `animation-timeline: view(inline)` mede cada slide no eixo horizontal: ao chegar ao centro ele ganha escala/opacidade (`prisma-slide`).

«Progressive enhancement com @supports» — o que depende de `animation-timeline` fica em `@supports (animation-timeline: …)`. Sem suporte a barra fica invisível e os cartões no estado
final: nada quebra, só perde o efeito.

### 6.3 Layout e estados sem JavaScript

«scroll-state container query» — `container-type: scroll-state` torna o header um contêiner que conhece o estado de rolagem; `@container scroll-state(stuck: top)` aplica vidro e sombra só
enquanto ele está grudado.

«Container queries + cqi» — `.cq` é `container: card / inline-size`; `@container card (min-width: 480px | 700px)` troca o layout do cartão pela **largura do contêiner**. A tipografia usa `cqi`
e a caixa tem `resize: horizontal` para você ver ao vivo.

«:has() como lógica de UI» — `.has-lab:has(#p2:checked)` troca o matiz do laboratório; `.dimgrid:has(.tile:hover) .tile:not(:hover)` apaga os irmãos; `.prisma:has(#drift:checked)`
liga a deriva de cor da página. Três comportamentos que antes pediam estado em JS.

«:user-invalid / :user-valid» — `:invalid` já nasce ativo; `:user-invalid` só vale **depois da interação**. Com `:has()` mostramos a mensagem de erro/sucesso sem JS de validação.

«field-sizing: content» — o `<textarea>` cresce linha a linha sozinho (antes: listener `input` recalculando `scrollHeight`).

### 6.4 Camada de topo, âncoras e detalhes

«Anchor positioning» — o botão declara `anchor-name: --chip-a` e o popover `position-anchor: --chip-a` (inline no JSX); `position-area: top` posiciona acima do botão e
`position-try-fallbacks: flip-block` inverte para baixo se faltar espaço. Sem Popper/Floating UI.

«Popover API + @starting-style» — `popover` + `popovertarget` colocam o elemento na top layer (sem z-index, fecha com Esc/clique fora). Para animar, `&:popover-open` define o estado final,
`@starting-style` o inicial e `display/overlay` com `allow-discrete` mantêm a saída visível.

«Carrossel CSS nativo» — a base é `overflow-x: auto` + `scroll-snap-type: x mandatory`. O Chrome 135+ gera **só com CSS** os marcadores (`scroll-marker-group` + `li::scroll-marker`, com `:target-current` para o item ativo) e as setas
(`::scroll-button(left|right)` com `content`). Sem suporte continua um scroll-snap utilizável.

«details exclusivo + interpolate-size» — `<details name="faq">` forma um acordeão exclusivo; `interpolate-size: allow-keywords` + `::details-content` permitem animar a altura de 0 a `auto`.

### 6.5 Efeitos visuais

«Cena 3D só com CSS» — `.cube` tem `transform-style: preserve-3d`; cada face `.f1…f6` é um quadrado girado e empurrado `translateZ(metade da aresta)`; o vidro vem de `backdrop-filter`.

«Contador CSS animado por @property» — `--p` (inteiro) é animado de 0 a 100; `counter-reset: pct var(--p)` + `content: counter(pct) '%'` imprimem o número: o “57%” do anel é **texto gerado por CSS**.
O mesmo `--p` alimenta o `conic-gradient` do anel.

«Borda cônica rotativa» — `::before` com `conic-gradient(from var(--angle) …)` e máscara de duas camadas (`content-box` e caixa inteira) com `mask-composite: exclude`: sobra só o anel de 1,5px.

«Motion path em CSS» — os blobs percorrem `offset-path: path('M … C …')` animando só `offset-distance`; `animation-delay: var(--d)` os espalha.

«Filtros SVG: gooey e turbulência» — `Prisma.tsx` guarda dois filtros num `<svg>` invisível. `prisma-goo` borra e **endurece o alfa** (`feColorMatrix ×24 −10`): círculos que se tocam “colam”. `prisma-liquid`
usa `feTurbulence` animado + `feDisplacementMap` para ondular o título no hover.

«Troca de tema com View Transition circular» — `Prisma.tsx → toggleTheme` chama `document.startViewTransition(apply)`, onde `apply` usa `flushSync` para o React aplicar o tema **dentro** do callback. O círculo nasce
no clique via `--vt-x/--vt-y`. Sem a API (ou com reduced-motion) aplica direto.

### 6.6 Organização

«@layer + escopo por classe» — `@layer prisma { … }` põe todas as regras numa camada que não briga com o reset do Tailwind; tudo está sob `.prisma`.

«text-wrap: balance / pretty» — títulos equilibrados e parágrafos sem viúvas, sem JS.

**Para reaproveitar:** cada técnica é um bloco de CSS quase isolado (copie o `@property` + os keyframes + o seletor). Consulte `TECHNIQUES.md` para a linha exata.

---

## 7. 03 · Tipo — editorial & tipografia

**Rota** `/tipo` · **Arquivos** `src/pages/tipo/` · **Tema** revista digital sobre fontes; GSAP + ScrollTrigger conduzem tudo.

| Parte | Onde |
|---|---|
| `ProximityWord` | título cujas letras reagem ao cursor (`Tipo.tsx`) |
| Coreografia GSAP | um `useEffect` com `gsap.context` (barra de leitura, títulos, manifesto, scroll horizontal, citação, marquee) |
| `flip()` | reorganização grade ↔ lista do índice |
| Lente do cartaz | `clip-path` que segue o mouse |
| `tipo.css` | papel, tinta, grão e eixos tipográficos |

### 7.1 Fonte variável e tipografia

«Fonte variável reativa ao cursor» — cada letra é um `<span data-ch>`. No `gsap.ticker`, medimos a distância do centro da letra até o ponteiro, convertemos em `t` (raio = 42% da largura) e suavizamos com
smoothstep. Esse valor mapeia **4 eixos da Fraunces** em `font-variation-settings`: `wght` 120→900, `opsz` 9→144, `SOFT` 0→100 e `WONK` 0/1. Uma fonte variável = infinitos pesos sem baixar arquivos extras;
`aria-label` no `<h1>` + `aria-hidden` nas letras mantêm a acessibilidade.

«Ponteiro virtual em telas de toque» — sem movimento de ponteiro nos últimos 2,5 s (ou sem mouse), o “cursor” passa a ser uma senoide que varre a palavra.

«Eixos tipográficos em hover» — a capa de cada matéria é uma letra gigante em Fraunces; no hover `font-variation-settings` muda e `transition: font-variation-settings .6s` interpola os eixos (a letra “respira” e gira −8°).

«Texto circular com textPath» — o selo `VARIABLE FONTS ✺ …` segue um círculo definido em `<defs>` (`<textPath href="#tipo-circle">`) e gira com `rotate` em CSS. É SVG: escala sem perda.

«Grão de papel inline» — o `::before` fixo usa um `data-URI` SVG com `feTurbulence` + `feColorMatrix` e `mix-blend-mode: multiply`: textura sem nenhuma imagem.

### 7.2 GSAP e ScrollTrigger

«gsap.context + cleanup» — tudo criado dentro de `gsap.context(fn, scope)` é revertido por `ctx.revert()` no cleanup (essencial no StrictMode, que monta o efeito duas vezes).

«Loops no gsap.ticker» — proximidade das letras, lente e impulso do marquee assinam o **mesmo** `gsap.ticker`; `ticker.remove` no cleanup garante que nada continue vivo.

«ScrollTrigger scrub (barra de leitura)» — `scrub: 0.3` liga o progresso do tween ao do scroll; a barra vai de `scaleX 0→1` conforme a página é lida.

«SplitText por linhas com máscara + autoSplit» — `type: 'lines', mask: 'lines'` divide o título nas quebras reais; `autoSplit: true` refaz o split ao redimensionar ou quando a fonte carrega. A animação mora em `onSplit` para ser recriada a cada re-split.

«Texto que acende com o scroll» — SplitText por palavras + `fromTo(opacity .12 → 1)` com `stagger` e `scrub: true`: o parágrafo acende na velocidade em que você rola.

«Marca-texto animado» — cada `<mark>` ganha um ScrollTrigger que só alterna a classe `is-on`; o CSS transiciona `background-size` de 0 a 100%.

«Scroll horizontal “pinado”» — `pin: true` congela a seção; `scrub: 0.7` liga o scroll ao tween `x: -dist()` da faixa; `end: () => '+=' + dist()` faz o trecho ter exatamente a largura a percorrer;
`invalidateOnRefresh` recalcula ao redimensionar; `anticipatePin` evita tranco. O contador “01 / 05” sai de `onUpdate`.

«gsap.matchMedia» — a coreografia pinada só existe com `(min-width: 900px)`; GSAP a reverte quando a condição deixa de valer, e no mobile a seção vira lista vertical.

«containerAnimation (parallax interno)» — `containerAnimation: slide` faz o trigger medir `start: 'left right'` → `end: 'right left'` em relação ao **movimento horizontal**; cada glifo desliza ±18% e gira ±7° ao atravessar a tela.

«DrawSVGPlugin» — `drawSVG: '0%' → '100%'` anima `stroke-dasharray/offset` até o traço se desenhar, preso ao scroll.

«MotionPathPlugin» — `motionPath: { path, align, autoRotate: true }` leva a “caneta” ao longo da curva do SVG, girando com a tangente; usa o mesmo `scrollTrigger` do traço.

«GSAP Flip» — `Flip.getState` fotografa antes; `flushSync(change)` aplica a mudança do React; `Flip.from` anima do “antes” ao “depois”. Os **mesmos elementos** deslizam para o novo layout; `onEnter/onLeave`
animam itens que entram/saem pelo filtro.

«Lente com clip-path» — o cartaz tem duas camadas de texto; a de cima só aparece dentro de `clip-path: circle(var(--r) at var(--x) var(--y))`. A cada frame posição e raio são suavizados por lerp e escritos como CSS vars.

«Marquee com impulso de velocidade» — loop infinito de `xPercent: -50`; `ScrollTrigger.onUpdate` lê `getVelocity()` e grava um “boost” que decai (×0,94) enquanto `timeScale(dir·(1+boost))` acelera/inverte.

**Para reaproveitar:** `ProximityWord` é independente (precisa de uma fonte com eixos). O padrão `gsap.context` + `matchMedia` serve de molde para qualquer coreografia.

---

## 8. 04 · Pulse — dashboard em tempo real

**Rota** `/pulse` · **Arquivos** `src/pages/pulse/` · **Tema** observabilidade; React 19 de ponta a ponta com Tailwind v4.

Um painel com 4 KPIs ao vivo, gráfico de tráfego, gráfico de status, mapa de calor, formulário de incidentes e uma tabela de **50.000 eventos**
virtualizada. Os 50 mil eventos são gerados num **Web Worker** e lidos com `use()`.

| Arquivo | Papel |
|---|---|
| `Pulse.tsx` | Página: `useLiveFeed`, `Card`, `Kpis`, `Dashboard`, `Skeleton`, atalhos ⌘K |
| `store.ts` | Store Zustand do feed ao vivo (`useLive`) |
| `dataset.ts` / `dataset.worker.ts` | contrato dos dados + gerador no worker |
| `charts.tsx` | `AnimatedNumber`, `Sparkline`, `LiveChart`, `Donut`, `Heatmap` |
| `EventsTable.tsx` | tabela com filtro, ordenação e virtualização |
| `Incidents.tsx` | formulário com Actions + lista arrastável |
| `CommandPalette.tsx` | paleta ⌘K |

**Fluxo dos dados.** `loadDataset()` (cache) → Promise → `Dashboard` lê com `use()` → o worker devolve colunas tipadas → `EventsTable` filtra **índices** → `useVirtualizer` renderiza só as linhas visíveis.

### 8.1 Dados e threads

«Web Worker de módulo» — `dataset.ts → loadDataset` cria `new Worker(new URL('./dataset.worker.ts', import.meta.url), { type: 'module' })`, forma que o Vite empacota como arquivo separado (com `worker.format: 'es'`).
Gerar 50 mil eventos não trava a UI; o worker é encerrado (`terminate`) quando responde.

«Dados colunares com TypedArrays» — em vez de 50.000 objetos, `DatasetMessage` guarda **uma coluna por campo** em arrays tipados (`Float64Array` timestamps, `Uint8Array` serviço/região, `Uint16Array` status,
`Float32Array` latência/valor). Filtros e ordenações trabalham com um `Uint32Array` de **índices** e só leem as colunas necessárias.

«Transferable ArrayBuffers» — `dataset.worker.ts` termina com `postMessage(msg, { transfer: [...buffers] })`: a posse dos buffers **muda de thread** (zero-copy) em vez de serem clonados. Depois o worker não os enxerga mais (por isso é descartável).

«use(promise) + Suspense» — `Pulse.tsx → Dashboard` chama `use(promise)`: o componente **suspende** até a Promise resolver. A Promise precisa ter a mesma referência entre renders — por isso `loadDataset` guarda em cache e a página usa `useMemo`.

«Skeleton enquanto o worker trabalha» — o `<Suspense fallback={<Skeleton/>}>` mostra blocos `animate-pulse` nas mesmas posições da grade final para o layout não “pular”.

«Título do documento no componente (React 19)» — `<title>Atlas — Pulse</title>` dentro do JSX: o React 19 o “eleva” ao `<head>`. Sem react-helmet.

### 8.2 Estado e atualizações

«Zustand com selectors» — `store.ts → useLive` mora fora do React. Cada componente assina uma **fatia** (`useLive((s) => s.points)`) e só re-renderiza se ela mudar. `tick()` cria um novo array por segundo (janela de 60 pontos).
Trocar `tick` por um WebSocket real não exige mexer em componente algum.

«useDeferredValue» — em `EventsTable.tsx`, `deferredQuery` fica “atrasado” em relação ao `query`: o input atualiza na hora e a filtragem pesada roda depois, em prioridade baixa e interrompível. `stale` acende o contador em âmbar.

«useTransition» — `startSorting(() => setSort(...))` marca a ordenação como transição: a UI continua responsiva, e `sorting` (pendente) dá o feedback.

«ref como prop (sem forwardRef)» — `SearchInput` recebe `ref` como prop comum (React 19) e o repassa ao `<input>`, para a paleta ⌘K focar a busca.

«Virtualização (TanStack Virtual)» — `useVirtualizer({ count, estimateSize: 44, overscan: 14 })`: só ~30 linhas existem no DOM; o contêiner interno tem a altura total (`getTotalSize()`) e cada linha é posicionada com `translateY(v.start)`.

### 8.3 Formulários e interação

«Actions: form action + useActionState» — `Incidents.tsx` usa `<form action={action}>` com `useActionState(fn, {})`. O React monta o `FormData`, chama `fn(estadoAnterior, formData)` numa transição e guarda o retorno
(`{ error?, ok? }`). Substitui `onSubmit` + `preventDefault` + `useState(loading/error)`.

«useOptimistic» — `addOptimistic(incident)` mostra o item imediatamente (“salvando…”). Quando a Action termina, o React volta ao valor real; se falhou e nada foi gravado, o item otimista some sozinho (rollback sem código).

«useFormStatus» — o componente `Submit` lê `{ pending }` do `<form>` pai sem receber props: desabilita o botão e mostra o spinner.

«Reorder (drag para priorizar)» — `Reorder.Group/Item` (Motion) dão arrastar-e-soltar vertical; `AnimatePresence` anima a saída; itens pendentes não podem ser arrastados; o botão × usa `stopPropagation` para não iniciar um arrasto.

«Command palette (⌘K) com dialog nativo» — `CommandPalette.tsx`: `score()` faz busca fuzzy (todas as letras em ordem; menor soma de distâncias = melhor); `results` filtra/ordena com `useMemo`; ↑/↓/Enter navegam;
`<dialog>.showModal()` dá top layer e foco preso; a entrada usa classes `starting:` do Tailwind. Os comandos incluem “ir para página” com `navigate(path, { viewTransition: true })`.

### 8.4 Gráficos

«Gráficos com d3-scale + d3-shape» — `d3-scale` mapeia valores → pixels; `line()/area()` com `curveMonotoneX` viram a string `d` do `<path>`; `pie()` + `arc()` geram o donut. O React só renderiza o SVG — nada de d3-selection.

«Janela deslizante com Web Animations API» — a cada segundo o gráfico é recalculado com 1 ponto novo (salto de 1 passo). Para parecer contínuo, `element.animate([translateX(+passo) → translateX(0)], { duration: 1000, easing: 'linear' })` traz o gráfico de volta
suavemente; `a.cancel()` no cleanup evita acúmulo.

«Crosshair e tooltip com Pointer Events» — um `<rect>` transparente captura `pointermove`; `x.invert(px)` devolve o índice do ponto mais próximo; com ele desenhamos linha vertical, círculos e tooltip (limitado às bordas).

«Números animados sem re-render» — `AnimatedNumber`: `useSpring` persegue o valor e `spring.on('change')` escreve `textContent` direto: 60×/s sem render.

«Donut interativo» — `pie().padAngle(0.035)` + `arc().innerRadius(64).outerRadius(90).cornerRadius(5)`; cada `motion.path` anima entrada e destaque. Passar o mouse numa fatia **ou na legenda** define `active`, que atenua as demais e troca o número central.

«Heatmap com color-mix()» — cada célula tem `color-mix(in oklch, mint X%, ink-800)` com X = volume normalizado; `starting:scale-50` + `transitionDelay` fazem a grade acender em onda.

### 8.5 Estilo

«Tailwind v4: tokens, @container e starting:» — tokens `bg-ink-900`/`text-mint` vêm do `@theme` (`index.css`); `@container` no cartão + variantes `@md:`/`@xl:` nos filhos respondem à largura **do cartão**; `starting:translate-y-6 starting:opacity-0` é `@starting-style`
(entrada escalonada por `transitionDelay`); variantes `aria-pressed:`/`aria-selected:`/`open:` estilizam por atributo.

**Para reaproveitar:** o trio `dataset.ts` + `dataset.worker.ts` + `EventsTable.tsx` é um molde de “tabela de milhares de linhas”; `Incidents.tsx` é um molde de formulário com Actions.

---

## 9. 05 · Gravity — física, som e brincadeira

**Rota** `/gravity` · **Arquivos** `src/pages/gravity/` · **Tema** neo-brutalismo: bordas grossas, sombras duras, cores chapadas.

Quatro seções: um **playground de física** (Matter.js) no hero, **pads de som** sintetizados com Web Audio, **adesivos** arrastáveis com inércia e uma **carta holográfica**.

| Arquivo | Papel |
|---|---|
| `Playground.tsx` | O mundo de física: paredes, pílulas (DOM), bolas e partículas (canvas), colisões, arrasto, modos, loop |
| `audio.ts` | Sintetizador Web Audio: `unlockAudio`, `tone`, `noise`, `hitSound`, `pads` |
| `Gravity.tsx` | Página: `Scope`, `Pads`, `Stickers`, `HoloCard` |

### 9.1 Física

«Motor de física (Matter.js)» — `Playground.tsx → Playground` cria `Engine.create({ gravity: … })` e popula o mundo com `Bodies` (paredes estáticas, pílulas retangulares com `chamfer`, bolas circulares). Matter resolve gravidade, colisões, atrito e restituição.

«Passo fixo com acumulador» — o tempo real de cada frame entra num acumulador (limitado a 100 ms) e a física avança em passos fixos de 1/60 s (`while (acc >= STEP) Engine.update(engine, STEP)`). Resultado determinístico, idêntico num monitor de 60 ou 144 Hz.

«DOM sincronizado com a física» — as pílulas são `<button>` comuns (acessíveis, com Tailwind). A cada frame, o `translate3d` + `rotate` do **corpo** do Matter é copiado para o estilo do elemento: o navegador só compõe, sem layout.

«Canvas 2D para bolas e partículas» — dezenas de bolas e até 400 partículas seriam centenas de elementos DOM; no canvas cada uma é um `arc()`. A sombra dura é um segundo círculo preto deslocado 4px.

«Arrasto próprio (Constraint + Pointer Events)» — no `pointerdown`, `Query.point` acha o corpo; uma `Constraint` (mola, `stiffness: 0.16`) liga o ponteiro ao ponto do corpo e só atualizamos `pointA` ao mover. A física faz o resto; `setPointerCapture` mantém o arrasto fora do elemento.

«touch-action só onde precisa» — só as pílulas têm `touch-none`: arrastá-las não rola a página; o fundo não bloqueia o toque, então a página continua rolando no celular.

«Modos de gravidade» — normal/invertida mudam `engine.gravity.y`; zero-g zera e dá um empurrão; ímã aplica uma força radial até o cursor a cada passo; inclinação (celular) lê `deviceorientation`.

«Explosão por impulso» — sobrescreve `velocity` e `angularVelocity` de todos os corpos de uma vez e dispara 60 partículas; a gravidade e o quique das paredes fazem o resto.

«Colisão → som + faíscas» — `collisionStart` entrega os pares; a velocidade **relativa** mede o impacto (abaixo de 3,2 ignora). Acima disso gera faíscas e toca `hitSound(rel, id)`; um cooldown de 90 ms por corpo evita metralhadora de sons.

«Loops pausados fora da tela» — um `IntersectionObserver` liga/desliga física e render: rolar para longe zera o custo.

«Neo-brutalismo com Tailwind» — bordas de 3px pretas, sombras duras (`shadow-[4px_4px_0_#000]`), tipografia `font-chunk` (Unbounded), cores chapadas e movimento “mecânico” (hover sobe, active afunda). Valores arbitrários e `data-[grab=true]:` do Tailwind v4.

### 9.2 Áudio

«Síntese com Web Audio API» — `audio.ts`: `tone()` = oscilador → (lowpass) → ganho com envelope exponencial (ataque de 8 ms, queda até o silêncio) → master → compressor → analyser → destino; `slideTo` desliza a frequência (kick 160→38 Hz).
`unlockAudio()` cria/retoma o `AudioContext` dentro de um gesto (política de autoplay).

«Ruído branco como AudioBuffer» — 1 s de amostras aleatórias gravadas **uma vez** num `AudioBuffer`; snare/hat/clap reutilizam o buffer em `BufferSource`s novos, filtrados (high-pass = chiado agudo; band-pass = corpo).

«Escala pentatônica» — `pentaFreq(i)` = `196 · 2^(semitons/12)` sobre os graus [0,2,4,7,9]; em `hitSound` o `seed` é o id do corpo, então cada objeto sempre toca a mesma nota e bater em objetos diferentes forma melodias.

«Osciloscópio com AnalyserNode» — `Gravity.tsx → Scope` chama `getByteTimeDomainData` (1024 amostras, 128 = silêncio) e liga os pontos numa polilinha no canvas; sem áudio, desenha uma onda ociosa. IntersectionObserver pausa o rAF; ResizeObserver mantém o bitmap nítido.

«Pads jogáveis por toque e teclado» — `Pads` usa `pointerdown` (menor latência) e um listener de teclado (Q W E R / A S D F) que ignora repetição e atalhos com Ctrl/Meta/Alt. `data-lit="true"` por 120 ms acende o botão; o Tailwind reage com `data-[lit=true]:`.

### 9.3 Movimento

«Drag com inércia e limites elásticos» — `drag`, `dragConstraints={board}`, `dragElastic` e `dragTransition` (`power`, `timeConstant`, `bounceStiffness/Damping`): ao soltar, o adesivo continua deslizando e quica na borda.

«Entrada com spring (queda)» — `initial` joga o cartão 420 px acima, girado; `whileInView` o leva ao lugar com spring de baixa amortização (quica ao pousar), escalonado por `delay: i · 0,1`.

«z-index dinâmico» — `onPointerDown` incrementa um contador e grava no `zIndex` do cartão tocado: o último a ser pego fica por cima.

«Carta holográfica» — `HoloCard`: o ponteiro vira (px,py); `useSpring` gera rotateX/rotateY de ±15° (pai com `perspective`); as mesmas coordenadas movem `--px/--py`, que deslocam um `repeating-linear-gradient` arco-íris gigante com
`mix-blend-mode: color-dodge`. Um brilho especular (`overlay`) segue o ponteiro.

«Camadas com translateZ» — com `transform-style: preserve-3d`, cada bloco de texto recebe um `translateZ` (30, 80, 50 px): ao inclinar a carta, as camadas se deslocam em velocidades diferentes — parallax 3D real.

**Para reaproveitar:** `audio.ts` é independente de React (copie o arquivo). O padrão “corpo físico → transform do DOM” em `Playground.tsx` serve para qualquer UI física.

---

## 10. 06 · Orbit — 3D guiado por scroll

**Rota** `/orbit` · **Arquivos** `src/pages/orbit/` · **Tema** uma cena three.js (React Three Fiber) cuja câmera percorre uma trajetória conforme você rola.

| Arquivo | Papel |
|---|---|
| `Orbit.tsx` | Página: converte scroll em `progress`, HUD e cartões de capítulos |
| `Scene.tsx` | Cena R3F: `Particles`, `Gem`, `Shards`, `CameraRig`, `World`, `OrbitCanvas` |
| `morph.ts` | Formas-alvo (CPU) e shaders do morph (GPU) |
| `orbit.css` | Camadas, HUD e vidro dos cartões |

### 10.1 Cena

«React Three Fiber (cena declarativa)» — `<mesh>`, `<group>`, `<instancedMesh>` são objetos do three.js; `args` são os parâmetros do construtor; `useFrame` é o loop. Dentro dele **mutamos** objetos direto (rotation, uniforms) sem setState.

«MeshTransmissionMaterial (vidro)» — o material do drei renderiza a cena atrás do objeto num buffer e a refrata (`ior 1.45`, `thickness`, `chromaticAberration`, `distortion`, `temporalDistortion`). A geometria é um `torusKnotGeometry` 240×40.

«Emissivo > 1 com toneMapped=false» — `new THREE.Color(3.2, 1.9, 0.55)` tem canais acima de 1 (HDR) e `toneMapped={false}` o poupa da compressão: o `luminanceThreshold` do Bloom só pega este objeto.

«InstancedMesh» — 140 estilhaços em **um** draw call: cada frame atualiza a posição/rotação num `Object3D` auxiliar e copia a matriz com `setMatrixAt`, depois `instanceMatrix.needsUpdate = true`. As sementes usam números primos (determinísticas).

«Ambiente procedural com Lightformers» — `<Environment>` gera o mapa de ambiente a partir de `Lightformer`s (retângulo/anel/círculo emissivos): reflexos nítidos sem baixar HDRI.

«Fog para profundidade» — `<fog args={[cor, 11, 30]}>` esmaece o que está longe, dando profundidade.

«Pós-processamento» — `EffectComposer` funde Bloom (`mipmapBlur`), ChromaticAberration, Noise e Vignette numa passada; o MSAA 4× do composer substitui o antialias do canvas.

### 10.2 Partículas na GPU

«Geração procedural de formas» — `morph.ts → buildTargets` (uma vez, na CPU): esfera de **Fibonacci** (ângulo áureo, sem polos amontoados), toro, casca de cubo e galáxia de 3 braços (`Math.pow(rnd, 0.65)` concentra no centro). PRNG determinístico (`mulberry32`) = cena idêntica a cada carga.

«Partículas com ShaderMaterial custom» — `Scene.tsx → Particles`: `THREE.Points` com `ShaderMaterial` próprio; atributos `position/aP1/aP2/aP3/aRand`; `AdditiveBlending` + `depthWrite: false`; uniforms mudam por frame; `dispose()` no cleanup.

«Morph entre 4 formas na GPU» — `particleVertex`: `uMorph ∈ [0,3]` — a parte inteira escolhe o **par** de formas, a fracionária é o progresso. `aRand` atrasa o início de cada partícula (`smoothstep(aRand·0,42, …)`), o que cria o enxame fluido.
No meio do caminho a partícula “respira” para fora e gira. A CPU só envia um número por frame.

### 10.3 Scroll → câmera

«Estado em refs, não em state» — `Orbit.tsx` guarda `progress` em `useRef`: muda 60×/s sem re-render; o `useFrame` o lê.

«Câmera guiada pelo scroll» — `CameraRig`: `theta = p · 1,7π`, `radius` que encolhe no meio e cresce no fim, `y` oscilando; posição = `(sin θ·r, y, cos θ·r)` com `lookAt` no centro. Sem keyframes: o scroll é a timeline.

«Damping independente de FPS» — `MathUtils.damp(atual, alvo, λ, dt)` é um lerp exponencial que usa o `dt` do frame: a sensação é a mesma em 30, 60 ou 144 fps.

«Parallax do ponteiro na joia» — `state.pointer` define o alvo de posição da joia (±0,35/±0,25) e `damp` a persegue.

«eventSource no documento» — `eventSource={document.documentElement}` + `eventPrefix="client"` fazem o R3F ouvir a página inteira, então o parallax funciona mesmo com o texto por cima do canvas.

«PerformanceMonitor → DPR adaptativo» — `onChange({ factor })` → `dpr = 0,8 + factor` (máx. 1,75): se o PC sofre, a resolução cai e o FPS volta.

### 10.4 Interface

«HUD atualizado direto no DOM» — o listener de scroll escreve `textContent` e `toggleAttribute('data-on')` nos nós via refs; o CSS estiliza o capítulo ativo por `[data-on]`.

«Cards de vidro com blur-in» — `whileInView` anima de `opacity 0 / y 60 / blur(14px)` para nítido quando 45% do cartão aparece; o vidro é `backdrop-filter` sobre o canvas (`orbit.css → .orbit__card`).

**Para reaproveitar:** o par `morph.ts` + `Particles` é um molde de “morph de nuvem de pontos na GPU”; `CameraRig` mostra a câmera conduzida por scroll.

---

## 11. 07 · Nebula — computação na GPU

**Rota** `/nebula` · **Arquivos** `src/pages/nebula/` · **Tema** uma simulação de até **2 milhões de partículas** rodando **inteira na GPU** com WebGPU.

É a página mais “baixo nível” do projeto: não usa three.js, nem nenhuma biblioteca gráfica — fala direto com a API **WebGPU**, escreve a física em **WGSL** (a linguagem de shaders da WebGPU) e
mostra o código real dos shaders na própria página.

| Arquivo | Papel |
|---|---|
| `engine.ts` | O motor WebGPU (TypeScript puro): adapter/device, pipelines, buffers, loop e `dispose` |
| `compute.wgsl` | **A simulação**: uma thread por partícula (curl noise + atração + atrito) |
| `render.wgsl` | Desenho: instancing das partículas e o “fade” dos rastros |
| `blit.wgsl` | Copia a textura HDR para o canvas com tone mapping |
| `fallback2d.ts` | Mesmo contrato do motor, em Canvas 2D (CPU) para quando não há WebGPU |
| `highlight.tsx` | Realce de sintaxe WGSL para o visualizador de código |
| `Nebula.tsx` | Página: hook do motor, HUD, controles, pipeline, visualizador, relatório da GPU |
| `nebula.css` | Visual (em `@scope`) |

### 11.1 O que acontece em cada frame

```
CPU (1× por carga)           GPU (todo frame, `engine.ts → frame`)
────────────────────         ───────────────────────────────────────────────────────────────────────
Float32Array de posições  →  [compute pass]  compute.wgsl  lê/escreve  particleBuf  (storage buffer)
                                   │
                             [render pass → textura "accum" (rgba16float, HDR)]
                                   │   1. fade: preto translúcido por cima do frame anterior   (render.wgsl fs_fade)
                                   │   2. partículas: draw(4, count), blend aditivo            (render.wgsl vs/fs_particle)
                                   ▼
                             [blit pass → canvas]  tone mapping + vinheta                     (blit.wgsl)
```

A CPU só faz três coisas por frame: atualizar dois pequenos *uniform buffers* (parâmetros), gravar o encoder de comandos e submeter. **Nenhum dado de partícula volta à CPU** — por isso 2 milhões a 60+ fps.

### 11.2 Preparação do WebGPU

«WebGPU: adapter, device e contexto de canvas» — `engine.ts → createWebGPUEngine`: verifica `'gpu' in navigator`, pede `requestAdapter({ powerPreference: 'high-performance' })` (a GPU física; pode vir `null`), `requestDevice()` (a conexão lógica que cria recursos), cria o canvas,
`getContext('webgpu')` e `configure({ device, format, alphaMode: 'opaque' })`. Se algo faltar, **retorna `null`** — quem chama decide o plano B.

«Shaders importados com ?raw (Vite)» — os shaders são arquivos `.wgsl` de verdade (com realce no editor) importados como string (`import src from './compute.wgsl?raw'`). O **mesmo texto** compila na GPU e é exibido no visualizador de código da página (`engine.ts → shaderSources`).

«Validação de shader com getCompilationInfo + fallback» — `createShaderModule` nunca lança; erros de WGSL aparecem em `getCompilationInfo()`. `engine.ts → compile` confere as mensagens de erro e lança com `arquivo linha:coluna` **antes** de montar pipelines; a UI então cai no Canvas 2D mostrando o motivo.

«Fallback em Canvas 2D com a mesma interface do motor WebGPU» — `fallback2d.ts → createCanvas2DEngine` devolve um objeto `NebulaEngine` com o mesmo formato (`params`, `stats`, `setCount`, `dispose`). A UI não sabe qual motor roda; o fallback limita a 12 mil partículas e usa um campo senoidal barato no lugar do curl noise.

«Ciclo de vida seguro (StrictMode, dispose, device.lost)» — `Nebula.tsx → useNebulaEngine` usa uma flag `cancelled`: se o efeito for desmontado enquanto `requestAdapter` ainda resolve (StrictMode), o motor recém-criado é descartado.
`engine.dispose()` cancela o rAF, remove listeners e **destrói** buffers, textura e device. `device.lost` com motivo diferente de `'destroyed'` aciona `onLost` → troca para o fallback.

### 11.3 A simulação (compute)

«Compute shader em WGSL (simulação na GPU)» — `compute.wgsl → main` tem `@workgroup_size(64)`: o `dispatchWorkgroups(ceil(count/64))` cria grupos de 64 threads e cada thread atualiza **uma** partícula (`if (i >= params.count) return` descarta a sobra do arredondamento).
Passos: (1) campo de fluxo, (2) atração/repulsão pelo ponteiro com queda 1/r² suavizada, (3) integração com atrito exponencial independente de FPS, (4) mundo toroidal (`fract`).

«Curl noise (fluxo incompressível)» — o *curl* de um campo escalar N é `(∂N/∂y, −∂N/∂x)`: um campo vetorial **sem divergência**, então as partículas escoam como fluido e não se aglomeram. `compute.wgsl → curl` estima as derivadas por diferenças finitas (e = 0,01) e usamos 2 oitavas.

«Uniform buffer com layout explícito» — a `struct Params` de `compute.wgsl` tem 12 campos de 4 bytes = **48 bytes** (múltiplo de 16, como o uniform exige). A **ordem dos campos** precisa bater com o JavaScript:

| índice | campo | tipo | | índice | campo | tipo |
|---|---|---|---|---|---|---|
| 0–1 | `mouse` | vec2f | | 6 | `drag` | f32 |
| 2 | `dt` | f32 | | 7 | `aspect` | f32 |
| 3 | `time` | f32 | | 8 | `count` | **u32** |
| 4 | `attract` | f32 | | 9 | `pointer` | f32 |
| 5 | `curl` | f32 | | 10–11 | `swirl`, `pad` | f32 |

«Uniforms escritos por frame com layout explícito» — `engine.ts → writeParams` usa um `Float32Array(12)` e um `Uint32Array` sobre o **mesmo** `ArrayBuffer` (o campo `count` é `u32`; gravá-lo como float corromperia o valor), e `queue.writeBuffer` a cada frame.

«Storage buffer compartilhado entre compute e render» — `engine.ts → buildParticles` cria **um** buffer `STORAGE` (`[x, y, vx, vy] × n`), preenche posições aleatórias uma vez e o liga a dois bind groups: o do compute (leitura/escrita) e o do render (somente leitura no vertex shader).

### 11.4 O desenho (render)

«Instancing sem vertex buffer» — não existe vertex buffer: `draw(4, count)` dispara `count` **instâncias** de 4 vértices (um `triangle-strip` = um quadrado). Em `render.wgsl → vs_particle`, `instance_index` lê a partícula no storage buffer e `vertex_index` escolhe o canto do quadrado.

«Blending aditivo» — o estado de blend `one + one` em `engine.ts` soma a luz de cada partícula ao que já está na textura; onde há sobreposição a soma passa de 1.0 — por isso a textura intermediária é HDR.

«Rastros por acumulação em textura HDR» — em vez de limpar a tela, o render pass usa `loadOp: 'load'` (preserva o frame anterior), desenha um triângulo gigante preto semi-transparente (`vs_fade/fs_fade`, blend `src-alpha / one-minus-src-alpha`) e **depois** as partículas. O que não é redesenhado esmaece:
cauda de cometa. A textura é `rgba16float` para não ter “banding” nem resíduo no fade.

«Tone mapping de Reinhard + vinheta no blit» — `blit.wgsl → fs_blit` amostra a textura HDR, aplica `c / (1 + c)` (Reinhard), levanta os meios-tons com `pow` e multiplica por uma vinheta.

«Tamanho e brilho adaptativos à contagem de partículas» — `engine.ts → writeRenderParams`: o tamanho segue `0,9/√n`, com piso de ~1 px para não “piscar” (aliasing). Quando o piso age a imagem somaria luz demais; por isso medimos a **cobertura** média por pixel
`C = n · área / pixels` e reduzimos o ganho para que `C · ganho` fique constante — 60 mil e 2 milhões têm exposição parecida.

«Autopilot do atrator (Lissajous quando ocioso)» — se o mouse não se mexe há 2,5 s, o atrator percorre uma curva de Lissajous (`sin(0,37t)`, `sin(0,53t+1,3)`): a página continua viva em telas de toque e enquanto você lê.

### 11.5 Interface da página

«Realce de sintaxe WGSL sem biblioteca» — `highlight.tsx → highlightWgsl` percorre o texto com **uma** regex de 6 grupos (comentário, atributo, palavra-chave, tipo, número, chamada de função) e `matchAll`; o índice do grupo escolhe a classe CSS e o texto entre tokens é preservado.

«Introspecção da GPU (adapter.info, features, limits)» — `GpuReport` lista o nome da GPU (`adapter.info`), as *features* opcionais (`shader-f16`, `subgroups`, `timestamp-query`…) e limites relevantes, exatamente como o navegador os reporta.

«Intl.NumberFormat em notação compacta» — `new Intl.NumberFormat('pt-BR', { notation: 'compact' })` produz “250 mil”, “1 mi”, “2 mi” sem formatação manual.

«CSS @scope (estilos isolados sem prefixar tudo)» — `nebula.css` inteiro está em `@scope (.nebula) { … }`: seletores curtos (`h1`, `button`) valem **só** dentro da página, sem vazar para o Dock ou outras rotas — a alternativa moderna ao prefixo manual.

«text-box: trim para alinhar o título pela altura das maiúsculas» — `text-box: trim-both cap alphabetic` remove o espaço vazio acima das maiúsculas e abaixo da linha de base: o título “Nebula” fica alinhado de verdade às margens.

**Como depurar WebGPU.** Erros de pipeline vão para o console (`uncapturederror` está registrado). Para um shader: edite o `.wgsl` e recarregue — a mensagem de `compile` mostra `arquivo linha:coluna`. Para ver o fallback, abra o Chrome com `--disable-features=WebGPU`.
**Para reaproveitar:** `engine.ts` + os três `.wgsl` formam um molde de “partículas em compute”; troque a física em `compute.wgsl → main` mantendo o layout de `Params`.

---

## 12. 08 · Mundi — cartografia viva

**Rota** `/mundi` · **Arquivos** `src/pages/mundi/` · **Tema** carta náutica (papel, tinta azul-marinho, dourado); visualização de dados geográficos com **d3-geo**.

Três blocos: um **globo** interativo em canvas (arraste, clique numa cidade, veja dia/noite em tempo real), um **laboratório de projeções** (morph entre projeções, círculos de Tissot, mapa coroplético, zoom) e um **ranking** de metrópoles.

| Arquivo | Papel |
|---|---|
| `geo.ts` | Dados do mundo, projeções + `blendRaw`, indicadores, posição do Sol, `sizeCanvas` |
| `Globe.tsx` | Globo ortográfico com loop contínuo |
| `Lab.tsx` | Mapa plano com redesenho sob demanda |
| `Mundi.tsx` | Página, `CityCard` (relógio local) e `Ranking` |
| `cities.ts` | 54 cidades (população aproximada, fuso IANA) |
| `mundi.css` | Visual “carta náutica” |

**Honestidade dos dados.** A área de cada país é **calculada** dos polígonos; temperatura e chuva são **modelos sintéticos** (marcados com um selo na interface); populações são aproximadas. A página diz isso na tela.

### 12.1 Dados e desenho

«Dados do mundo em TopoJSON (importado como módulo JSON)» — o pacote `world-atlas` entrega o Natural Earth em **TopoJSON** (arcos compartilhados → ~100 KB para 177 países). O Vite importa o `.json` como módulo ES e `resolveJsonModule` dá o tipo.
`geo.ts` converte com `feature()` (polígonos) e `mesh()` (fronteiras como **uma** linha; o filtro `a !== b` omite as bordas costeiras).

«Renderização de GeoJSON direto no contexto 2D (geoPath com canvas)» — `geoPath(projection, ctx)` não gera SVG: chama `moveTo/lineTo` no Canvas. Com `clipAngle(90)` o ortográfico descarta o hemisfério de trás, e linhas (arcos entre cidades) seguem o **círculo máximo** automaticamente.
O desenho segue “ordem de pintor”: halo → oceano → grade → países → fronteiras → noite → arcos → cidades → rótulo.

«Terminador dia/noite em tempo real» — `geo.ts → subsolarPoint` calcula onde o Sol está a pino agora: latitude = declinação solar (`−23,44°·cos(2π/365·(N+10))`), longitude = `(12h − hora UTC − equação do tempo) × 15°/h`.
A noite é um `geoCircle` de 90° centrado no ponto **anti-solar** (`antiSolar`), desenhado em 3 camadas (90°, 96°, 103°) para o crepúsculo.

«Escala de raio por raiz quadrada (área proporcional ao valor)» — o olho lê **área**, não raio. Com raio linear, Tóquio pareceria 150× maior que Reykjavík; `scaleSqrt().domain([0,38]).range([2.2, 11])` faz a **área** crescer com a população.

### 12.2 Interação do globo

«Arrastar com Pointer Events, setPointerCapture e inércia» — `Globe.tsx`: arrastar “um raio” gira 90°; a velocidade do último movimento vira `vlon/vlat`, que decaem ×0,94 por frame (normalizado por `dt`). `setPointerCapture` mantém os eventos mesmo fora do canvas;
setas do teclado também giram. Um clique (<5 px de arrasto) numa cidade a seleciona e o globo “voa” até ela pelo menor caminho em longitude.

«Hit-testing de vizinho mais próximo com Delaunay» — a cada frame as cidades visíveis (hemisfério da frente) são projetadas e viram uma triangulação (`Delaunay.from`); `delaunay.find(x, y)` devolve a mais próxima do cursor, sem comparar com todas.

«Loop de render pausado fora da tela e em aba oculta» — `IntersectionObserver` + `visibilitychange` ligam/desligam o rAF do globo.

### 12.3 Laboratório de projeções

«Morph entre projeções (interpolação de projeções cruas)» — uma projeção “crua” é uma função `(λ, φ) → [x, y]`. `geo.ts → blendRaw(a, b, t)` devolve `(1−t)·A + t·B` ponto a ponto — uma projeção **nova e válida** para qualquer `t`. `Lab.tsx → pickProjection`
anima `t` de 0 a 1 com o `animate` do Motion; a cada quadro `fittedProjection` reencaixa o mapa (`fitExtent`). Se você clica no meio do morph, o novo começa da mistura atual.

«Círculos de Tissot (indicatrizes de deformação)» — círculos geodésicos **iguais** (4°) espalhados pelo globo (`geo.ts → tissot`). Ao projetá-los, viram elipses onde há distorção de ângulos e mudam de tamanho onde há distorção de área: em Mercator ficam gigantes perto dos polos.

«Mapa coroplético com interpoladores d3-scale-chromatic» — `Lab.tsx → normalized` converte cada indicador num valor `u ∈ [0,1]` por país (linear ou **logarítmico** para a área) e a cor é `interpolador(u)` (Viridis, Turbo, RdYlBu). “Área” usa `geoArea` (esterorradianos × 4πR²).

«Hit-testing com isPointInPath no canvas» — para saber qual país está sob o cursor, `Lab.tsx → pick` reconstrói o caminho de cada país com **a mesma transformação** do desenho e pergunta ao canvas `isPointInPath`. O ponto é em px de bitmap (por isso `× dpr`). Exato mesmo durante morph e zoom.

«Zoom no ponto do cursor (Ctrl + roda / pinça do trackpad)» — `zoomAt` mantém o ponto sob o cursor parado (`x = px − (px − x)·k2/k`) e limita o pan. Só reage com Ctrl/⌘ (a pinça do trackpad chega como `wheel` com `ctrlKey`) para a roda comum continuar rolando a página; `preventDefault` exige listener **não passivo**.

«Redesenho sob demanda com rAF agrupado» — diferente do globo, o mapa não tem loop: `redrawRef` agenda **uma** pintura por frame (várias mudanças no mesmo frame → 1 pintura). Parado, custa 0% de CPU.

«Legenda interativa que filtra o mapa» — o gradiente é um `linear-gradient` montado a partir de 24 amostras do interpolador; passar o mouse pela barra define uma faixa `[u0,u1]` que esmaece os países fora dela (e mostra “N países nesta faixa”).

### 12.4 Página

«Relógio local com Intl.DateTimeFormat e fusos IANA» — `Mundi.tsx → CityCard` usa `timeZone: 'Asia/Tokyo'` etc.: o navegador resolve horário de verão e regras históricas. O dia/noite compara a distância angular da cidade ao ponto subsolar (`cos > 0` = sol acima do horizonte).

«Textura de papel gerada com SVG feTurbulence (data URI)» — `mundi.css → .mundi`: um `<svg>` inline com `feTurbulence` vira a imagem de fundo (ruído fractal sutil) — 0 KB de imagem.

«Barras de ranking com custom property por linha e animação CSS» — `Mundi.tsx → Ranking` só escreve `--w: 63%` em cada linha; largura, grade de fundo e a animação `scaleX` (`mundi-grow`) são CSS.

**Para reaproveitar:** `geo.ts → blendRaw` com `geo.ts → fittedProjection` e o padrão “estado em `cfg` + `redraw()`” de `Lab.tsx` servem para qualquer mapa em canvas. Dependências: `d3-geo`, `d3-delaunay`, `d3-scale-chromatic`, `topojson-client`, `world-atlas`.

---

## 13. 09 · Nativo — a plataforma web

**Rota** `/nativo` · **Arquivos** `src/pages/nativo/` · **Tema** ficha técnica (papel quadriculado, azul Klein); **14 laboratórios** de APIs que o navegador já traz — sem bibliotecas.

| Arquivo | Laboratórios |
|---|---|
| `support.ts` | A **matriz de suporte** (42 testes) — `features`, `detectAll`, `getScheduler` |
| `IntlLab.tsx` | FIG. 01–04: Segmenter, DisplayNames, Relative/List/Collator, Temporal |
| `CryptoLab.tsx` | FIG. 05–06: Web Crypto e Compression Streams |
| `PatternLab.tsx` | FIG. 07: URLPattern |
| `DeviceLab.tsx` | FIG. 08, 11, 12: EyeDropper + Clipboard, Wake Lock/Vibração/Share, OPFS + `storage.estimate` |
| `TabsLab.tsx` | FIG. 09: BroadcastChannel + Web Locks (**abra em duas abas**) |
| `SchedulerLab.tsx` | FIG. 10: `scheduler.yield()` medido com rAF |
| `VitalsLab.tsx` | FIG. 13–14: PerformanceObserver, matchMedia, ResizeObserver |
| `Spec.tsx` | O cartão “FIG. NN” reutilizado por todos (`Spec`, `Out`) |
| `nativo.css` | Visual (subgrid, `:has()`, `field-sizing`) |

**Regra de ouro de todos os laboratórios:** *detectar antes de usar* e *tratar a recusa* (`try/catch`). Muitas APIs exigem gesto do usuário e contexto seguro (HTTPS/localhost).

### 13.1 Suporte e linguagem

«Detecção de recursos (feature detection) em vez de user-agent» — `support.ts → features`: cada item tem um `test()` que pergunta **diretamente** se o recurso existe (`'EyeDropper' in window`, `typeof [].toSorted === 'function'`, `CSS.supports('anchor-name: --a')`, `new RegExp('a','v')` num `try`).
Continua correto quando um navegador ganha ou perde uma API. `detectAll()` roda os 42 testes uma vez (inicializador preguiçoso de `useState`).

«Intl.Segmenter (grafemas e palavras)» — `string.length` conta unidades UTF-16 (um emoji de família vale 11). `Intl.Segmenter` segue as regras Unicode: “grapheme” = o que o usuário **vê** como um caractere; “word” separa palavras em qualquer idioma.

«Intl.DisplayNames (países, idiomas e moedas traduzidos)» — nomes de regiões, idiomas e moedas em qualquer locale a partir de códigos ISO (`of('BR')` → “Brasil”, “ブラジル”, “البرازيل”): zero tabelas de tradução no bundle.

«Intl.RelativeTimeFormat, ListFormat e Collator» — “há 3 dias”, “A, B e C” e ordenação **natural** (`arquivo2 < arquivo10` com `numeric: true`): regras de plural, conjunção e ordenação vêm do navegador.

«Temporal (datas imutáveis com fuso)» — substituto do `Date`: objetos imutáveis, fusos IANA de primeira classe e aritmética correta com horário de verão (`until`, `withTimeZone`). Só roda onde `globalThis.Temporal` existe; senão a ficha sugere o polyfill.

### 13.2 Dados binários e rotas

«Web Crypto: SHA-256 e AES-GCM» — `CryptoLab.tsx → HashLab`: `crypto.subtle.digest('SHA-256', …)` e o ciclo `generateKey` (chave **não exportável**) → `encrypt/decrypt` com IV aleatório de 96 bits. `crypto.subtle` só existe em contexto seguro; cada efeito usa uma flag `cancelled` para descartar respostas obsoletas.

«Compression Streams (gzip/deflate nativos)» — `new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))` + `new Response(stream).arrayBuffer()` comprime em streaming, sem biblioteca. Útil para enviar JSON grande ou guardar blobs no IndexedDB/OPFS.

«URLPattern (roteamento nativo por padrão de URL)» — `new URLPattern({ pathname: '/mundos/:pagina/tecnicas/:n(\\d+)' }).exec(url)` devolve grupos nomeados (com regex) ou `null`. Erros de sintaxe do padrão lançam — a UI os mostra.

### 13.3 Dispositivo e armazenamento

«EyeDropper API (conta-gotas de tela inteira)» — `new EyeDropper().open()` lê a cor de **qualquer pixel da tela**; rejeita com `AbortError` se o usuário apertar Esc (por isso `try/catch`).

«Clipboard API assíncrona» — `navigator.clipboard.writeText` devolve Promise e pode ser negada (sem foco/permissão); o laboratório mostra o resultado.

«Screen Wake Lock (impede a tela de apagar)» — `navigator.wakeLock.request('screen')` devolve um *sentinel*; o navegador o solta sozinho quando a aba fica oculta, e o evento `release` mantém a UI sincronizada.

«OPFS — sistema de arquivos privado de origem» — `navigator.storage.getDirectory()` devolve uma pasta **invisível ao usuário**, só desta origem, com API de arquivos real (`getFileHandle`, `createWritable`). Mais rápido que IndexedDB para blobs e sem diálogo de permissão. O laboratório salva/lê uma nota e mostra uso/cota (`storage.estimate`).

### 13.4 Várias abas e desempenho

«Eleição de líder entre abas com Web Locks» — `navigator.locks.request('atlas-nativo-leader', cb)` só executa o callback quando **esta** aba obtém o lock, e o mantém enquanto a Promise devolvida não resolver. Resolvemos a Promise no cleanup; `AbortController` cancela o pedido se ainda estávamos na fila (StrictMode).
Resultado: só uma aba é ★ líder; se ela fechar, o navegador entrega o lock à próxima.

«Presença e mensagens entre abas com BroadcastChannel» — `new BroadcastChannel('atlas-nativo')`: o que uma aba envia chega às **outras** (por structured clone). Cada aba manda “ping” a cada 2 s e abas silenciosas por 6 s saem da lista — presença confiável mesmo se uma aba travar.

«scheduler.yield() para fatiar tarefas longas» — o experimento roda a **mesma** conta de dois jeitos: um laço síncrono (bloqueante) e fatiado com `await scheduler.yield()` entre os pedaços (fallback `setTimeout(0)`). Um laço de rAF mede o pior intervalo entre frames — com `performance.now()` **dentro** do callback, porque o argumento do rAF é o início do frame e esconderia o congelamento.
Resultado típico: bloqueante ≈ 1 frame em ~1,5 s; fatiado ≈ dezenas de frames.

«PerformanceObserver (Core Web Vitals ao vivo)» — um observador por tipo: `largest-contentful-paint`, `layout-shift` (CLS = soma dos deslocamentos **sem** interação recente), `longtask` e `event` (base do INP). `buffered: true` entrega também o que aconteceu antes de assinarmos. Os acumuladores ficam em variáveis locais do efeito e gravamos valores
absolutos — assim o StrictMode não soma em dobro.

«matchMedia reativo com useSyncExternalStore» — `lib/hooks.ts → useMediaQuery` assina o evento `change` da `MediaQueryList`: tema, movimento, contraste, ponteiro, HDR… atualizam na hora, sem polling. O painel `MediaLab` lista 10 consultas.

«ResizeObserver (reage ao tamanho do ELEMENTO, não da janela)» — `VitalsLab.tsx → ResizeBox` lê `contentBoxSize` (medidas fracionárias, sem forçar layout) de uma caixa com `resize: both`.

### 13.5 CSS da ficha técnica

«CSS subgrid (linhas compartilhadas entre cartões)» — `nativo.css → .nat-spec` ocupa 4 linhas da grade-pai (`grid-row: span 4`) e herda os tamanhos com `grid-template-rows: subgrid`: cartões vizinhos ficam com selo, título, API e corpo **alinhados** mesmo com alturas diferentes.

«field-sizing: content e :has() em formulários» — `field-sizing: content` faz o textarea crescer com o texto (sem JS) e `.nat-spec:has(:focus-visible)` destaca o cartão inteiro quando qualquer campo interno recebe foco pelo teclado.

**Como adicionar um laboratório.** Crie um componente com `<Spec fig={N} title api supported>…</Spec>`, importe-o em `Nativo.tsx` e, se usar uma API nova, acrescente o teste em `support.ts → features`. Marque o código com `@tech` e atualize o catálogo.

---
## 14. 10 · Terminal — um shell retrô

**Rota** `/terminal` · **Arquivos** `src/pages/terminal/` · **Tema** monitor CRT de fósforo verde com um shell que **navega pelo próprio site**.

Digite `help`, `ls`, `open mundi`, `techniques terminal`, `explain terminal 1`, `stack`, `neofetch`, `donut`, `matrix`, `theme amber`… ou toque nos atalhos. É também um exemplo de **Web Component real** (Custom Element + Shadow DOM) usado dentro do React 19.

| Arquivo | Papel |
|---|---|
| `crt-element.ts` | O elemento `<atlas-crt>`: moldura, vidro, scanlines, vinheta, flicker, power-on |
| `commands.ts` | O “shell”: tipos, registro de comandos, `tokenize`, `execute`, `complete` |
| `Terminal.tsx` | Estado (reducer), teclado, boot, render das linhas, chips |
| `donut.ts` | Toro 3D em ASCII |
| `matrix.ts` | Chuva de caracteres em canvas |
| `terminal.css` | O texto de fósforo (glow, aberração cromática) |

### 14.1 O Web Component

«Web Component (Custom Element + Shadow DOM)» — `crt-element.ts → AtlasCrt` estende `HTMLElement`, cria um **Shadow DOM** (`attachShadow`) com a moldura/vidro e um `<slot>` para o conteúdo. O CSS interno não vaza para a página (nem o contrário).
A API pública é o atributo `power` (`observedAttributes` + `attributeChangedCallback`). `defineCrt()` registra o elemento uma única vez (seguro com HMR).

«Constructable Stylesheets (adoptedStyleSheets)» — a folha de estilo é criada **uma vez** (`new CSSStyleSheet()` + `replaceSync`) e cada shadow root a “adota” (`adoptedStyleSheets = [sheet]`): parse único e memória compartilhada, em vez de um `<style>` por instância.

«Efeito CRT em CSS (scanlines, vinheta, flicker, power-on)» — camadas absolutas sobre o conteúdo: `.scan` (`repeating-linear-gradient` + `mix-blend-mode: multiply`), `.roll` (barra de varredura animada), `.vig` (vinheta radial), `.glare` (reflexo); o `flicker` oscila a opacidade e o
power-on é uma transição de `scaleY` em `:host([power='off']) .glass`. Todas respeitam `prefers-reduced-motion`.

«Custom Element no React 19 (atributos e slot)» — o React 19 reconhece elementos customizados: strings viram **atributos** (`power="on"` chega ao `attributeChangedCallback`) e os filhos entram no `<slot>`. O arquivo declara a tipagem JSX do elemento.

«::part() + custom properties atravessando o Shadow DOM» — o elemento expõe `part="screen|glass|bezel"`; a página dimensiona o componente por `.term-crt::part(screen)` sem conhecer o CSS interno. Já `--crt-tint` (a cor do fósforo) entra no shadow porque
**custom properties herdam através dele** — é como o comando `theme` troca a cor.

«Brilho de fósforo e aberração cromática só com text-shadow» — `terminal.css → .term-screen` usa três sombras: halo na cor do fósforo e fantasmas vermelho e ciano de 1 px — a “falha de convergência” dos tubos CRT, sem JavaScript.

### 14.2 O shell

«Registro extensível de comandos (objeto nome → { help, run })» — `commands.ts → commands` é um objeto; adicionar uma chave cria o comando, a linha no `help` e a sugestão do Tab. Cada `run(args, ctx)` devolve linhas tipadas (`OutLine`) e `ctx` dá acesso controlado à UI
(`navigate`, `setTint`, `toggleMatrix`, `clear`, `history`).

«Parser de linha de comando com aspas (regex + matchAll)» — `tokenize` usa `/"([^"]*)"|'([^']*)'|(\S+)/g`: `echo "olá mundo"` vira `['echo', 'olá mundo']`.

«Autocompletar por Tab com prefixo comum» — `complete()` filtra candidatos (comandos na 1ª palavra; páginas/temas na 2ª), completa até o **prefixo comum** e, se houver ambiguidade, devolve a lista para imprimir.

«package.json importado como módulo (comando stack)» — `commands.ts` importa o `package.json` (`resolveJsonModule`) e o comando `stack` lista dependências e versões **reais**, sem duplicar nada.

«Detecção de hardware do navegador (neofetch)» — combina `hardwareConcurrency`, `deviceMemory`, `userAgentData`, `screen`, `matchMedia`, o fuso de `Intl` e o nome da GPU via extensão `WEBGL_debug_renderer_info` (`gpuName`), sempre com fallback.

«Histórico de comandos com ↑/↓, Tab e Ctrl+L» — `Terminal.tsx → onKeyDown`: `histIdx` aponta o item do histórico em exibição (−1 = linha em edição, guardada em `draft`); Tab usa `complete`; Ctrl+L limpa; Ctrl+C descarta a linha (`^C`).

«Sequência de boot assíncrona e cancelável» — as linhas de `BOOT` entram por `setTimeout` encadeados; qualquer tecla (ou reduced-motion) despeja o resto de uma vez; o cleanup cancela os timers, e como o StrictMode monta duas vezes o efeito começa com `clear`.

«Navegação programática com View Transition» — `ctx.navigate` chama `navigate(path, { viewTransition: true })`: `open mundi` dispara a mesma transição circular do Dock, a partir do texto.

«Saída de terminal acessível (role log)» — `role="log"` implica `aria-live="polite"`: leitores de tela anunciam só o que for **acrescentado**.

«Atalhos clicáveis (chips) para telas de toque» — os botões de `CHIPS` executam um comando com um toque: sem teclado físico o terminal ainda funciona, e os chips ensinam a sintaxe.

### 14.3 Efeitos

«Toro 3D em ASCII (z-buffer + iluminação)» — `donut.ts → renderDonut`: pontos do toro → rotação (A em X, B em Z) → perspectiva → **z-buffer** por célula (`1/z`) → luminância (normal · luz) escolhe o caractere da rampa `.,-~:;=!*#$@`. É matemática pura; `DonutBlock` roda a 60 fps no rAF.

«Chuva de caracteres em canvas com rastro por fade» — `matrix.ts → startMatrix`: cada coluna tem uma “cabeça” que cai; a cada passo um retângulo preto translúcido esmaece os caracteres antigos (rastro); cabeças que passam do fundo reiniciam aleatoriamente, dessincronizando as colunas.

**Como adicionar um comando.** Em `commands.ts → commands`, acrescente `meucomando: { help: 'o que faz', run: (args, ctx) => [text('olá')] }`. Pronto: aparece no `help` e no Tab.
**Para reaproveitar:** `crt-element.ts` funciona em qualquer framework (é HTML puro); `commands.ts` é independente de UI.

---


## 15. Receitas: levar uma técnica para o seu projeto

Cada técnica foi escrita para ser **extraível**. Roteiro geral:

1. **Ache o nome** no painel `{ } Técnicas` da página (ou em [`TECHNIQUES.md`](./TECHNIQUES.md)), clique para vê-la iluminada ao vivo, e copie o `arquivo:linha` indicado.
2. **Leia o comentário `@tech`** logo acima do código: ele repete o raciocínio deste guia e diz o que é essencial e o que é enfeite.
3. **Copie o menor conjunto de arquivos** (tabela abaixo) e instale as dependências listadas em `package.json`.
4. **Leve o cleanup junto.** Toda técnica com listener/rAF/observer/worker/GPU tem o `return () => …` no mesmo `useEffect` — ele faz parte da técnica.
5. **Rode o seu `tsc`** — `erasableSyntaxOnly` + `verbatimModuleSyntax` significam que os arquivos não dependem de enums ou namespaces de TypeScript.

| Quero levar… | Copie | Dependências |
|---|---|---|
| Shader de fundo WebGL2 | `src/pages/lumen/ShaderCanvas.tsx` | nenhuma |
| Botão magnético | `src/components/Magnetic.tsx` | `motion` |
| Dock com magnificação | `src/shell/Dock.tsx` + `dock.css` | `motion`, `react-router` |
| Transição circular entre páginas | `index.css` (trecho `view-transition`) + `Dock.tsx → setTransitionOrigin` | `react-router` 7+ |
| Scroll suave Lenis + GSAP | `src/lib/useSmoothScroll.ts` | `lenis`, `gsap` |
| Scroll horizontal pinado | `Tipo.tsx` (trecho `pin: true` em `gsap.matchMedia`) | `gsap` |
| Tabela com 50k linhas | `pulse/dataset.ts`, `dataset.worker.ts`, `EventsTable.tsx` | `@tanstack/react-virtual` |
| Formulário com Actions | `pulse/Incidents.tsx` | React 19 |
| Física + DOM | `gravity/Playground.tsx` | `matter-js` |
| Sintetizador de áudio | `gravity/audio.ts` | nenhuma |
| Cena 3D guiada por scroll | `orbit/Scene.tsx`, `morph.ts` | `three`, `@react-three/fiber`, `drei`, `postprocessing` |
| Partículas em WebGPU (compute) | `nebula/engine.ts`, `compute.wgsl`, `render.wgsl`, `blit.wgsl`, `fallback2d.ts` | nenhuma (`@webgpu/types` p/ tipos) |
| Globo + mapas d3 | `mundi/geo.ts`, `Globe.tsx`, `Lab.tsx` | `d3-geo`, `d3-delaunay`, `d3-scale-chromatic`, `topojson-client`, `world-atlas` |
| Web Component CRT | `terminal/crt-element.ts` | nenhuma |
| Shell de comandos | `terminal/commands.ts` | nenhuma |
| Matriz de suporte de APIs | `nativo/support.ts` | nenhuma |
| Comunicação entre abas | `nativo/TabsLab.tsx` | nenhuma |

---

## 16. Como manter o guia em harmonia com o código

O projeto tem **três fontes** que precisam concordar: o **código** (marcadores `@tech`), o **catálogo** (`src/data/techniques.ts`) e **este guia**. Dois scripts garantem isso:

```bash
npm run docs         # gera TECHNIQUES.md com o arquivo:linha de cada marcador
npm run check:docs   # falha (exit 1) se algo divergir
```

O `check:docs` verifica:

| # | Regra |
|---|---|
| 1 | Toda técnica do catálogo tem ≥ 1 marcador `@tech <nome exato>` no código |
| 2 | Todo marcador no código existe no catálogo (sem órfãos) |
| 3 | Nomes de técnica são únicos |
| 4 | Todo caminho `src/...` citado neste guia existe |
| 5 | Toda referência `` `arquivo → símbolo` `` aponta para um arquivo real **que contém o símbolo** |
| 6 | Toda técnica citada entre aspas angulares (&laquo;&hellip;&raquo;) existe no catálogo **e** toda técnica do catálogo é citada |
| 7 | Toda página (rota) tem uma seção `## … NN · Nome` |

**Fluxo ao mudar algo**

- *Adicionei uma técnica:* (1) marque o código com `@tech Nome`; (2) acrescente a entrada em `techniques.ts` com o mesmo nome; (3) explique-a neste guia entre aspas angulares, com o nome exato; (4) `npm run docs && npm run check:docs`.
- *Renomeei/movi código:* o marcador acompanha o código (é um comentário). Rode `npm run docs` para atualizar as linhas.
- *Removi uma técnica:* apague o marcador, a entrada do catálogo e o parágrafo do guia.
- *Criei uma página:* siga a receita no cabeçalho de `src/router.tsx` e crie a seção `## NN · Nome` aqui.

---

## 17. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Nebula mostra “Canvas 2D” e um aviso | Sem WebGPU, sem adapter ou erro de shader | Leia o texto pequeno do aviso (traz `arquivo linha:coluna`); atualize o navegador/driver; confira `chrome://gpu` |
| Prisma sem setas no carrossel | Navegador sem `::scroll-button` (Chrome < 135) | Esperado: degrada para scroll-snap |
| Mundi: Ctrl + roda não dá zoom | A roda comum rola a página de propósito | Segure Ctrl/⌘, use os botões +/− ou dê duplo clique |
| Nativo: laboratório “indisponível” | API não existe/ não é segura (HTTP) | Use `localhost` ou HTTPS; veja a matriz de suporte no topo |
| Terminal não aceita digitação | O boot ainda roda (campo desabilitado) | Aguarde ~2 s ou aperte uma tecla para pular |
| `check:docs` falha com “sem marcador” | Nome do catálogo e do marcador diferem | Compare os dois textos (devem ser idênticos, incluindo acentos) |
| Animações “duplicadas” em dev | Efeito sem cleanup (StrictMode revela) | Garanta `return () => …` removendo listeners/rAF/observers |
| Tela preta no hero do Lumen | WebGL2 indisponível | O gradiente de fallback deve aparecer; confira `getContext('webgl2')` |

**Dica final.** Quando quiser levar algo para um projeto, peça pelo **nome da técnica** exatamente como aparece aqui — com o nome em mãos o trecho é localizado em segundos por `TECHNIQUES.md` ou por busca de `@tech`.

