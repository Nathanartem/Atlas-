/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Globe.tsx — globo interativo em Canvas 2D (d3-geo, projeção ortográfica)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Tudo é desenhado a cada frame em ordem de "pintor":
 *    halo → oceano (gradiente radial) → grade → países → fronteiras → NOITE (terminador)
 *    → arcos (rotas) → cidades → rótulo da cidade sob o cursor
 *
 *  Estado do globo vive num objeto mutável (`view`), NÃO em useState: mudar lon/lat 60×/s por
 *  setState re-renderizaria o React sem necessidade. O React só recebe eventos de alto nível
 *  (`onSelect`). Entrada: arrastar (com inércia), setas do teclado, clique em cidade.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { Delaunay } from 'd3-delaunay'
import { geoCircle, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { scaleSqrt } from 'd3-scale'
import { useEffect, useRef } from 'react'
import { cities } from './cities.ts'
import { antiSolar, borders, SPHERE, sizeCanvas, subsolarPoint, worldFull } from './geo.ts'

interface Props {
  selected: number | null
  onSelect: (index: number | null) => void
}

const TAU = Math.PI * 2
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function Globe({ selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Estado mutável lido pelo loop de render (sem re-render do React)
  const view = useRef({
    lon: -42, // ponto que está de frente para o usuário
    lat: 14,
    vlon: 0, // velocidade de inércia (graus por frame @60fps)
    vlat: 0,
    dragging: false,
    target: null as { lon: number; lat: number } | null,
    selected: null as number | null,
  })
  const onSelectRef = useRef(onSelect)

  // Sincroniza props → refs do loop (e inicia a animação de "voar até a cidade")
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    const v = view.current
    v.selected = selected
    if (selected !== null) v.target = { lon: cities[selected].lon, lat: clamp(cities[selected].lat, -55, 55) }
  }, [selected])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const v = view.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const graticule = geoGraticule10()
    // @tech Escala de raio por raiz quadrada (área proporcional ao valor)
    // O olho lê ÁREA, não raio: se o raio fosse linear, Tóquio pareceria 150× maior que Reykjavík.
    // scaleSqrt faz a área do círculo crescer proporcionalmente à população.
    const radius = scaleSqrt().domain([0, 38]).range([2.2, 11])

    const proj = geoOrthographic().clipAngle(90).precision(0.4)
    // @tech Renderização de GeoJSON direto no contexto 2D (geoPath com canvas)
    // `geoPath(projection, context)` não gera string SVG: chama moveTo/lineTo/arc no Canvas.
    // O clipAngle(90) do ortográfico já descarta o hemisfério de trás; linhas (arcos) seguem o círculo máximo.
    const path = geoPath(proj, ctx)

    let w = 0
    let h = 0
    let dpr = 1
    let R = 100
    let raf = 0
    let running = false
    let visible = true
    let last = performance.now()
    let time = 0
    let hover = -1
    let pointer: { x: number; y: number } | null = null
    // cidades visíveis (hemisfério da frente) em coordenadas de tela
    let screen: { i: number; x: number; y: number }[] = []
    let delaunay: Delaunay<{ i: number; x: number; y: number }> | null = null

    const resize = () => {
      ;({ w, h, dpr } = sizeCanvas(canvas))
      R = Math.min(w, h) / 2 - 16
    }
    const ro = new ResizeObserver(() => {
      resize()
      if (!running) draw()
    })
    ro.observe(canvas)

    /* ───────── desenho ───────── */
    function draw() {
      proj.scale(R).translate([w / 2, h / 2]).rotate([-v.lon, -v.lat])
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // halo atmosférico
      const halo = ctx.createRadialGradient(w / 2, h / 2, R * 0.94, w / 2, h / 2, R * 1.14)
      halo.addColorStop(0, 'rgba(120,190,230,0.5)')
      halo.addColorStop(1, 'rgba(120,190,230,0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, R * 1.14, 0, TAU)
      ctx.fill()

      // oceano: gradiente radial deslocado para o canto superior esquerdo → sensação de volume/luz
      const ocean = ctx.createRadialGradient(w / 2 - R * 0.35, h / 2 - R * 0.4, R * 0.1, w / 2, h / 2, R)
      ocean.addColorStop(0, '#4fa8cb')
      ocean.addColorStop(1, '#0c3a63')
      ctx.beginPath()
      path(SPHERE)
      ctx.fillStyle = ocean
      ctx.fill()

      ctx.beginPath()
      path(graticule)
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'
      ctx.lineWidth = 0.6
      ctx.stroke()

      ctx.beginPath()
      path(worldFull)
      ctx.fillStyle = '#eadfc3'
      ctx.fill()

      ctx.beginPath()
      path(borders)
      ctx.strokeStyle = 'rgba(20,40,61,0.4)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      // noite: 3 camadas translúcidas com raios crescentes imitam o crepúsculo
      const night = antiSolar(subsolarPoint(new Date()))
      for (const [r, a] of [
        [90, 0.34],
        [96, 0.14],
        [103, 0.09],
      ] as const) {
        ctx.beginPath()
        path(geoCircle().center(night).radius(r).precision(3)())
        ctx.fillStyle = `rgba(3,10,30,${a})`
        ctx.fill()
      }

      // cidades visíveis → tela
      const center: [number, number] = [v.lon, v.lat]
      screen = []
      cities.forEach((c, i) => {
        if (geoDistance(center, [c.lon, c.lat]) > Math.PI / 2 - 0.03) return
        const p = proj([c.lon, c.lat])
        if (p) screen.push({ i, x: p[0], y: p[1] })
      })
      // @tech Hit-testing de vizinho mais próximo com Delaunay
      // Em vez de comparar o cursor com TODAS as cidades, `Delaunay.find` navega a triangulação e
      // devolve o ponto mais próximo rapidamente. Reconstruída por frame porque as posições de tela mudam.
      delaunay = screen.length ? Delaunay.from(screen, (d) => d.x, (d) => d.y) : null
      hover = -1
      if (pointer && delaunay && !v.dragging) {
        const hit = screen[delaunay.find(pointer.x, pointer.y)]
        if (hit && Math.hypot(hit.x - pointer.x, hit.y - pointer.y) < 16) hover = hit.i
      }

      // arcos: da cidade selecionada às 5 maiores cidades (círculo máximo, tracejado "andando")
      if (v.selected !== null) {
        const from = cities[v.selected]
        const dests = cities
          .map((c, i) => ({ c, i }))
          .filter((d) => d.i !== v.selected)
          .sort((a, b) => b.c.pop - a.c.pop)
          .slice(0, 5)
        ctx.save()
        ctx.setLineDash([5, 7])
        ctx.lineDashOffset = -time * 28
        ctx.strokeStyle = 'rgba(255,196,87,0.85)'
        ctx.lineWidth = 1.4
        for (const d of dests) {
          ctx.beginPath()
          path({ type: 'LineString', coordinates: [[from.lon, from.lat], [d.c.lon, d.c.lat]] })
          ctx.stroke()
        }
        ctx.restore()
      }

      // marcadores
      for (const s of screen) {
        const c = cities[s.i]
        const r = radius(c.pop) * (s.i === hover ? 1.25 : 1)
        const isSel = s.i === v.selected
        if (isSel) {
          // anel pulsante
          const k = (time * 0.9) % 1
          ctx.beginPath()
          ctx.arc(s.x, s.y, r + 4 + k * 14, 0, TAU)
          ctx.strokeStyle = `rgba(255,196,87,${0.7 * (1 - k)})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(s.x, s.y, r, 0, TAU)
        ctx.fillStyle = isSel ? '#ffc457' : 'rgba(224,74,52,0.82)'
        ctx.fill()
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.stroke()
      }

      // rótulo da cidade sob o cursor
      if (hover >= 0) {
        const s = screen.find((d) => d.i === hover)!
        const c = cities[hover]
        const text = `${c.name} · ${c.pop < 1 ? c.pop.toFixed(2) : c.pop.toFixed(1)} mi`
        ctx.font = '600 12px "Inter Variable", system-ui, sans-serif'
        const tw = ctx.measureText(text).width
        const bx = clamp(s.x + 12, 6, w - tw - 22)
        const by = clamp(s.y - 30, 6, h - 30)
        ctx.fillStyle = 'rgba(12,28,48,0.92)'
        ctx.beginPath()
        ctx.roundRect(bx, by, tw + 16, 24, 8)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, bx + 8, by + 12.5)
      }
    }

    /* ───────── loop ───────── */
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      time += dt
      const f = dt * 60 // fator "frames @60fps" para manter a inércia independente do FPS

      if (v.target) {
        // voo suave até a cidade escolhida (menor caminho em longitude)
        let dl = v.target.lon - v.lon
        dl = ((((dl + 180) % 360) + 360) % 360) - 180
        const dla = v.target.lat - v.lat
        v.lon += dl * Math.min(1, dt * 4)
        v.lat += dla * Math.min(1, dt * 4)
        v.vlon = v.vlat = 0
        if (Math.abs(dl) < 0.05 && Math.abs(dla) < 0.05) v.target = null
      } else if (!v.dragging) {
        v.lon += v.vlon * f
        v.lat = clamp(v.lat + v.vlat * f, -85, 85)
        v.vlon *= Math.pow(0.94, f)
        v.vlat *= Math.pow(0.94, f)
        // rotação automática lenta quando ninguém interage
        if (!reduced && v.selected === null && hover < 0 && Math.abs(v.vlon) < 0.02) v.lon += dt * 5
      }
      v.lon = ((((v.lon + 180) % 360) + 360) % 360) - 180

      draw()
      if (running) raf = requestAnimationFrame(frame)
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
    // @tech Loop de render pausado fora da tela e em aba oculta
    const sync = () => (visible && !document.hidden ? start() : stop())
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(canvas)
    document.addEventListener('visibilitychange', sync)

    /* ───────── entrada ───────── */
    // `hit` guarda a cidade sob o cursor NO MOMENTO do pressionar (durante o arrasto o hover é desligado)
    let down: { x: number; y: number; moved: number; hit: number } | null = null
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    // @tech Arrastar com Pointer Events, setPointerCapture e inércia
    // Pointer Events unificam mouse/toque/caneta. `setPointerCapture` mantém os eventos chegando ao canvas
    // mesmo se o dedo sair dele. A velocidade do último movimento vira `vlon/vlat`, que decai (×0,94/frame).
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const p = local(e)
      // tocar (sem mouse) não dispara pointermove antes: calcula o hover aqui também
      pointer = p
      if (delaunay) {
        const near = screen[delaunay.find(p.x, p.y)]
        if (near && Math.hypot(near.x - p.x, near.y - p.y) < 18) hover = near.i
      }
      down = { ...p, moved: 0, hit: hover }
      v.dragging = true
      v.target = null
    }
    const onMove = (e: PointerEvent) => {
      const p = local(e)
      if (down && v.dragging) {
        const dx = p.x - down.x
        const dy = p.y - down.y
        down.x = p.x
        down.y = p.y
        down.moved += Math.abs(dx) + Math.abs(dy)
        const k = 90 / R // arrastar "um raio" gira 90°
        v.lon -= dx * k
        v.lat = clamp(v.lat + dy * k, -85, 85)
        v.vlon = -dx * k
        v.vlat = dy * k
      }
      pointer = p
      if (!running) draw()
    }
    const onUp = () => {
      v.dragging = false
      // clique (quase sem arrastar) em uma cidade → seleciona
      if (down && down.moved < 5 && down.hit >= 0) onSelectRef.current(down.hit)
      down = null
    }
    const onLeave = () => {
      pointer = null
      hover = -1
    }
    const onKey = (e: KeyboardEvent) => {
      const step = 12
      if (e.key === 'ArrowLeft') v.lon -= step
      else if (e.key === 'ArrowRight') v.lon += step
      else if (e.key === 'ArrowUp') v.lat = clamp(v.lat + step, -85, 85)
      else if (e.key === 'ArrowDown') v.lat = clamp(v.lat - step, -85, 85)
      else return
      e.preventDefault()
      v.target = null
      if (!running) draw()
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('keydown', onKey)

    resize()
    draw()
    sync()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="mundi-globe"
      tabIndex={0}
      role="img"
      aria-label="Globo terrestre interativo. Arraste ou use as setas do teclado para girar; clique em uma cidade para selecioná-la."
    />
  )
}
