import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/unbounded/wght.css'

import { motion, useSpring } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getAnalyser, pads, unlockAudio } from './audio.ts'
import { Playground } from './Playground.tsx'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  05 · GRAVITY — física, som e brincadeira, em neo-brutalismo (rota "/gravity")
 * ═══════════════════════════════════════════════════════════════════════════
 *  Seções da página (de cima para baixo)
 *   1. Hero ........ <Playground/> (Playground.tsx): pílulas HTML + bolas em canvas movidas pelo Matter.js
 *   2. Pads ........ <Scope/> (osciloscópio) + <Pads/> (8 sons sintetizados em audio.ts)
 *   3. Adesivos .... <Stickers/>: cartões arrastáveis com inércia (Motion)
 *   4. Holo ........ <HoloCard/>: carta com tilt 3D e brilho "foil" por blend-mode
 *  Estilo: Tailwind v4 com valores arbitrários (sombras duras, bordas grossas) — ver `btn` em Playground.tsx.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ───────────────────── Osciloscópio (AnalyserNode → Canvas 2D) ─────────────────────
   @tech Osciloscópio com AnalyserNode
   `analyser.getByteTimeDomainData(buf)` copia a forma de onda atual (1024 amostras, 0–255; 128 = silêncio) e cada
   amostra vira um ponto (x = índice, y = valor) de uma polilinha no canvas. Sem áudio ativo (analyser ainda não
   criado) desenha uma onda ociosa. Um IntersectionObserver pausa o rAF fora da tela; ResizeObserver mantém o
   bitmap do canvas nítido (tamanho CSS × DPR). */
function Scope() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const g = cv.getContext('2d')!
    let raf = 0
    let visible = false
    const buf = new Uint8Array(1024)
    const dpr = Math.min(devicePixelRatio, 2)

    const resize = () => {
      cv.width = cv.clientWidth * dpr
      cv.height = cv.clientHeight * dpr
    }
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    resize()

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const w = cv.width
      const h = cv.height
      g.clearRect(0, 0, w, h)
      g.lineWidth = 4 * dpr
      g.lineJoin = 'round'
      g.strokeStyle = '#0a0a0a'
      g.beginPath()
      const an = getAnalyser()
      if (an) {
        an.getByteTimeDomainData(buf)
        for (let i = 0; i < buf.length; i++) {
          const x = (i / (buf.length - 1)) * w
          const y = (buf[i] / 255) * h
          if (i) g.lineTo(x, y)
          else g.moveTo(x, y)
        }
      } else {
        // ocioso: onda suave até o áudio ser destravado pelo primeiro toque
        const t = performance.now() / 600
        for (let x = 0; x <= w; x += 6 * dpr) {
          const y = h / 2 + Math.sin(x / (40 * dpr) + t) * h * 0.12 * Math.sin(x / (200 * dpr) + t / 3)
          if (x) g.lineTo(x, y)
          else g.moveTo(x, y)
        }
      }
      g.stroke()
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !visible) raf = requestAnimationFrame(draw)
      if (!e.isIntersecting) cancelAnimationFrame(raf)
      visible = e.isIntersecting
    })
    io.observe(cv)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} data-spot="gravity-scope" className="h-24 w-full border-[3px] border-black bg-white shadow-[6px_6px_0_#000]" aria-label="Osciloscópio do áudio" />
}

/* ───────────────────── Pads (teclado + toque) ─────────────────────
   @tech Pads jogáveis por toque e teclado
   Cada pad vem de `pads` (audio.ts) com nome, tecla e função `play`. `hit(i)` destrava o áudio (gesto do usuário),
   toca e acende o botão via `data-lit="true"` por 120 ms — o Tailwind reage com `data-[lit=true]:` (afunda e
   clareia). `pointerdown` (em vez de click) reduz a latência; o listener de teclado ignora repetição de tecla
   (`e.repeat`), atalhos com Ctrl/Meta/Alt e digitação em campos de formulário. */
function Pads() {
  const els = useRef<(HTMLButtonElement | null)[]>([])

  const hit = (i: number) => {
    unlockAudio()
    pads[i].play()
    const el = els.current[i]
    if (!el) return
    el.dataset.lit = 'true'
    setTimeout(() => (el.dataset.lit = 'false'), 120)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      const i = pads.findIndex((p) => p.key === e.key.toUpperCase())
      if (i >= 0) hit(i)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {pads.map((p, i) => (
        <button
          key={p.name}
          ref={(n) => {
            els.current[i] = n
          }}
          type="button"
          onPointerDown={() => hit(i)}
          style={{ background: p.color }}
          className="group relative aspect-[4/3] cursor-pointer border-[3px] border-black p-3 text-left font-chunk shadow-[7px_7px_0_#000] transition-[translate,box-shadow,filter] duration-100 hover:brightness-110 active:translate-x-[7px] active:translate-y-[7px] active:shadow-none data-[lit=true]:translate-x-[7px] data-[lit=true]:translate-y-[7px] data-[lit=true]:shadow-none data-[lit=true]:brightness-125"
        >
          <span className="absolute top-2.5 right-2.5 grid size-8 place-items-center border-[3px] border-black bg-white text-sm font-black">{p.key}</span>
          <span className="absolute bottom-3 left-3 text-[clamp(0.9rem,2vw,1.3rem)] font-black uppercase">{p.name}</span>
        </button>
      ))}
    </div>
  )
}

