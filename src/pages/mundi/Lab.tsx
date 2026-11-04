/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Lab.tsx — laboratório de projeções: mapa plano com morph, Tissot, coroplético, zoom
 * ═══════════════════════════════════════════════════════════════════════════
 *  Diferente do globo, aqui NÃO há loop contínuo: o mapa é redesenhado sob demanda
 *  (`redraw()`) quando algo muda — morph (animação do Motion), zoom/pan, hover, controles.
 *
 *  Estado
 *   • React (useState): o que a UI precisa mostrar — projeção ativa, indicador, camadas, legenda
 *   • `cfg` (ref mutável): o que o desenho precisa ler — from/to/t do morph, zoom k/x/y, camadas…
 *  Fluxo: handler muda state → useEffect copia para `cfg` → `redraw()` pinta o canvas.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { geoGraticule10, geoPath, type GeoProjection, type GeoRawProjection } from 'd3-geo'
import { animate } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { blendRaw, borders, countries, fittedProjection, indicators, PROJECTIONS, SPHERE, sizeCanvas, tissot } from './geo.ts'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const nf = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/**
 * @tech Mapa coroplético com interpoladores d3-scale-chromatic
 * Cada indicador vira um valor normalizado u ∈ [0,1] por país (linear ou logarítmico) e a cor é
 * `interpolador(u)`. Normalizamos uma vez aqui (módulo) — redesenhar o mapa só consulta arrays.
 */
const normalized = indicators.map((ind) => {
  const vals = countries.map((f) => Math.max(ind.log ? 1 : -Infinity, ind.values.get(f.properties.name) ?? 0))
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = ind.log ? Math.log(max) - Math.log(min) : max - min
  const u = vals.map((v) => (ind.log ? Math.log(v) - Math.log(min) : v - min) / span)
  // valor correspondente a um u qualquer (para os rótulos da legenda)
  const at = (t: number) => (ind.log ? Math.exp(Math.log(min) + t * span) : min + t * span)
  return { vals, u, min, max, at }
})

interface Layers {
  choropleth: boolean
  graticule: boolean
  tissot: boolean
}

