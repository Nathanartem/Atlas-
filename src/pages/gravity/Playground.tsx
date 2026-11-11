import Matter from 'matter-js'
import { useEffect, useRef, useState } from 'react'
import { hitSound, unlockAudio } from './audio.ts'

const { Engine, Bodies, Body, Composite, Constraint, Events, Query, Vector } = Matter

type Mode = 'down' | 'zero' | 'up' | 'magnet' | 'tilt'

const WORDS = [
  ['HTML', '#ff6bb5'], ['CSS', '#4d7cff'], ['TypeScript', '#3ddc84'], ['React', '#00d1c1'], ['WebGL', '#a56bff'],
  ['Motion', '#ff8a3d'], ['Física', '#ffffff'], ['Áudio', '#ff5d5d'], ['Vite', '#a56bff'], ['GSAP', '#3ddc84'],
  ['3D', '#ff6bb5'], ['Canvas', '#ffffff'], ['Shaders', '#4d7cff'], ['A11y', '#ff8a3d'], ['Rápido', '#00d1c1'], ['Springs', '#ff5d5d'],
] as const

const BALL_COLORS = ['#ff6bb5', '#4d7cff', '#3ddc84', '#ff8a3d', '#a56bff', '#ffffff']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
  square: boolean
  rot: number
}

interface Api {
  setMode: (m: Mode) => void
  explode: () => void
  spawn: (n?: number) => void
  reset: () => void
  setSound: (on: boolean) => void
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Playground.tsx — o "mundo" de física do hero da página Gravity
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech Motor de física (Matter.js)
 * Matter.js simula corpos rígidos 2D: gravidade, colisões, atrito, restituição (quique), restrições (molas).
 * Física 2D com Matter.js:
 *  • Pílulas = elementos DOM (estilizados com Tailwind) cujo transform é sincronizado com os corpos a cada frame
 *  • Bolas e partículas = Canvas 2D (centenas sem custo de layout)
 *  • Arrasto próprio via Constraint + Pointer Events (não sequestra o scroll da página no mobile)
 *  • Passo fixo de 1/60s com acumulador → simulação determinística independente do monitor
 *
 * Mapa do componente (tudo dentro de UM useEffect que cria e destrói o mundo):
 *   Paredes → Pílulas (corpos ligados ao DOM) → Bolas (canvas) → Partículas → Colisões (som+faíscas) → Arrasto →
 *   API dos botões (modos/explodir/reset/som) → Resize → Loop (passo fixo + render) → cleanup
 * O objeto `api` (setMode, explode, spawn, reset, setSound) é exposto ao pai via `onReady` e usado pelos botões.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Playground({ onReady }: { onReady?: (api: Api) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([])
  const api = useRef<Api | null>(null)
  const [mode, setModeState] = useState<Mode>('down')
  const [sound, setSoundState] = useState(false)
  const [balls, setBalls] = useState(0)
  const tiltOk = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches

  useEffect(() => {
    const el = box.current!
    const cv = canvas.current!
    const g2 = cv.getContext('2d')!
    const pills = pillRefs.current.filter(Boolean) as HTMLButtonElement[]

    const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0012 } })
    const world = engine.world
    let W = el.clientWidth
    let H = el.clientHeight
    let dpr = Math.min(devicePixelRatio, 2)
    let currentMode: Mode = 'down'
    let soundOn = false
    const pointer = { x: W / 2, y: H / 2, inside: false }
    const tilt = { x: 0, y: 1 }

    /* ── Paredes ── */
    let walls: Matter.Body[] = []
    const buildWalls = () => {
      Composite.remove(world, walls)
      const t = 400
      const opt = { isStatic: true, restitution: 0.6, friction: 0.1 }
      walls = [
        Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, opt),
        Bodies.rectangle(W / 2, -t / 2, W + t * 2, t, opt),
        Bodies.rectangle(-t / 2, H / 2, t, H * 3, opt),
        Bodies.rectangle(W + t / 2, H / 2, t, H * 3, opt),
      ]
      Composite.add(world, walls)
    }

