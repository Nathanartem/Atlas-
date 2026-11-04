/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  01 · LUMEN — landing page com shader em tempo real (rota "/")
 * ═══════════════════════════════════════════════════════════════════════════
 *  Estrutura (ordem de cima para baixo na tela)
 *   Hero ........ shader WebGL2 de fundo (ShaderCanvas.tsx) + título "ATLAS" (SplitText) + botões magnéticos
 *   Marquee ..... faixa de texto cuja velocidade/inclinação reage ao scroll
 *   Numbers ..... 4 contadores animados (valores calculados a partir dos dados do site)
 *   Worlds ...... grade "bento" com um card por página (pages.ts) — tilt 3D + spotlight
 *   Stack ....... cards que se empilham com `position: sticky`
 *   Footer ...... chamada final
 *
 *  Onde está o quê:  ShaderCanvas.tsx (WebGL2) · lumen.css (visual) · components/Magnetic.tsx
 *  Bibliotecas: GSAP (SplitText), Motion (useScroll/useSpring/animate), Lenis (scroll suave via lib/useSmoothScroll.ts)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import '@fontsource-variable/bricolage-grotesque/wdth.css'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/instrument-serif/400.css'

import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Magnetic } from '../../components/Magnetic.tsx'
import { pages } from '../../data/pages.ts'
import { totalTechniques } from '../../data/techniques.ts'
import { scrollToTarget, useSmoothScroll } from '../../lib/useSmoothScroll.ts'
import { ShaderCanvas } from './ShaderCanvas.tsx'
import './lumen.css'

gsap.registerPlugin(SplitText)

/* ───────────────────────── HERO ───────────────────────── */
function Hero() {
  const root = useRef<HTMLElement>(null)
  // @tech Parallax do hero com useScroll/useTransform
  // `useScroll({ target, offset })` devolve o progresso 0→1 do scroll DENTRO da seção (do topo dela até ela
  // sair da tela). `useTransform` mapeia esse número em valores de estilo: o título desce 28%, o shader
  // dá zoom de 1→1,25× e o conteúdo some. Tudo são MotionValues → o Motion escreve no DOM sem re-render.
  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] })
  const titleY = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const shaderScale = useTransform(scrollYProgress, [0, 1], [1, 1.25])

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let ctx: gsap.Context | undefined
    // Mesmo motivo do shader: o StrictMode não chega a pintar a primeira passagem.
    const id = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
      // @tech GSAP SplitText com máscara por caractere
      // `SplitText.create(el, { type: 'chars', mask: 'chars' })` envolve CADA letra num span com
      // `overflow: clip`; animar `yPercent: 115` faz a letra subir "de dentro de um buraco" em vez de só
      // aparecer. `aria: 'auto'` mantém o texto acessível a leitores de tela. O stagger de 0,06 s cria a onda.
      // Letras sobem de dentro de uma máscara (overflow: clip) com leve rotação
      const title = SplitText.create('.lumen-title', { type: 'chars', mask: 'chars', aria: 'auto' })
      gsap.set('.lumen-title', { opacity: 1 })
      gsap.from(title.chars, { yPercent: 115, rotate: 9, duration: 1.4, ease: 'expo.out', stagger: 0.06, delay: 0.15 })

      // @tech Blur reveal por palavra
      // Mesma ideia, `type: 'words'`: cada palavra entra de opacity 0 / y 18 / `filter: blur(10px)` para nítida,
      // com stagger curto (0,045 s) — o texto "entra em foco" como uma lente ajustando.
      // Subtítulo palavra-a-palavra com blur
      const sub = SplitText.create('.lumen-sub', { type: 'words', aria: 'auto' })
      gsap.set('.lumen-sub', { opacity: 1 })
      gsap.from(sub.words, {
        opacity: 0,
        y: 18,
        filter: 'blur(10px)',
        duration: 1,
        ease: 'power3.out',
        stagger: 0.045,
        delay: 0.7,
      })
      gsap.set('.lumen-reveal', { opacity: 1 })
      gsap.from('.lumen-reveal', { opacity: 0, y: 22, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 1.1 })
      })
    })
    return () => {
      cancelAnimationFrame(id)
      ctx?.revert()
    }
  }, [])

  return (
    <section ref={root} className="lumen-hero" data-spot="lumen-hero">
      <motion.div className="lumen-hero__shader" data-spot="lumen-shader" style={{ scale: shaderScale }}>
        <ShaderCanvas className="lumen-hero__canvas" />
      </motion.div>
      <div className="lumen-hero__shade" />

      <motion.div className="lumen-hero__content" style={{ y: titleY, opacity: fade }}>
        <p className="lumen-chip lumen-reveal">
          <i /> base viva · {pages.length} páginas · {totalTechniques} técnicas catalogadas
        </p>
        <h1 className="lumen-title" data-spot="lumen-title">ATLAS</h1>
        <p className="lumen-sub" data-spot="lumen-sub">
          Um laboratório de front-end moderno: cada página é um mundo diferente, construído para você
          explorar, copiar e dizer <em>“quero esta técnica”.</em>
        </p>
        <div className="lumen-cta lumen-reveal" data-spot="lumen-cta">
          <Magnetic>
            <button
              type="button"
              className="lumen-btn lumen-btn--solid"
              onClick={() => scrollToTarget('#mundos')}
            >
              Explorar os mundos <span aria-hidden>↓</span>
            </button>
          </Magnetic>
          <Magnetic>
            <Link to="/orbit" viewTransition className="lumen-btn lumen-btn--ghost">
              Ir direto ao 3D
            </Link>
          </Magnetic>
        </div>
      </motion.div>

      <div className="lumen-hero__scroll lumen-reveal" aria-hidden>
        <span />
        scroll
      </div>
    </section>
  )
}