export function Lab() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [projId, setProjId] = useState(PROJECTIONS[0].id)
  const [indId, setIndId] = useState(indicators[0].id)
  const [layers, setLayers] = useState<Layers>({ choropleth: true, graticule: true, tissot: false })
  const [range, setRange] = useState<[number, number] | null>(null)
  const [hovered, setHovered] = useState<{ name: string; value: number } | null>(null)

  // Tudo que o desenho lê (mutável, fora do ciclo de render do React)
  const cfg = useRef({
    from: PROJECTIONS[0].raw as GeoRawProjection,
    to: PROJECTIONS[0].raw as GeoRawProjection,
    t: 1, // 0 → 1 durante o morph
    k: 1, // zoom
    x: 0, // pan (px CSS)
    y: 0,
    layers,
    indIdx: 0,
    range: null as [number, number] | null,
    hoverIdx: -1,
  })
  const redrawRef = useRef<() => void>(() => {})
  const zoomRef = useRef<{ by: (f: number) => void; reset: () => void }>({ by: () => {}, reset: () => {} })
  const morphRef = useRef<{ stop: () => void } | null>(null)

  const indIdx = indicators.findIndex((i) => i.id === indId)
  const ind = indicators[indIdx]
  const norm = normalized[indIdx]

  // React state → cfg → redesenha
  useEffect(() => {
    cfg.current.layers = layers
    cfg.current.indIdx = indIdx
    cfg.current.range = range
    redrawRef.current()
  }, [layers, indIdx, range])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const graticule = geoGraticule10()
    const c = cfg.current

    // Cache da projeção encaixada: fitExtent mede todos os países — só refazemos se algo relevante mudou
    let cache: { from: GeoRawProjection; to: GeoRawProjection; t: number; w: number; h: number; proj: GeoProjection } | null = null
    let size = { w: 1, h: 1, dpr: 1 }
    let frame = 0

    const projection = () => {
      if (!cache || cache.from !== c.from || cache.to !== c.to || cache.t !== c.t || cache.w !== size.w || cache.h !== size.h) {
        cache = { from: c.from, to: c.to, t: c.t, w: size.w, h: size.h, proj: fittedProjection(blendRaw(c.from, c.to, c.t), size.w, size.h) }
      }
      return cache.proj
    }

    const clampPan = () => {
      c.x = clamp(c.x, size.w * (1 - c.k), 0)
      c.y = clamp(c.y, size.h * (1 - c.k), 0)
    }

    const draw = () => {
      size = sizeCanvas(canvas)
      const { w, h, dpr } = size
      const path = geoPath(projection(), ctx)
      const lw = 1 / c.k // espessura de linha constante na tela, qualquer que seja o zoom
      const n = normalized[c.indIdx]
      const interp = indicators[c.indIdx].interpolator

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#cfe2e6' // "papel" fora do mundo
      ctx.fillRect(0, 0, w, h)
      ctx.setTransform(dpr * c.k, 0, 0, dpr * c.k, dpr * c.x, dpr * c.y)

      ctx.beginPath()
      path(SPHERE)
      ctx.fillStyle = '#e9f3f3'
      ctx.fill()

      if (c.layers.graticule) {
        ctx.beginPath()
        path(graticule)
        ctx.strokeStyle = 'rgba(20,40,61,0.16)'
        ctx.lineWidth = 0.6 * lw
        ctx.stroke()
      }

      countries.forEach((f, i) => {
        const inRange = !c.range || (n.u[i] >= c.range[0] && n.u[i] <= c.range[1])
        ctx.beginPath()
        path(f)
        ctx.globalAlpha = inRange ? 1 : 0.16
        ctx.fillStyle = c.layers.choropleth ? interp(n.u[i]) : '#d9cfae'
        ctx.fill()
      })
      ctx.globalAlpha = 1

      ctx.beginPath()
      path(borders)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 0.6 * lw
      ctx.stroke()

      if (c.layers.tissot) {
        ctx.fillStyle = 'rgba(224,74,52,0.45)'
        ctx.strokeStyle = 'rgba(160,30,20,0.9)'
        ctx.lineWidth = 0.8 * lw
        for (const circle of tissot) {
          ctx.beginPath()
          path(circle)
          ctx.fill()
          ctx.stroke()
        }
      }

      if (c.hoverIdx >= 0) {
        ctx.beginPath()
        path(countries[c.hoverIdx])
        ctx.strokeStyle = '#10243e'
        ctx.lineWidth = 1.8 * lw
        ctx.stroke()
      }

      ctx.beginPath()
      path(SPHERE)
      ctx.strokeStyle = '#10243e'
      ctx.lineWidth = 1.2 * lw
      ctx.stroke()
      canvas.style.touchAction = c.k > 1.01 ? 'none' : 'pan-y'
    }

    // @tech Redesenho sob demanda com rAF agrupado
    // Em vez de um loop contínuo, `redraw()` agenda UMA pintura por frame (várias mudanças no mesmo frame →
    // 1 pintura). O mapa fica parado (0% de CPU) quando nada acontece.
    redrawRef.current = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        draw()
      })
    }

    /* ───────── hit-test: qual país está sob o cursor? ───────── */
    // @tech Hit-testing com isPointInPath no canvas
    // Reconstruímos o caminho de cada país com a MESMA transformação do desenho e perguntamos ao canvas
    // `isPointInPath(x, y)`. As coordenadas do ponto são em px de bitmap (não passam pela transformação
    // atual), por isso multiplicamos por dpr. ~176 países por movimento: barato, e exato mesmo com morph/zoom.
    const pick = (px: number, py: number) => {
      const { dpr } = size
      const path = geoPath(projection(), ctx)
      ctx.setTransform(dpr * c.k, 0, 0, dpr * c.k, dpr * c.x, dpr * c.y)
      for (let i = countries.length - 1; i >= 0; i--) {
        ctx.beginPath()
        path(countries[i])
        if (ctx.isPointInPath(px * dpr, py * dpr)) return i
      }
      return -1
    }

    /* ───────── zoom + pan ───────── */
    const zoomAt = (px: number, py: number, factor: number) => {
      const k2 = clamp(c.k * factor, 1, 14)
      const r = k2 / c.k
      c.x = px - (px - c.x) * r // mantém o ponto sob o cursor parado
      c.y = py - (py - c.y) * r
      c.k = k2
      clampPan()
      redrawRef.current()
    }
    zoomRef.current = {
      by: (f) => zoomAt(size.w / 2, size.h / 2, f),
      reset: () => {
        c.k = 1
        c.x = c.y = 0
        redrawRef.current()
      },
    }

    // @tech Zoom no ponto do cursor (Ctrl + roda / pinça do trackpad)
    // Só zoom com Ctrl/⌘ pressionado: sem isso a roda continuaria rolando a página (o gesto de pinça do
    // trackpad já chega como wheel com ctrlKey=true). preventDefault exige listener NÃO passivo.
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0022))
    }

    let drag: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      if (c.k <= 1.01) return
      canvas.setPointerCapture(e.pointerId)
      drag = { x: e.clientX, y: e.clientY }
    }
    const onMove = (e: PointerEvent) => {
      if (drag) {
        c.x += e.clientX - drag.x
        c.y += e.clientY - drag.y
        drag = { x: e.clientX, y: e.clientY }
        clampPan()
        redrawRef.current()
        return
      }
      const r = canvas.getBoundingClientRect()
      const idx = pick(e.clientX - r.left, e.clientY - r.top)
      if (idx !== c.hoverIdx) {
        c.hoverIdx = idx
        setHovered(idx < 0 ? null : { name: countries[idx].properties.name, value: normalized[c.indIdx].vals[idx] })
        redrawRef.current()
      }
    }
    const onUp = () => (drag = null)
    const onLeave = () => {
      if (c.hoverIdx !== -1) {
        c.hoverIdx = -1
        setHovered(null)
        redrawRef.current()
      }
    }
    const onDbl = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, 2)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('dblclick', onDbl)

    const ro = new ResizeObserver(() => redrawRef.current())
    ro.observe(canvas)
    draw()

    return () => {
      cancelAnimationFrame(frame)
      morphRef.current?.stop()
      ro.disconnect()
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('dblclick', onDbl)
      redrawRef.current = () => {}
    }
  }, [])

  /** Dispara o morph: `from` vira a mistura ATUAL (suporta clicar no meio de uma animação). */
  const pickProjection = (id: string) => {
    const def = PROJECTIONS.find((p) => p.id === id)!
    const c = cfg.current
    morphRef.current?.stop()
    setProjId(id)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      c.from = c.to = def.raw // sem animação: troca direta
      c.t = 1
      redrawRef.current()
      return
    }
    c.from = blendRaw(c.from, c.to, c.t)
    c.to = def.raw
    c.t = 0
    morphRef.current = animate(0, 1, {
      duration: 1.1,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (t) => {
        c.t = t
        redrawRef.current()
      },
      onComplete: () => {
        c.from = c.to // "achata" a cadeia de blends
        c.t = 1
      },
    })
  }

  const toggle = (key: keyof Layers) => setLayers((l) => ({ ...l, [key]: !l[key] }))
  const projDef = PROJECTIONS.find((p) => p.id === projId)!

  // Gradiente da legenda: 24 amostras do interpolador → linear-gradient CSS
  const gradient = useMemo(() => {
    const stops = Array.from({ length: 24 }, (_, i) => `${ind.interpolator(i / 23)} ${(i / 23) * 100}%`)
    return `linear-gradient(90deg, ${stops.join(', ')})`
  }, [ind])
  const inRange = range ? norm.u.filter((u) => u >= range[0] && u <= range[1]).length : countries.length

  return (
    <div className="mundi-lab" data-spot="mundi-lab">
      <div className="mundi-lab__controls">
        <div role="group" aria-label="Projeção" className="mundi-seg">
          {PROJECTIONS.map((p) => (
            <button key={p.id} type="button" aria-pressed={projId === p.id} onClick={() => pickProjection(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Indicador" className="mundi-seg">
          {indicators.map((i) => (
            <button key={i.id} type="button" aria-pressed={indId === i.id} onClick={() => { setIndId(i.id); setRange(null); setHovered(null) }}>
              {i.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Camadas" className="mundi-toggles">
          <label>
            <input type="checkbox" checked={layers.choropleth} onChange={() => toggle('choropleth')} /> Coroplético
          </label>
          <label>
            <input type="checkbox" checked={layers.graticule} onChange={() => toggle('graticule')} /> Grade
          </label>
          <label>
            <input type="checkbox" checked={layers.tissot} onChange={() => toggle('tissot')} /> Círculos de Tissot
          </label>
        </div>
      </div>

      <div className="mundi-map">
        <canvas ref={canvasRef} className="mundi-map__canvas" role="img" aria-label={`Mapa-múndi na projeção ${projDef.label}, colorido por ${ind.label}`} />
        <div className="mundi-map__zoom">
          <button type="button" onClick={() => zoomRef.current.by(1.6)} aria-label="Aproximar">+</button>
          <button type="button" onClick={() => zoomRef.current.by(1 / 1.6)} aria-label="Afastar">−</button>
          <button type="button" onClick={() => zoomRef.current.reset()} aria-label="Reiniciar zoom">⟲</button>
        </div>
        {/* Barra de status FORA da área do canvas (no fluxo normal): nada cobre o mapa */}
        <p className="mundi-map__hover" aria-live="polite">
          <span>
            {hovered ? (
              <>
                <b>{hovered.name}</b> · {ind.id === 'area' ? nf.format(hovered.value) : Math.round(hovered.value).toLocaleString('pt-BR')} {ind.unit}
              </>
            ) : (
              'Passe o mouse sobre um país'
            )}
          </span>
          <small>Ctrl + roda: zoom · arraste: mover · duplo clique: aproximar</small>
        </p>
      </div>

      <p className="mundi-note">
        <b>{projDef.label}.</b> {projDef.note}
      </p>

      {/* @tech Legenda interativa que filtra o mapa
          O gradiente é um `linear-gradient` montado a partir de 24 amostras do interpolador; passar o mouse
          pela barra define uma faixa [u0,u1] que o desenho usa para esmaecer os países fora dela. */}
      <div className="mundi-legend">
        <div
          className="mundi-legend__bar"
          style={{ background: gradient }}
          // Passar o mouse pela barra destaca só os países daquela faixa de valores
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const u = clamp((e.clientX - r.left) / r.width, 0, 1)
            setRange([Math.max(0, u - 0.07), Math.min(1, u + 0.07)])
          }}
          onPointerLeave={() => setRange(null)}
        >
          {range && <i style={{ left: `${range[0] * 100}%`, width: `${(range[1] - range[0]) * 100}%` }} />}
        </div>
        <div className="mundi-legend__ticks">
          <span>{nf.format(norm.min)} {ind.unit}</span>
          <span>{nf.format(norm.at(0.5))}</span>
          <span>{nf.format(norm.max)} {ind.unit}</span>
        </div>
        <p>
          {range ? `${inRange} países nesta faixa` : `${countries.length} países`} ·{' '}
          <span className={`mundi-badge mundi-badge--${ind.kind}`}>{ind.kind === 'computed' ? 'calculado' : 'sintético'}</span> {ind.note}
        </p>
      </div>
    </div>
  )
}
