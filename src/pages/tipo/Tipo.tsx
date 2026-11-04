import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource-variable/unbounded/wght.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/instrument-serif/400.css'

import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { Flip } from 'gsap/Flip'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { useSmoothScroll } from '../../lib/useSmoothScroll.ts'
import './tipo.css'

gsap.registerPlugin(ScrollTrigger, SplitText, Flip, DrawSVGPlugin, MotionPathPlugin)

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  03 · TIPO — revista digital sobre tipografia (rota "/tipo")
 * ═══════════════════════════════════════════════════════════════════════════
 *  Mapa do arquivo
 *   1. ProximityWord ........ título "Letra" cujas letras reagem ao cursor (fonte variável)
 *   2. DADOS ................ `specimens` (5 fontes) e `articles` (8 matérias do índice)
 *   3. Tipo (default) ....... 3a. toda a coreografia GSAP num único gsap.context
 *                             3b. flip() — reorganiza grade/lista animando os MESMOS elementos
 *                             3c. lente do cartaz (clip-path que segue o mouse)
 *                             3d. JSX das seções: hero · manifesto · scroll horizontal · citação · índice · cartaz · rodapé
 *  Estilos em tipo.css (fontes, grão de papel, eixos tipográficos). Scroll suave: lib/useSmoothScroll.ts.
 *  GSAP: ScrollTrigger, SplitText, Flip, DrawSVG e MotionPath (todos gratuitos desde o GSAP 3.13).
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ═══════════════ 1. FONTE VARIÁVEL REATIVA AO CURSOR ═══════════════
   @tech Fonte variável reativa ao cursor
   Cada letra é um <span data-ch>. A cada frame (gsap.ticker) medimos a distância do CENTRO de cada letra até o
   ponteiro, convertemos em t ∈ [0,1] (1 = em cima do cursor; raio = 42% da largura da palavra) e suavizamos com
   smoothstep (t²(3−2t)). Esse valor "e" mapeia 4 EIXOS da Fraunces escritos em `font-variation-settings`:
   wght 120→900, opsz 9→144 (tamanho óptico), SOFT 0→100 (arredondamento) e WONK 0/1 (formas alternativas).
   Uma única fonte variável = infinitos pesos sem baixar arquivos extras. `aria-label` no <h1> + `aria-hidden` nas
   letras mantêm o texto legível para leitores de tela. */
function ProximityWord({ text }: { text: string }) {
  const root = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = root.current!
    const letters = [...el.querySelectorAll<HTMLElement>('[data-ch]')]
    let mx = -9999
    let my = -9999
    let lastMove = -Infinity
    const radius = () => Math.max(220, el.getBoundingClientRect().width * 0.42)

    const tick = (time: number) => {
      const box = el.getBoundingClientRect()
      const real = performance.now() - lastMove < 2500
      // @tech Ponteiro virtual em telas de toque
      // Sem movimento de ponteiro nos últimos 2,5 s (ou sem mouse, como no celular) o "cursor" passa a ser uma
      // senoide que varre a largura da palavra: `box.left + (sin(t·0,7)·0,5 + 0,5)·box.width`.
      // sem ponteiro recente → varredura automática
      const px = real ? mx : box.left + (Math.sin(time * 0.7) * 0.5 + 0.5) * box.width
      const py = real ? my : box.top + box.height * 0.5
      const R = radius()
      for (const l of letters) {
        const r = l.getBoundingClientRect()
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2))
        const t = Math.max(0, 1 - d / R)
        const e = t * t * (3 - 2 * t)
        l.style.fontVariationSettings = `"wght" ${Math.round(120 + 780 * e)}, "opsz" ${Math.round(9 + 135 * e)}, "SOFT" ${Math.round(100 * e)}, "WONK" ${e > 0.45 ? 1 : 0}`
      }
    }
    // @tech Loops no gsap.ticker
    // Efeitos contínuos (proximidade das letras, lente do cartaz, impulso do marquee) assinam o MESMO ticker do
    // GSAP em vez de abrir um requestAnimationFrame cada: um relógio só, ordem previsível, e `ticker.remove` no
    // cleanup garante que nada continue rodando depois de sair da página.
    gsap.ticker.add(tick)

    const move = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      lastMove = performance.now()
    }
    addEventListener('pointermove', move, { passive: true })
    return () => {
      gsap.ticker.remove(tick)
      removeEventListener('pointermove', move)
    }
  }, [])

  return (
    <h1 ref={root} className="tipo-prox" data-spot="tipo-prox" aria-label={text}>
      {[...text].map((c, i) => (
        <span key={i} data-ch aria-hidden>
          {c}
        </span>
      ))}
    </h1>
  )
}