/* ───────────────────── MARQUEE com velocidade de scroll ───────────────────── */
const wrap = (min: number, max: number, v: number) => {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}

// @tech Marquee guiada pela velocidade do scroll
// Cadeia de MotionValues: scrollY → useVelocity (px/s) → useSpring (suaviza) → `factor` (acelera/inverte) e
// `skew` (inclina até ±9°). A cada frame (`useAnimationFrame`) o deslocamento base é somado ao impulso do
// scroll; rolar para cima inverte o sentido. O conteúdo é DUPLICADO e `wrap(-50, 0, v)` volta ao início ao
// chegar a 50% — loop perfeito sem "pulo".
function Marquee({ items, base = -1.6 }: { items: string[]; base?: number }) {
  const x = useMotionValue(0)
  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 })
  const factor = useTransform(smooth, [0, 1000], [0, 5], { clamp: false })
  const skew = useTransform(smooth, [-2000, 0, 2000], [-9, 0, 9], { clamp: true })
  const dir = useRef(base < 0 ? -1 : 1)

  // o conteúdo é duplicado: deslocar 50% = loop perfeito
  const pct = useTransform(x, (v) => `${wrap(-50, 0, v)}%`)

  useAnimationFrame((_, delta) => {
    let move = dir.current * Math.abs(base) * (delta / 1000)
    const f = factor.get()
    if (f < 0) dir.current = -1
    else if (f > 0) dir.current = 1
    move += dir.current * move * f
    x.set(x.get() + move)
  })

  const row = (
    <div className="lumen-marquee__row">
      {items.map((t, i) => (
        <span key={t + i}>
          {t}
          <b aria-hidden>✦</b>
        </span>
      ))}
    </div>
  )

  return (
    <div className="lumen-marquee" aria-hidden data-spot="lumen-marquee">
      <motion.div className="lumen-marquee__track" style={{ x: pct, skewX: skew }}>
        {row}
        {row}
      </motion.div>
    </div>
  )
}

/* ───────────────────── NÚMEROS (count-up quando entra na tela) ───────────────────── */
// @tech Contadores animados em viewport
// `useInView(ref, { once: true })` dispara quando o número entra na tela (20% antes da borda). Aí `animate(0, to)`
// do Motion interpola e, em `onUpdate`, escreve `textContent` DIRETO no nó — 60 atualizações/s sem nenhum re-render.
// O cleanup chama `controls.stop()` (seguro com StrictMode).
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })

  useEffect(() => {
    if (!inView) return
    const node = ref.current!
    const controls = animate(0, to, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = Math.round(v).toString() + suffix),
    })
    return () => controls.stop()
  }, [inView, to, suffix])

  return <span ref={ref}>0{suffix}</span>
}