/* ───────────────────── Adesivos arrastáveis (drag + inércia do Motion) ───────────────────── */
// (as técnicas desta seção estão marcadas dentro de <Stickers/>, no <motion.article>)
const stickerPalette = ['#ffd23f', '#4d7cff', '#3ddc84', '#ffffff', '#ff8a3d', '#a56bff', '#ff6bb5']

type Note = { id: string; t: string; d: string; c: string; x: number; y: number; r: number; w: number }

const starterNotes: Note[] = [
  { id: 's1', t: 'Springs', d: 'Física de mola: rigidez, amortecimento e massa em vez de durações fixas.', c: '#ffd23f', x: 6, y: 8, r: -6, w: 260 },
  { id: 's2', t: 'Inércia', d: 'Solte com velocidade e o elemento continua deslizando até parar.', c: '#4d7cff', x: 38, y: 4, r: 4, w: 250 },
  { id: 's3', t: 'Limites elásticos', d: 'dragConstraints + dragElastic: bate na borda e volta.', c: '#3ddc84', x: 68, y: 12, r: -3, w: 250 },
  { id: 's4', t: 'Sombras duras', d: 'box-shadow sem blur + borda grossa = neo-brutalismo.', c: '#ffffff', x: 12, y: 52, r: 5, w: 270 },
  { id: 's5', t: 'Z-index dinâmico', d: 'O adesivo tocado vai para a frente da pilha.', c: '#ff8a3d', x: 46, y: 46, r: -5, w: 240 },
  { id: 's6', t: 'Pointer Events', d: 'Um único modelo para mouse, toque e caneta.', c: '#a56bff', x: 72, y: 56, r: 3, w: 240 },
]

function Stickers() {
  const board = useRef<HTMLDivElement>(null)
  const z = useRef(10)
  const [notes, setNotes] = useState(starterNotes)

  const add = () => {
    setNotes((list) => {
      const i = list.length
      return [
        ...list,
        {
          id: crypto.randomUUID(),
          t: 'Novo',
          d: '',
          c: stickerPalette[i % stickerPalette.length]!,
          x: 10 + (i % 4) * 16,
          y: 14 + (i % 3) * 18,
          r: (i % 7) - 3,
          w: 240,
        },
      ]
    })
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={add}
          className="cursor-pointer border-[3px] border-black bg-white px-4 py-2 font-chunk text-sm font-black uppercase shadow-[4px_4px_0_#000] hover:-translate-y-0.5"
        >
          + Adesivo
        </button>
      </div>
    <div
      ref={board}
      className="relative h-[780px] w-full overflow-hidden border-[3px] border-black bg-white bg-[radial-gradient(#0000002e_1.5px,transparent_1.5px)] bg-[size:22px_22px] shadow-[8px_8px_0_#000] sm:h-[620px]"
    >
      {/* @tech Drag com inércia e limites elásticos
          `drag` liga o arrasto (Pointer Events internos do Motion). `dragConstraints={board}` limita ao quadro;
          `dragElastic` deixa passar um pouco da borda e puxa de volta (borracha). `dragTransition` descreve a INÉRCIA ao
          soltar: `power` × velocidade define para onde o adesivo ainda desliza, `timeConstant` o quão rápido para, e
          `bounceStiffness/Damping` a mola de retorno ao bater no limite.
          @tech Entrada com spring (queda)
          `initial` joga o cartão 420px acima, girado e transparente; `whileInView` o leva ao lugar com uma SPRING de
          baixa amortização (damping 12) — ele "quica" ao pousar — e `delay: i·0,1` escalona a chuva de adesivos.
          @tech z-index dinâmico
          `onPointerDown` incrementa um contador (`z.current`) e grava no `zIndex` do cartão tocado: o último a ser
          pego sempre fica por cima, como papéis numa mesa. */}
      {notes.map((s, i) => (
        <motion.article
          key={s.id}
          drag
          dragConstraints={board}
          dragElastic={0.14}
          dragTransition={{ power: 0.35, timeConstant: 260, bounceStiffness: 420, bounceDamping: 20 }}
          initial={{ y: -420, rotate: s.r + 40, opacity: 0 }}
          whileInView={{ y: 0, rotate: s.r, opacity: 1 }}
          viewport={{ once: true, margin: '-12%' }}
          transition={{ type: 'spring', stiffness: 150, damping: 12, mass: 1.1, delay: Math.min(i, 6) * 0.1 }}
          whileDrag={{ scale: 1.08, rotate: 0 }}
          whileHover={{ scale: 1.03 }}
          onPointerDown={(e) => (e.currentTarget.style.zIndex = String(++z.current))}
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.w, background: s.c, maxWidth: '70%' } as CSSProperties}
          className="absolute cursor-grab touch-none border-[3px] border-black p-4 shadow-[6px_6px_0_#000] active:cursor-grabbing"
        >
          <button
            type="button"
            aria-label="Apagar adesivo"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setNotes((list) => list.filter((n) => n.id !== s.id))}
            className="absolute top-2 right-2 grid size-7 cursor-pointer place-items-center border-2 border-black bg-white text-sm leading-none font-black"
          >
            ×
          </button>
          <input
            defaultValue={s.t}
            aria-label="Título do adesivo"
            onPointerDown={(e) => e.stopPropagation()}
            className="w-[calc(100%-2.2rem)] bg-transparent font-chunk text-lg font-black uppercase outline-none"
          />
          <textarea
            defaultValue={s.d}
            rows={3}
            placeholder="Escreva aqui…"
            aria-label="Texto do adesivo"
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-2 w-full resize-none bg-transparent text-[13px] leading-snug font-medium text-black/80 outline-none placeholder:text-black/35"
          />
        </motion.article>
      ))}
      <p className="pointer-events-none absolute right-4 bottom-3 font-mono text-[11px] font-bold text-black/50">escreva no texto · arraste pelo título · × apaga</p>
    </div>
    </div>
  )
}

