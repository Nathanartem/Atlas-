/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  fallback2d.ts — mesma API do motor WebGPU, mas em Canvas 2D (CPU)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Entra em ação quando: o navegador não tem WebGPU, não há adapter, um shader não
 *  compilou ou o device foi perdido. A simulação é a mesma ideia (campo de fluxo + atrator),
 *  porém limitada a ~12 mil partículas e com um campo senoidal barato no lugar do curl noise.
 *  Rastros: em vez de textura HDR, pintamos um retângulo preto translúcido a cada frame.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { NebulaEngine, NebulaParams } from './engine.ts'

const MAX_FALLBACK = 12_000

// @tech Fallback em Canvas 2D com a mesma interface do motor WebGPU
// `createCanvas2DEngine` devolve um objeto `NebulaEngine` idêntico em formato: a UI não sabe (nem precisa
// saber) qual motor está rodando. Degradação graciosa em vez de tela vazia.
export function createCanvas2DEngine(host: HTMLElement, initialCount: number, params: NebulaParams): NebulaEngine {
  const canvas = document.createElement('canvas')
  canvas.className = 'nebula-canvas'
  host.append(canvas)
  const g = canvas.getContext('2d', { alpha: false })!

  let count = 0
  let pos = new Float32Array(0) // [x, y] × n   em clip space [-1, 1]
  let vel = new Float32Array(0) // [vx, vy] × n

  const build = (n: number) => {
    count = Math.min(n, MAX_FALLBACK)
    pos = new Float32Array(count * 2)
    vel = new Float32Array(count * 2)
    for (let i = 0; i < count * 2; i++) pos[i] = Math.random() * 2 - 1
    engine.stats.count = count
  }

  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 1.5)
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr))
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr))
    g.fillStyle = '#000'
    g.fillRect(0, 0, canvas.width, canvas.height)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const pointer = { x: 0, y: 0, down: false, lastMove: -1e9 }
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1
    pointer.y = -((e.clientY / innerHeight) * 2 - 1)
    pointer.lastMove = performance.now()
  }
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest('button,input,select,a,pre,label,summary')) return
    pointer.down = true
  }
  const onUp = () => (pointer.down = false)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerdown', onDown, { passive: true })
  addEventListener('pointerup', onUp, { passive: true })
  addEventListener('pointercancel', onUp, { passive: true })

  let raf = 0
  let last = performance.now()
  let time = 0
  let fpsEma = 60
  let disposed = false
  const mouse = { x: 0, y: 0 }

  const frame = (now: number) => {
    if (disposed) return
    raf = requestAnimationFrame(frame)
    const rawDt = (now - last) / 1000
    last = now
    const dt = Math.min(rawDt, 1 / 20)
    time += dt
    fpsEma += (1 / Math.max(rawDt, 1e-4) - fpsEma) * 0.05
    engine.stats.fps = fpsEma

    const idle = now - pointer.lastMove > 2500
    const tx = idle ? Math.sin(time * 0.37) * 0.62 : pointer.x
    const ty = idle ? Math.sin(time * 0.53 + 1.3) * 0.5 : pointer.y
    mouse.x += (tx - mouse.x) * Math.min(1, dt * 6)
    mouse.y += (ty - mouse.y) * Math.min(1, dt * 6)

    const { attract, curl, drag, fade } = engine.params
    const aspect = canvas.width / canvas.height
    const damp = Math.exp(-drag * dt)
    const polarity = pointer.down ? -2.5 : 1

    // Rastro: escurece o frame anterior (equivalente ao fs_fade do WebGPU)
    g.globalCompositeOperation = 'source-over'
    g.fillStyle = `rgba(0,0,0,${Math.min(0.5, fade * 1.4)})`
    g.fillRect(0, 0, canvas.width, canvas.height)

    g.globalCompositeOperation = 'lighter' // blend aditivo, como no WebGPU
    const W = canvas.width
    const H = canvas.height
    const s = Math.max(1.4, 2.4 * (W / 1400))
    for (let i = 0; i < count; i++) {
      const j = i * 2
      let x = pos[j]
      let y = pos[j + 1]
      let vx = vel[j]
      let vy = vel[j + 1]

      // campo de fluxo barato: dois senos cruzados deslocados no tempo (parece turbulência)
      const fx = Math.sin(y * 3.1 + time * 0.5) + 0.5 * Math.sin(y * 7.3 - time * 0.9 + x * 2)
      const fy = Math.cos(x * 3.1 - time * 0.4) + 0.5 * Math.cos(x * 6.7 + time * 0.7 - y * 2)
      vx += fx * curl * 0.9 * dt
      vy += fy * curl * 0.9 * dt

      const dx = (mouse.x - x) * aspect
      const dy = mouse.y - y
      const r2 = dx * dx + dy * dy + 0.015
      const inv = 1 / Math.sqrt(r2)
      const pull = (attract * polarity * 0.03) / r2
      vx += (dx * inv * pull - dy * inv * pull * 0.6) * dt
      vy += (dy * inv * pull + dx * inv * pull * 0.6) * dt

      vx *= damp
      vy *= damp
      x += vx * dt
      y += vy * dt
      // mundo toroidal
      if (x > 1) x -= 2
      else if (x < -1) x += 2
      if (y > 1) y -= 2
      else if (y < -1) y += 2

      pos[j] = x
      pos[j + 1] = y
      vel[j] = vx
      vel[j + 1] = vy

      const t = Math.min(1, Math.hypot(vx, vy) * 1.6)
      g.fillStyle = `rgba(${(64 + 191 * t) | 0},${(115 + 20 * t) | 0},${(255 - 175 * t) | 0},0.55)`
      g.fillRect(((x + 1) / 2) * W, ((1 - y) / 2) * H, s, s)
    }
  }

  const engine: NebulaEngine = {
    kind: 'canvas2d',
    params,
    stats: { fps: 0, count: 0 },
    gpu: null,
    setCount: build,
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerdown', onDown)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onUp)
      canvas.remove()
    },
  }

  resize()
  build(initialCount)
  raf = requestAnimationFrame(frame)
  return engine
}