function Numbers() {
  const stats = [
    { n: pages.length, label: 'mundos distintos', note: 'cada rota com identidade própria' },
    { n: totalTechniques, label: 'técnicas catalogadas', note: 'abra “{ } Técnicas” em qualquer página' },
    { n: 0, label: 'imagens raster', note: 'tudo é código: CSS, SVG, canvas e GLSL' },
    { n: pages.length, label: 'chunks por rota', note: 'code-splitting: você só baixa o que visita' },
  ]
  return (
    <section className="lumen-numbers" data-spot="lumen-numbers">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <strong>
            <Counter to={s.n} />
          </strong>
          <span>{s.label}</span>
          <small>{s.note}</small>
        </motion.div>
      ))}
    </section>
  )
}

/* ───────────────────── CARDS: tilt 3D + spotlight que segue o mouse ───────────────────── */
// @tech Cards com tilt 3D + spotlight
// Duas camadas independentes: (1) TILT — o ponteiro vira x,y em [0,1] (MotionValues → springs) e `useTransform`
// converte em rotateX/rotateY de ±7°/±9° com `transformPerspective`; (2) SPOTLIGHT — o mesmo ponteiro grava as
// custom properties `--mx/--my` no elemento e o CSS (lumen.css `a::before`) desenha um `radial-gradient` ali.
// A cor do card vem de UMA variável `--accent` (page.accent); o resto é `color-mix()` no CSS.
function WorldCard({ page, className }: { page: (typeof pages)[number]; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const sx = useSpring(px, { stiffness: 160, damping: 18 })
  const sy = useSpring(py, { stiffness: 160, damping: 18 })
  const rotateX = useTransform(sy, [0, 1], [7, -7])
  const rotateY = useTransform(sx, [0, 1], [-9, 9])

  return (
    <motion.div
      className={`lumen-card ${className ?? ''}`}
      style={{ '--accent': page.accent, rotateX, rotateY, transformPerspective: 1000 } as React.CSSProperties}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8%' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        ref={ref}
        to={page.path}
        viewTransition
        data-cursor
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width
          const y = (e.clientY - r.top) / r.height
          px.set(x)
          py.set(y)
          // CSS custom properties → o gradiente do spotlight é desenhado só pelo CSS
          e.currentTarget.style.setProperty('--mx', `${x * 100}%`)
          e.currentTarget.style.setProperty('--my', `${y * 100}%`)
        }}
        onPointerLeave={() => {
          px.set(0.5)
          py.set(0.5)
        }}
      >
        <span className={`lumen-card__art lumen-art--${page.id}`} aria-hidden />
        <span className="lumen-card__num">{page.number}</span>
        <h3>{page.name}</h3>
        <p className="lumen-card__tag">{page.tagline}</p>
        <p className="lumen-card__sum">{page.summary}</p>
        <ul>
          {page.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <span className="lumen-card__go" aria-hidden>
          ↗
        </span>
      </Link>
    </motion.div>
  )
}

/** "nove", "dez"… por extenso para o título (a lista de páginas cresce; o texto acompanha). */
const NUMBER_WORDS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']

function Worlds() {
  // Padrão de spans numa grade de 6 colunas: 4+2 · 2+2+2 · 3+3 · 2+4 → exatamente 9 cartões (as 9 páginas além desta).
  // Se a lista de páginas mudar de tamanho, os cartões excedentes caem no último span (2) e o grid continua válido.
  const spans = ['lumen-span-4', 'lumen-span-2', 'lumen-span-2', 'lumen-span-2', 'lumen-span-2', 'lumen-span-3', 'lumen-span-3', 'lumen-span-2', 'lumen-span-4']
  const others = pages.length - 1
  const word = NUMBER_WORDS[others] ?? String(others)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return (
    <section id="mundos" className="lumen-worlds" data-spot="lumen-worlds">
      <header>
        <p className="lumen-eyebrow">02 — Os mundos</p>
        <h2>
          {cap(word)} páginas, <em>{word} linguagens</em> visuais.
        </h2>
      </header>
      <div className="lumen-worlds__grid">
        {pages.slice(1).map((p, i) => (
          <WorldCard key={p.id} page={p} className={spans[i] ?? 'lumen-span-2'} />
        ))}
      </div>
    </section>
  )
}