/* ───────────────────── Carta holográfica (tilt 3D + foil por blend-mode) ─────────────────────
   @tech Carta holográfica
   Duas ideias combinadas. (1) TILT: o ponteiro vira (px,py) em [0,1]; `useSpring` transforma em rotateX/rotateY de
   ±15° (com o pai em `perspective: 1100px`). (2) FOIL: o mesmo (px,py) vai para as CSS vars `--px/--py`, que movem um
   `repeating-linear-gradient` arco-íris gigante (`background-size: 260%`) misturado com `mix-blend-mode: color-dodge`
   sobre a textura escura — o brilho "troca de cor" conforme o ângulo, como cartas holográficas. Um brilho especular
   (`radial-gradient` + `overlay`) segue o ponteiro. Tudo atualiza sem re-render do React (springs + CSS vars). */
function HoloCard() {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useSpring(0, { stiffness: 160, damping: 16 })
  const ry = useSpring(0, { stiffness: 160, damping: 16 })

  const move = (e: React.PointerEvent) => {
    const el = ref.current!
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    ry.set((px - 0.5) * 30)
    rx.set(-(py - 0.5) * 30)
    el.style.setProperty('--px', `${px * 100}%`)
    el.style.setProperty('--py', `${py * 100}%`)
  }
  const leave = () => {
    rx.set(0)
    ry.set(0)
    ref.current?.style.setProperty('--px', '50%')
    ref.current?.style.setProperty('--py', '50%')
  }

  return (
    <div className="[perspective:1100px]" onPointerMove={move} onPointerLeave={leave}>
      <motion.div
        ref={ref}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', '--px': '50%', '--py': '50%' } as never}
        className="relative mx-auto aspect-[5/7] w-[min(340px,80vw)] overflow-hidden rounded-[22px] border-[3px] border-white bg-[#120a24] shadow-[0_40px_80px_-20px_#a56bff88]"
      >
        {/* textura do cartão */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#3b1d7a,transparent_60%),repeating-linear-gradient(45deg,#ffffff0a_0_2px,transparent_2px_10px)]" />
        {/* foil: gradiente enorme cuja posição segue o ponteiro, misturado com color-dodge */}
        <div
          className="absolute inset-0 opacity-70 mix-blend-color-dodge"
          style={{
            backgroundImage: 'repeating-linear-gradient(115deg, #ff6bb5 0%, #ffd23f 10%, #3ddc84 20%, #4d7cff 30%, #a56bff 40%, #ff6bb5 50%)',
            backgroundSize: '260% 260%',
            backgroundPosition: 'var(--px) var(--py)',
            filter: 'brightness(0.7) contrast(1.4)',
          }}
        />
        {/* brilho especular */}
        <div className="absolute inset-0 mix-blend-overlay" style={{ background: 'radial-gradient(circle at var(--px) var(--py), #fff 0%, transparent 45%)' }} />

        {/* @tech Camadas com translateZ
            O contêiner tem `transform-style: preserve-3d` (herdado do motion.div); cada bloco de texto recebe um
            `translateZ` diferente (30, 80 e 50 px). Ao inclinar a carta, as camadas se deslocam em velocidades
            distintas — parallax 3D real, só com transform. */}
        {/* conteúdo em camadas de profundidade (translateZ) */}
        <div className="absolute inset-0 grid content-between p-6 text-white [transform-style:preserve-3d]">
          <p className="font-mono text-[11px] font-bold tracking-[0.25em] [transform:translateZ(30px)]">ATLAS · LIMITED</p>
          <div className="[transform:translateZ(80px)]">
            <p className="font-chunk text-[3.2rem] leading-[0.85] font-black">PASS<br />Nº06</p>
          </div>
          <div className="flex items-end justify-between [transform:translateZ(50px)]">
            <p className="font-chunk text-xs font-bold opacity-80">holográfico<br />100% CSS</p>
            <div className="grid size-12 place-items-center rounded-full border-[3px] border-white text-xl">✦</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ───────────────────── Página ───────────────────── */
export default function Gravity() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#ffd23f] font-sans text-black" data-spot-page data-spot="gravity-page">
      <title>Atlas — Gravity</title>

      {/* HERO: playground de física */}
      <section data-spot="gravity-play" className="relative h-[100svh] min-h-[680px] overflow-hidden border-b-[3px] border-black bg-[#ffd23f] bg-[linear-gradient(#0000001a_1px,transparent_1px),linear-gradient(90deg,#0000001a_1px,transparent_1px)] bg-[size:44px_44px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 px-5 pt-16 sm:px-10 sm:pt-10">
          <p className="mb-3 inline-block border-[3px] border-black bg-white px-3 py-1 font-mono text-[11px] font-bold tracking-wider uppercase shadow-[4px_4px_0_#000]">
            05 · física · som · brincadeira
          </p>
          <h1 className="font-chunk text-[clamp(4rem,17vw,15rem)] leading-[0.82] font-black tracking-tighter text-transparent [-webkit-text-stroke:3px_#000]">
            GRAVITY
          </h1>
        </div>
        <div className="absolute inset-0 z-10">
          <Playground />
        </div>
        <p className="pointer-events-none absolute right-4 bottom-4 z-0 hidden max-w-[22ch] text-right font-mono text-[11px] font-bold text-black/60 lg:block">
          arraste as palavras · clique no vazio para confete · ligue o som
        </p>
      </section>

      {/* PADS */}
      <section data-spot="gravity-pads" className="border-b-[3px] border-black bg-[#4d7cff] px-5 py-20 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-8">
          <header>
            <p className="mb-3 inline-block border-[3px] border-black bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase shadow-[4px_4px_0_#000]">Web Audio API</p>
            <h2 className="font-chunk text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] font-black tracking-tight text-white [text-shadow:4px_4px_0_#000]">
              Toque. Tudo é síntese.
            </h2>
            <p className="mt-3 max-w-[56ch] text-base font-semibold text-black/80">
              Nenhum arquivo de áudio: cada pad é oscilador, filtro e envelope gerados no navegador. Use o toque ou as teclas{' '}
              <kbd className="border-2 border-black bg-white px-1.5 font-mono text-xs">Q W E R</kbd> <kbd className="border-2 border-black bg-white px-1.5 font-mono text-xs">A S D F</kbd>.
            </p>
          </header>
          <Scope />
          <Pads />
        </div>
      </section>

      {/* ADESIVOS */}
      <section data-spot="gravity-stickers" className="border-b-[3px] border-black bg-[#ff6bb5] px-5 py-20 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <header>
            <p className="mb-3 inline-block border-[3px] border-black bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase shadow-[4px_4px_0_#000]">drag · inércia · springs</p>
            <h2 className="font-chunk text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] font-black tracking-tight">Cole onde quiser.</h2>
          </header>
          <Stickers />
        </div>
      </section>

      {/* HOLO */}
      <section data-spot="gravity-holo" className="relative grid place-items-center gap-10 overflow-hidden bg-[#0a0a0a] px-5 py-24 text-white sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,#a56bff44,transparent_60%)]" />
        <header className="relative text-center">
          <p className="mb-3 inline-block border-[3px] border-white bg-black px-3 py-1 font-mono text-[11px] font-bold uppercase shadow-[4px_4px_0_#a56bff]">tilt 3D · blend-mode</p>
          <h2 className="font-chunk text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] font-black tracking-tight">Mova o mouse sobre a carta.</h2>
        </header>
        <HoloCard />
        <p className="pb-24 font-mono text-xs text-white/50">toque/mouse → springs → rotateX/rotateY → gradiente + color-dodge</p>
      </section>
    </main>
  )
}