/* ═══════════════ DADOS ═══════════════ */
const specimens = [
  { n: '01', name: 'Fraunces', kind: 'Serifa variável', glyph: 'Ag', ff: "'Fraunces Variable'", fvs: '"SOFT" 100, "WONK" 1, "opsz" 144', note: 'Quatro eixos num só arquivo: peso, tamanho óptico, suavidade e “wonk”.', fw: 600, bg: '#efe9dd', fg: '#141210' },
  { n: '02', name: 'Inter', kind: 'Sans variável', glyph: 'Rg', ff: "'Inter Variable'", fvs: '"opsz" 32', note: 'Desenhada para telas. O eixo de tamanho óptico ajusta o desenho conforme o corpo.', fw: 700, bg: '#ff4d1c', fg: '#141210' },
  { n: '03', name: 'JetBrains Mono', kind: 'Monoespaçada', glyph: '{ }', ff: "'JetBrains Mono Variable'", fvs: 'normal', note: 'Largura fixa, ligaduras para código e leitura sem fadiga.', fw: 500, bg: '#141210', fg: '#efe9dd' },
  { n: '04', name: 'Unbounded', kind: 'Display arredondada', glyph: 'Zq', ff: "'Unbounded Variable'", fvs: 'normal', note: 'Larga, geométrica e feita para títulos de impacto. Peso de 200 a 900.', fw: 800, bg: '#c8b6ff', fg: '#141210' },
  { n: '05', name: 'Instrument Serif', kind: 'Itálico editorial', glyph: '&', ff: "'Instrument Serif'", fvs: 'normal', italic: true, note: 'Condensada, elegante, perfeita para destaques dentro de textos longos.', fw: 400, bg: '#ffd23f', fg: '#141210' },
] as const

const articles = [
  { id: 1, title: 'A ascensão das fontes variáveis', cat: 'Serifa', hue: 18 },
  { id: 2, title: 'Kerning é uma forma de respeito', cat: 'Sans', hue: 200 },
  { id: 3, title: 'O fim do Lorem Ipsum', cat: 'Display', hue: 280 },
  { id: 4, title: 'Tipografia fluida com clamp()', cat: 'Sans', hue: 150 },
  { id: 5, title: 'Optical size, explicado', cat: 'Serifa', hue: 40 },
  { id: 6, title: 'Monoespaçadas e a cultura do código', cat: 'Mono', hue: 340 },
  { id: 7, title: 'Cartazes que gritam', cat: 'Display', hue: 8 },
  { id: 8, title: 'Ligaduras e alternativas contextuais', cat: 'Mono', hue: 230 },
] as const
const cats = ['Todas', 'Serifa', 'Sans', 'Display', 'Mono'] as const