/* ───────────────────── STACK: cards sticky que se empilham ───────────────────── */
const stack = [
  {
    title: 'Build & linguagem',
    color: '#8b5cf6',
    items: ['Vite 8 (Rolldown)', 'React 19.3', 'TypeScript 7 (nativo)', 'Oxlint', 'React Router 8 + View Transitions'],
    text: 'Toolchain baseada em Rust/Go: builds e checagem de tipos em uma fração do tempo. Rotas em code-splitting.',
  },
  {
    title: 'Gráficos & 3D',
    color: '#06b6d4',
    items: ['WebGL2 puro', 'Three.js 0.186', 'React Three Fiber 9', 'drei 10', 'postprocessing'],
    text: 'Do shader mínimo de 100 linhas à cena completa com vidro de transmissão, bloom e partículas na GPU.',
  },
  {
    title: 'Animação & interação',
    color: '#ec4899',
    items: ['Motion 14', 'GSAP 3.15 (ScrollTrigger, SplitText, Flip, DrawSVG)', 'Lenis', 'Matter.js'],
    text: 'Springs, layout animations, timelines com scrub, scroll suave sincronizado e física 2D de verdade.',
  },
  {
    title: 'Estado, dados & estilo',
    color: '#10b981',
    items: ['Zustand 5', 'TanStack Virtual', 'd3-shape / d3-scale', 'Tailwind CSS 4.3', 'CSS moderno nativo'],
    text: 'Store fora do React, listas com 50 mil linhas virtualizadas, gráficos SVG sob medida e CSS-first.',
  },
]

// @tech Cards empilhados com sticky
// Cada card fica dentro de um wrapper `position: sticky` com `top` crescente (14vh + 28px·i), então os
// cards "grudam" um pouco abaixo do anterior formando uma pilha. `useScroll({ target: box })` dá o progresso
// do bloco todo; em StackCard, `useTransform` encolhe o card (scale) e escurece (`dim`) conforme os
// seguintes chegam por cima.
function Stack() {
  const box = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: box, offset: ['start start', 'end end'] })

  return (
    <section className="lumen-stack" data-spot="lumen-stack">
      <header>
        <p className="lumen-eyebrow">03 — A stack</p>
        <h2>
          O que está <em>por baixo</em>.
        </h2>
      </header>
      <div ref={box} className="lumen-stack__box">
        {stack.map((s, i) => (
          <StackCard key={s.title} s={s} i={i} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  )
}

function StackCard({
  s,
  i,
  progress,
}: {
  s: (typeof stack)[number]
  i: number
  progress: ReturnType<typeof useScroll>['scrollYProgress']
}) {
  const n = stack.length
  const scale = useTransform(progress, [i / n, 1], [1, 1 - (n - 1 - i) * 0.06])
  const dim = useTransform(progress, [i / n, (i + 1) / n], [0, i === n - 1 ? 0 : 0.55])

  return (
    <div className="lumen-stack__sticky" style={{ top: `calc(14vh + ${i * 28}px)` }}>
      <motion.article className="lumen-stack__card" style={{ scale, '--c': s.color } as never}>
        <motion.span className="lumen-stack__dim" style={{ opacity: dim }} />
        <span className="lumen-stack__n">0{i + 1}</span>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
        <ul>
          {s.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      </motion.article>
    </div>
  )
}

/* ───────────────────── FOOTER ───────────────────── */
function Footer() {
  return (
    <footer className="lumen-footer">
      <p className="lumen-eyebrow">04 — E agora?</p>
      <h2>
        Escolha uma técnica. <em>Peça pelo nome.</em>
      </h2>
      <p>
        Cada página tem o botão <code>{'{ } Técnicas'}</code> no canto superior direito — o catálogo
        completo também está em <code>TECHNIQUES.md</code>.
      </p>
      <Magnetic>
        <button
          type="button"
          className="lumen-btn lumen-btn--solid"
          onClick={() => scrollToTarget(0, 2)}
        >
          Voltar ao topo ↑
        </button>
      </Magnetic>
    </footer>
  )
}

export default function Lumen() {
  useSmoothScroll()
  return (
    <main className="lumen" data-spot-page data-spot="lumen-page">
      <title>Atlas — Lumen</title>
      <Hero />
      <Marquee items={['WebGL2', 'View Transitions', 'Scroll-driven', 'Springs', 'GLSL', 'Container Queries', 'React 19', 'Web Audio']} />
      <Numbers />
      <Worlds />
      <Marquee base={1.4} items={['Física', 'Shaders', 'Tipografia variável', 'Anchor positioning', 'Instancing', 'Bloom', 'Virtualização']} />
      <Stack />
      <Footer />
    </main>
  )
}