    /* ── Pílulas (corpos ligados ao DOM) ── */
    const pillBodies: Matter.Body[] = []
    const sizes = pills.map((p) => ({ w: p.offsetWidth, h: p.offsetHeight }))
    const placePills = () => {
      Composite.remove(world, pillBodies)
      pillBodies.length = 0
      let x = 40
      let y = 60
      pills.forEach((_, i) => {
        const { w, h } = sizes[i]
        if (x + w > W - 20) {
          x = 40
          y += h + 26
        }
        const b = Bodies.rectangle(x + w / 2 + Math.random() * 10, y + (Math.random() - 0.5) * 24, w, h, {
          chamfer: { radius: Math.min(h / 2, 22) },
          restitution: 0.5,
          friction: 0.25,
          frictionAir: 0.008,
          density: 0.0018,
          angle: (Math.random() - 0.5) * 0.7,
        })
        b.label = `pill-${i}`
        x += w + 18
        pillBodies.push(b)
      })
      Composite.add(world, pillBodies)
    }

    /* ── Bolas (desenhadas no canvas) ── */
    const ballBodies: Matter.Body[] = []
    const ballColor = new Map<number, string>()
    const spawn = (n = 8) => {
      for (let i = 0; i < n; i++) {
        if (ballBodies.length >= 90) {
          Composite.remove(world, ballBodies.shift()!)
        }
        const r = 12 + Math.random() * 20
        const b = Bodies.circle(40 + Math.random() * (W - 80), r + 6 + Math.random() * Math.min(220, H * 0.3), r, {
          restitution: 0.72,
          friction: 0.05,
          density: 0.0012,
        })
        ballColor.set(b.id, BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)])
        ballBodies.push(b)
        Composite.add(world, b)
      }
      setBalls(ballBodies.length)
    }

    /* ── Partículas ── */
    const parts: Particle[] = []
    const burst = (x: number, y: number, n: number, power = 1) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = (2 + Math.random() * 5) * power
        parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
          life: 1, size: 3 + Math.random() * 6,
          color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
          square: Math.random() > 0.5, rot: Math.random() * 6,
        })
      }
      if (parts.length > 400) parts.splice(0, parts.length - 400)
    }

    /* ── Colisões → som + faíscas ──
       @tech Colisão → som + faíscas
       `collisionStart` entrega os pares que acabaram de se tocar. A velocidade RELATIVA (|vA − vB|) mede a força do
       impacto: abaixo de 3,2 é ignorada (corpos repousando); acima, gera faíscas (quanto mais forte, mais partículas)
       e toca `hitSound(rel, id)`. Um cooldown de 90 ms por corpo evita metralhadora de sons em pilhas. */
    const lastHit = new Map<number, number>()
    Events.on(engine, 'collisionStart', (e) => {
      const now = performance.now()
      for (const pair of e.pairs) {
        const { bodyA, bodyB } = pair
        const rel = Vector.magnitude(Vector.sub(bodyA.velocity, bodyB.velocity))
        if (rel < 3.2) continue
        const key = bodyA.isStatic ? bodyB.id : bodyA.id
        if (now - (lastHit.get(key) ?? 0) < 90) continue
        lastHit.set(key, now)
        const p = pair.collision.supports[0] ?? bodyA.position
        burst(p.x, p.y, Math.min(8, Math.round(rel / 2.5)), 0.6)
        if (soundOn) hitSound(rel, key)
      }
    })

    /* ── Arrasto ──
       @tech Arrasto próprio (Constraint + Pointer Events)
       No pointerdown, `Query.point` descobre qual corpo está sob o dedo. Em vez de teleportá-lo, criamos uma
       `Constraint` (mola, stiffness .16) entre o PONTO do ponteiro e aquele ponto do corpo; ao mover, só atualizamos
       `pointA`. A física faz o resto: o corpo é "puxado", bate nos outros e solta com inércia. `setPointerCapture`
       mantém o arrasto vivo fora do elemento. Clicar no vazio solta uma explosão de partículas. */
    let drag: { c: Matter.Constraint; el: HTMLElement | null } | null = null
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-ui]')) return
      const p = local(e)
      const hit = Query.point([...pillBodies, ...ballBodies], p)[0]
      if (!hit) {
        burst(p.x, p.y, 26, 1.4)
        return
      }
      el.setPointerCapture(e.pointerId)
      const c = Constraint.create({
        pointA: p,
        bodyB: hit,
        pointB: { x: p.x - hit.position.x, y: p.y - hit.position.y },
        stiffness: 0.16,
        damping: 0.12,
        length: 0,
      })
      Composite.add(world, c)
      const idx = pillBodies.indexOf(hit)
      drag = { c, el: idx >= 0 ? pills[idx] : null }
      drag.el?.setAttribute('data-grab', 'true')
      if (soundOn) hitSound(6, hit.id)
    }
    const onMove = (e: PointerEvent) => {
      const p = local(e)
      pointer.x = p.x
      pointer.y = p.y
      pointer.inside = true
      if (drag) drag.c.pointA = p
    }
    const onUp = () => {
      if (!drag) return
      Composite.remove(world, drag.c)
      drag.el?.removeAttribute('data-grab')
      drag = null
    }
    const onLeave = () => (pointer.inside = false)
    const onTilt = (e: DeviceOrientationEvent) => {
      tilt.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 40))
      tilt.y = Math.max(-1, Math.min(1, (e.beta ?? 45) / 60 - 0.2))
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('pointerleave', onLeave)
    addEventListener('deviceorientation', onTilt)

    /* ── API para os botões ── */
    // @tech Modos de gravidade
    // Normal/invertida mudam `engine.gravity.y` (+1/−1); zero-g zera a gravidade e dá um empurrão aleatório; ímã aplica
    // uma FORÇA radial até o cursor a cada passo (ver loop); inclinação (celular) lê `deviceorientation` (gamma/beta).
    const setMode = (m: Mode) => {
      currentMode = m
      setModeState(m)
      engine.gravity.x = 0
      engine.gravity.y = m === 'down' ? 1 : m === 'up' ? -1 : 0
      if (m === 'zero' || m === 'magnet') {
        for (const b of [...pillBodies, ...ballBodies]) Body.setVelocity(b, { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 })
      }
    }
    // @tech Explosão por impulso
    // Sem forças: sobrescreve `velocity` (x ±23, y −10…−44) e `angularVelocity` de TODOS os corpos de uma vez e
    // dispara 60 partículas. A gravidade faz o corpo voltar; o quique vem da restituição das paredes.
    const explode = () => {
      for (const b of [...pillBodies, ...ballBodies]) {
        Body.setVelocity(b, { x: (Math.random() - 0.5) * 46, y: -10 - Math.random() * 34 })
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.5)
      }
      burst(W / 2, H * 0.7, 60, 2)
    }
    const reset = () => {
      Composite.remove(world, ballBodies)
      ballBodies.length = 0
      setBalls(0)
      placePills()
      setMode('down')
    }
    const setSound = (on: boolean) => {
      soundOn = on
      setSoundState(on)
      if (on) unlockAudio()
    }
    api.current = { setMode, explode, spawn, reset, setSound }
    onReady?.(api.current)

    /* ── Resize ── */
    const resize = () => {
      W = el.clientWidth
      H = el.clientHeight
      dpr = Math.min(devicePixelRatio, 2)
      cv.width = W * dpr
      cv.height = H * dpr
      buildWalls()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()
    placePills()
    spawn(10)

    /* ── Loop (passo fixo) ──
       @tech Passo fixo com acumulador
       Física instável com dt variável (monitor 144 Hz vs 60 Hz = simulações diferentes). Solução clássica: o tempo
       real de cada frame entra num ACUMULADOR (limitado a 100 ms para não "espiral da morte") e a física avança em
       passos FIXOS de 1/60 s (`while (acc >= STEP)`). O resultado é determinístico e idêntico em qualquer tela. */
    const STEP = 1000 / 60
    let acc = 0
    let last = performance.now()
    let raf = 0
    let running = false

    const frame = (now: number) => {
      if (!running) return
      acc += Math.min(now - last, 100)
      last = now
      while (acc >= STEP) {
        if (currentMode === 'magnet' && pointer.inside) {
          for (const b of [...pillBodies, ...ballBodies]) {
            const dx = pointer.x - b.position.x
            const dy = pointer.y - b.position.y
            const d = Math.max(40, Math.hypot(dx, dy))
            const f = (b.mass * 0.0016 * 260) / d
            Body.applyForce(b, b.position, { x: (dx / d) * f, y: (dy / d) * f })
          }
        } else if (currentMode === 'tilt') {
          engine.gravity.x = tilt.x
          engine.gravity.y = tilt.y
        }
        Engine.update(engine, STEP)
        acc -= STEP
      }

      // @tech DOM sincronizado com a física
      // As pílulas são <button> normais (acessíveis e estilizáveis com Tailwind) posicionados em (0,0). A cada frame o
      // transform `translate3d(x,y) rotate(ângulo)` do CORPO do Matter é copiado para o estilo do elemento — o
      // navegador só compõe (sem layout), então dá para ter HTML "de verdade" voando e girando.
      // DOM ← física
      for (let i = 0; i < pills.length; i++) {
        const b = pillBodies[i]
        const { w, h } = sizes[i]
        pills[i].style.transform = `translate3d(${b.position.x - w / 2}px, ${b.position.y - h / 2}px, 0) rotate(${b.angle}rad)`
      }

      // @tech Canvas 2D para bolas e partículas
      // Dezenas de bolas e até 400 partículas seriam centenas de elementos DOM; no canvas cada uma é só um `arc()`.
      // A "sombra dura" neo-brutalista é um segundo círculo preto deslocado 4px, sem blur (barato e no estilo).
      // Canvas ← bolas + partículas
      g2.setTransform(dpr, 0, 0, dpr, 0, 0)
      g2.clearRect(0, 0, W, H)
      g2.lineWidth = 3
      g2.strokeStyle = '#0a0a0a'
      for (const b of ballBodies) {
        const r = b.circleRadius ?? 16
        g2.save()
        g2.translate(b.position.x, b.position.y)
        g2.rotate(b.angle)
        g2.fillStyle = '#0a0a0a'
        g2.beginPath()
        g2.arc(4, 4, r, 0, Math.PI * 2) // sombra "dura" neo-brutalista
        g2.fill()
        g2.fillStyle = ballColor.get(b.id) ?? '#fff'
        g2.beginPath()
        g2.arc(0, 0, r, 0, Math.PI * 2)
        g2.fill()
        g2.stroke()
        g2.beginPath() // marca de rotação
        g2.moveTo(0, 0)
        g2.lineTo(r * 0.7, 0)
        g2.stroke()
        g2.restore()
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.vy += 0.2
        p.x += p.vx
        p.y += p.vy
        p.rot += 0.2
        p.life -= 0.022
        if (p.life <= 0) {
          parts.splice(i, 1)
          continue
        }
        g2.globalAlpha = Math.min(1, p.life * 1.6)
        g2.fillStyle = p.color
        g2.save()
        g2.translate(p.x, p.y)
        g2.rotate(p.rot)
        if (p.square) g2.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        else {
          g2.beginPath()
          g2.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          g2.fill()
        }
        g2.restore()
      }
      g2.globalAlpha = 1

      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    // @tech Loops pausados fora da tela
    // Física + render só rodam enquanto o playground está visível (IntersectionObserver). Rolar a página para
    // longe pausa tudo: CPU a 0% e a simulação continua de onde parou ao voltar.
    const io = new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()))
    io.observe(el)

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('pointerleave', onLeave)
      removeEventListener('deviceorientation', onTilt)
      Events.off(engine, 'collisionStart')
      Composite.clear(world, false)
      Engine.clear(engine)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const modes: { id: Mode; label: string; icon: string }[] = [
    { id: 'down', label: 'Gravidade', icon: '↓' },
    { id: 'zero', label: 'Zero-G', icon: '◌' },
    { id: 'up', label: 'Invertida', icon: '↑' },
    { id: 'magnet', label: 'Ímã', icon: '⌖' },
    ...(tiltOk ? [{ id: 'tilt' as const, label: 'Inclinar', icon: '⟲' }] : []),
  ]

  // @tech Neo-brutalismo com Tailwind
  // Receita visual: bordas de 3px pretas, SOMBRAS DURAS sem blur (`shadow-[4px_4px_0_#000]`), tipografia pesada
  // (`font-chunk` = Unbounded), cores chapadas e movimento "mecânico" (hover sobe e a sombra cresce; active afunda
  // até a sombra sumir). Valores arbitrários `[...]` e variantes `data-[grab=true]:` do Tailwind v4 fazem o resto.
  const btn =
    'cursor-pointer border-[3px] border-black bg-white px-3.5 py-2 font-chunk text-[11px] font-bold uppercase tracking-wide shadow-[4px_4px_0_#000] transition-[translate,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none'

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden select-none">
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" />

      {/* @tech touch-action só onde precisa
          Só as PÍLULAS têm `touch-none` (touch-action: none): arrastá-las com o dedo não rola a página. O resto do
          playground NÃO bloqueia o toque, então o usuário consegue rolar a página passando o dedo pelo fundo. */}
      {WORDS.map(([word, color], i) => (
        <button
          key={word}
          ref={(n) => {
            pillRefs.current[i] = n
          }}
          type="button"
          tabIndex={-1}
          style={{ background: color }}
          className="absolute top-0 left-0 touch-none rounded-full border-[3px] border-black px-5 py-2.5 font-chunk text-[clamp(0.95rem,2.2vw,1.6rem)] font-bold text-black shadow-[5px_5px_0_#000] will-change-transform data-[grab=true]:cursor-grabbing data-[grab=true]:shadow-[9px_9px_0_#000] hover:cursor-grab"
        >
          {word}
        </button>
      ))}

      <div data-ui className="absolute top-24 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap gap-2.5 sm:top-auto sm:bottom-28 sm:left-1/2 sm:-translate-x-1/2 sm:justify-center">
        {modes.map((m) => (
          <button key={m.id} type="button" className={`${btn} ${mode === m.id ? 'bg-black text-[#ffd23f]' : ''}`} onClick={() => api.current?.setMode(m.id)}>
            {m.icon} {m.label}
          </button>
        ))}
        <button type="button" className={`${btn} bg-[#ff6bb5]`} onClick={() => api.current?.explode()}>
          ✸ Explodir
        </button>
        <button type="button" className={`${btn} bg-[#3ddc84]`} onClick={() => api.current?.spawn(8)}>
          + Bolas {balls > 0 && <span className="opacity-60">({balls})</span>}
        </button>
        <button
          type="button"
          className={btn}
          style={sound ? { backgroundColor: '#4d7cff', color: '#141210' } : undefined}
          onClick={() => api.current?.setSound(!sound)}
          aria-pressed={sound}
        >
          {sound ? '♪ Som on' : '♪ Som off'}
        </button>
        <button type="button" className={btn} onClick={() => api.current?.reset()}>
          ↺ Reset
        </button>
      </div>
    </div>
  )
}