export default function Tipo() {
  useSmoothScroll()

  const root = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const poster = useRef<HTMLElement>(null)
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<(typeof cats)[number]>('Todas')

  /* ═══════════════ TODA A COREOGRAFIA GSAP ═══════════════
     @tech gsap.context + cleanup
     `gsap.context(fn, scope)` registra TUDO que for criado dentro de `fn` (tweens, ScrollTriggers, SplitTexts,
     matchMedia). `ctx.revert()` no cleanup desfaz tudo de uma vez — o React StrictMode monta o efeito duas vezes em
     desenvolvimento, e sem isso cada montagem deixaria triggers duplicados. O `scope` (root) limita seletores
     em string ('.tipo-progress') aos descendentes desta página. */
  useEffect(() => {
    const ctx = gsap.context(() => {
      // @tech ScrollTrigger scrub (barra de leitura)
      // `scrub: 0.3` liga o progresso do tween ao do scroll (com 0,3 s de suavização): a barra `.tipo-progress`
      // vai de scaleX 0 a 1 conforme a página inteira é lida (trigger = raiz, de 'top top' a 'bottom bottom').
      // 2. Barra de leitura
      gsap.to('.tipo-progress', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
      })

      // @tech SplitText por linhas com máscara + autoSplit
      // `type: 'lines', mask: 'lines'` divide o título em LINHAS (as quebras reais, depois do layout) e põe cada uma
      // numa máscara; `autoSplit: true` refaz o split sozinho quando a janela muda de tamanho ou a fonte termina de
      // carregar (senão as linhas ficariam erradas). A animação mora em `onSplit` para ser recriada a cada re-split.
      // 3. Títulos: linhas sobem de dentro de máscaras. autoSplit refaz o split em resize/fontes
      gsap.utils.toArray<HTMLElement>('.tipo-reveal').forEach((el) => {
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            }),
        })
      })

      // @tech Texto que acende com o scroll
      // SplitText por PALAVRAS + `fromTo(opacity .12 → 1)` com `stagger` e `scrub: true`: o stagger distribui as
      // palavras ao longo do trecho de scroll (de 'top 70%' a 'bottom 55%'), então o parágrafo "acende" na velocidade
      // em que você lê/rola — e apaga se você rolar de volta.
      // 4. Manifesto: palavras acendem conforme o scroll (scrub)
      const manifesto = SplitText.create('.tipo-manifesto__text', { type: 'words' })
      gsap.fromTo(
        manifesto.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: { trigger: '.tipo-manifesto', start: 'top 70%', end: 'bottom 55%', scrub: true },
        },
      )
      // @tech Marca-texto animado
      // Cada <mark> ganha um ScrollTrigger só para alternar a classe `is-on` (`onToggle`); o CSS (tipo.css
      // `mark.is-on`) transiciona `background-size` de 0 a 100%, simulando um marca-texto passando sobre a palavra.
      gsap.utils.toArray<HTMLElement>('.tipo-manifesto mark').forEach((m) =>
        ScrollTrigger.create({ trigger: m, start: 'top 62%', onToggle: (s) => m.classList.toggle('is-on', s.isActive || s.progress === 1) }),
      )

      // @tech Scroll horizontal “pinado”
      // `pin: true` congela a seção na tela enquanto o scroll vertical continua; `scrub: 0.7` liga o progresso do
      // scroll ao tween `x: -dist()` da faixa de cartões (que desliza para a esquerda). `end: () => '+=' + dist()`
      // faz o trecho de scroll ter EXATAMENTE a largura a percorrer; `invalidateOnRefresh` recalcula `dist()` ao
      // redimensionar; `anticipatePin` evita o "tranco" na hora de grudar. O contador "01 / 05" sai de `onUpdate`.
      // 5. Scroll horizontal "pinado" + parallax interno via containerAnimation
      // @tech gsap.matchMedia
      // `gsap.matchMedia().add('(min-width: 900px)', fn)` só cria a coreografia pinada em telas largas e a REVERTE
      // automaticamente quando a condição deixa de valer; no mobile a seção vira uma lista vertical normal (CSS).
      const mm = gsap.matchMedia()
      mm.add('(min-width: 900px)', () => {
        const t = track.current!
        const dist = () => t.scrollWidth - innerWidth
        const counter = root.current!.querySelector<HTMLElement>('.tipo-hscroll__count')!
        const slide = gsap.to(t, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: pin.current,
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            end: () => '+=' + dist(),
            onUpdate: (self) => {
              counter.textContent = String(Math.min(specimens.length, Math.floor(self.progress * specimens.length) + 1)).padStart(2, '0')
            },
          },
        })
        // @tech containerAnimation (parallax interno)
        // Dentro de uma animação HORIZONTAL o "scroll" do trigger não é o da página: `containerAnimation: slide`
        // diz ao ScrollTrigger para medir `start: 'left right'` → `end: 'right left'` em relação ao movimento do
        // tween `slide`. Assim cada glifo gigante desliza (±18%) e gira (±7°) numa velocidade própria enquanto o
        // cartão atravessa a tela — parallax interno ao carrossel.
        gsap.utils.toArray<HTMLElement>('.tipo-spec__glyph').forEach((g) => {
          gsap.fromTo(
            g,
            { xPercent: 18, rotate: -7 },
            {
              xPercent: -18,
              rotate: 7,
              ease: 'none',
              scrollTrigger: { trigger: g.closest('.tipo-spec'), containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
            },
          )
        })
      })
      // (matchMedia dentro do context é revertido junto, mas deixamos explícito)
      const stopMM = () => mm.revert()

      // 6. Citação: traço SVG se desenha com o scroll e uma "caneta" segue o caminho (MotionPath)
      const swash = root.current!.querySelector<SVGPathElement>('.tipo-swash path')!
      const swashTrigger = { trigger: '.tipo-quote', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 }
      // @tech DrawSVGPlugin
      // `drawSVG: '0%' → '100%'` anima `stroke-dasharray/offset` do <path> até o traço se "desenhar" sozinho.
      // Ligado ao scroll pelo MESMO objeto `swashTrigger` da caneta (abaixo): os dois andam sincronizados.
      gsap.fromTo(swash, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: swashTrigger })
      // @tech MotionPathPlugin
      // `motionPath: { path: swash, align: swash, autoRotate: true }` leva o elemento `.tipo-pen` ao longo da curva
      // do SVG, alinhado a ela e girando para acompanhar a tangente: a "caneta" parece escrever o traço.
      gsap.to('.tipo-pen', {
        ease: 'none',
        motionPath: { path: swash, align: swash, alignOrigin: [0.5, 0.5], autoRotate: true },
        scrollTrigger: swashTrigger,
      })

      // @tech Marquee com impulso de velocidade
      // O loop é um tween infinito (`xPercent: -50, repeat: -1`). `ScrollTrigger.onUpdate` lê
      // `self.getVelocity()` e grava um "boost"; a cada frame o boost decai (×0,94) e `loop.timeScale(dir·(1+boost))`
      // acelera/inverte o marquee conforme a direção do scroll — e volta suavemente à velocidade base.
      // 7. Marquee do rodapé: velocidade reage ao scroll
      const loop = gsap.to('.tipo-foot__track', { xPercent: -50, ease: 'none', duration: 28, repeat: -1 })
      let boost = 0
      let dir = 1
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          boost = Math.min(Math.abs(self.getVelocity()) / 260, 8)
          dir = self.direction
        },
      })
      // a cada frame o "impulso" do scroll decai suavemente de volta à velocidade base
      const decay = () => {
        boost *= 0.94
        loop.timeScale(dir * (1 + boost))
      }
      gsap.ticker.add(decay)
      return () => {
        gsap.ticker.remove(decay)
        stopMM()
      }
    }, root)

    return () => ctx.revert()
  }, [])

  /* ═══════════════ FLIP: o mesmo DOM se reorganiza com animação ═══════════════
     @tech GSAP Flip
     FLIP = First, Last, Invert, Play. (1) `Flip.getState('.tipo-item')` fotografa posição/tamanho ANTES; (2) `change()`
     muda o estado do React (grade↔lista ou filtro) e `flushSync` força o DOM a refletir isso AGORA; (3) `Flip.from`
     compara com a foto, aplica a transformação inversa e anima até a posição nova. Resultado: os MESMOS elementos
     deslizam para o novo layout (sem remontar). `absolute: true` evita saltos de layout durante a animação;
     `onEnter/onLeave` animam itens que aparecem/somem por causa do filtro. */
  const flip = (change: () => void) => {
    const state = Flip.getState('.tipo-item')
    flushSync(change)
    Flip.from(state, {
      duration: 0.9,
      ease: 'expo.inOut',
      absolute: true,
      stagger: 0.035,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.7, delay: 0.25 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.7, duration: 0.45 }),
    })
  }

  /* ═══════════════ LENTE: 2ª camada de texto revelada por clip-path que segue o mouse ═══════════════
     @tech Lente com clip-path
     O cartaz tem DUAS camadas de texto empilhadas (uma preta, outra laranja); a de cima só aparece dentro de
     `clip-path: circle(var(--r) at var(--x) var(--y))` (tipo.css `.tipo-poster__lens`). Aqui, a cada frame do ticker,
     posição e raio são suavizados por lerp (0,14 / 0,12) e gravados como CSS vars — o CSS desenha o círculo.
     `pointerenter/leave` só mudam o raio ALVO (190px ↔ 0), então a lente "abre" e "fecha" com inércia. */
  useEffect(() => {
    const el = poster.current!
    let x = innerWidth / 2
    let y = 200
    let cx = x
    let cy = y
    let r = 0
    let tr = 0
    const move = (e: PointerEvent) => {
      const b = el.getBoundingClientRect()
      x = e.clientX - b.left
      y = e.clientY - b.top
    }
    const enter = () => (tr = 190)
    const leave = () => (tr = 0)
    const tick = () => {
      cx += (x - cx) * 0.14
      cy += (y - cy) * 0.14
      r += (tr - r) * 0.12
      el.style.setProperty('--x', `${cx}px`)
      el.style.setProperty('--y', `${cy}px`)
      el.style.setProperty('--r', `${r}px`)
    }
    gsap.ticker.add(tick)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    return () => {
      gsap.ticker.remove(tick)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div ref={root} className="tipo" data-spot-page data-spot="tipo-page">
      <title>Atlas — Tipo</title>
      <div className="tipo-progress" data-spot="tipo-progress" aria-hidden />

      <header className="tipo-mast">
        <span>TIPO</span>
        <span>Revista de tipografia digital</span>
        <span>Nº 03 · Outono 2026</span>
      </header>

      {/* ───── HERO ───── */}
      <section className="tipo-hero">
        <p className="tipo-mono">↳ passe o cursor sobre a palavra</p>
        <ProximityWord text="Letra" />
        <div className="tipo-hero__foot">
          <p className="tipo-lede">
            Uma única fonte variável, quatro eixos, infinitas formas. Cada letra mede a distância até o seu cursor e
            muda de <em>peso</em>, <em>tamanho óptico</em> e <em>suavidade</em> em tempo real.
          </p>
          {/* @tech Texto circular com textPath
              O texto do selo segue o contorno de um círculo definido em <defs> (`<textPath href="#tipo-circle">`).
              Um `rotate` contínuo (CSS, tipo.css `.tipo-badge`) o faz girar. É SVG puro: escala sem perder nitidez. */}
          <svg className="tipo-badge" data-spot="tipo-badge" viewBox="0 0 200 200" aria-hidden>
            <defs>
              <path id="tipo-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
            </defs>
            <text>
              <textPath href="#tipo-circle">VARIABLE FONTS ✺ FLUID TYPE ✺ OPTICAL SIZE ✺ </textPath>
            </text>
            <circle cx="100" cy="100" r="14" />
          </svg>
        </div>
      </section>

      {/* ───── MANIFESTO ───── */}
      <section className="tipo-manifesto" data-spot="tipo-manifesto">
        <p className="tipo-mono">01 — Manifesto</p>
        <p className="tipo-manifesto__text">
          A tipografia é a <mark>voz</mark> que a página usa para falar. Ela decide se um texto sussurra ou grita, se
          parece <mark>antigo</mark> ou do futuro. Quando a fonte é <mark>variável</mark>, essa voz ganha um volume
          contínuo — e o design deixa de escolher entre estilos para passar a <mark>interpolar</mark> entre eles.
        </p>
      </section>

      {/* ───── SCROLL HORIZONTAL ───── */}
      <section ref={pin} className="tipo-hscroll" data-spot="tipo-hscroll">
        <div className="tipo-hscroll__bar">
          <span className="tipo-mono">02 — Cinco vozes</span>
          <span className="tipo-mono">
            <b className="tipo-hscroll__count">01</b> / 05
          </span>
        </div>
        <div ref={track} className="tipo-hscroll__track">
          <div className="tipo-spec tipo-spec--intro">
            <h2 className="tipo-reveal">Cinco vozes, <em>cinco famílias.</em></h2>
            <p>Role. A página desliza para o lado enquanto o scroll vertical é “pinado”.</p>
          </div>
          {specimens.map((s) => (
            <article
              key={s.n}
              className="tipo-spec"
              style={{ '--bg': s.bg, '--fg': s.fg, '--ff': s.ff, '--fvs': s.fvs, '--fw': s.fw, fontStyle: 'italic' in s ? 'italic' : 'normal' } as CSSProperties}
            >
              <span className="tipo-spec__n">{s.n}</span>
              <div className="tipo-spec__glyph" aria-hidden>
                {s.glyph}
              </div>
              <div className="tipo-spec__meta">
                <h3>{s.name}</h3>
                <p className="tipo-mono">{s.kind}</p>
                <p>{s.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ───── CITAÇÃO + SVG DRAW ───── */}
      <section className="tipo-quote" data-spot="tipo-quote">
        <p className="tipo-mono">03 — Traço</p>
        <blockquote className="tipo-reveal">“Escrever é desenhar o pensamento, uma letra de cada vez.”</blockquote>
        <svg className="tipo-swash" viewBox="0 0 1000 220" preserveAspectRatio="xMidYMid meet" aria-hidden>
          <path d="M 20 150 C 140 20, 230 30, 290 120 S 400 210, 500 110 S 640 10, 720 100 S 850 200, 980 70" />
          <g className="tipo-pen">
            <path d="M -14 -8 L 14 0 L -14 8 L -8 0 Z" />
          </g>
        </svg>
      </section>

      {/* ───── ÍNDICE com FLIP ───── */}
      <section className="tipo-index" data-spot="tipo-index">
        <div className="tipo-index__head">
          <div>
            <p className="tipo-mono">04 — Acervo</p>
            <h2 className="tipo-reveal">Matérias, reorganizadas ao vivo.</h2>
          </div>
          <div className="tipo-ctrl">
            <div className="tipo-chips" role="group" aria-label="Filtrar por categoria">
              {cats.map((c) => (
                <button key={c} type="button" aria-pressed={filter === c} onClick={() => flip(() => setFilter(c))}>
                  {c}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="tipo-toggle"
              onClick={() => flip(() => setLayout((l) => (l === 'grid' ? 'list' : 'grid')))}
            >
              {layout === 'grid' ? '▤ Lista' : '▦ Grade'}
            </button>
          </div>
        </div>

        <ul className={`tipo-items tipo-items--${layout}`}>
          {articles.map((a) => (
            <li
              key={a.id}
              className="tipo-item"
              data-flip-id={`a${a.id}`}
              hidden={filter !== 'Todas' && a.cat !== filter}
              style={{ '--h': a.hue } as CSSProperties}
            >
              <div className="tipo-item__cover" aria-hidden>
                <span>{a.title[0]}</span>
              </div>
              <div className="tipo-item__txt">
                <small className="tipo-mono">
                  {String(a.id).padStart(2, '0')} · {a.cat}
                </small>
                <h3>{a.title}</h3>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ───── CARTAZ COM LENTE ───── */}
      <section ref={poster} className="tipo-poster" data-spot="tipo-poster" data-cursor-label="lente">
        <p className="tipo-mono tipo-poster__hint">05 — Lente · mova o mouse</p>
        <div className="tipo-poster__layer tipo-poster__base" aria-hidden>
          ESCREVA<br />COM<br />FORMA
        </div>
        <div className="tipo-poster__layer tipo-poster__lens" aria-hidden>
          ESCREVA<br />COM<br />FORMA
        </div>
        <h2 className="sr-only">Escreva com forma</h2>
      </section>

      <footer className="tipo-foot" data-spot="tipo-foot">
        <div className="tipo-foot__track" aria-hidden>
          {[0, 1].map((k) => (
            <span key={k}>
              Tipografia ✺ Ritmo ✺ Contraste ✺ Hierarquia ✺ Espaço ✺ Voz ✺{' '}
            </span>
          ))}
        </div>
        <p className="tipo-mono">Composto em Fraunces, Inter, JetBrains Mono, Unbounded e Instrument Serif.</p>
      </footer>
    </div>
  )
}
