import { scaleLinear } from 'd3-scale'
import { arc, area, curveMonotoneX, line, pie } from 'd3-shape'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLive, WINDOW, type Point } from './store.ts'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  charts.tsx — componentes de visualização do Pulse (SVG puro, sem biblioteca de gráficos)
 * ═══════════════════════════════════════════════════════════════════════════
 *   AnimatedNumber ... número que "rola" até o novo valor      Sparkline ... mini gráfico de linha+área
 *   LiveChart ........ gráfico principal (req/s + p95)          Donut ....... pizza com anel (status HTTP)
 *   Heatmap .......... grade 7×24 (dia × hora)
 *  Divisão de trabalho: d3-scale calcula POSIÇÕES (domínio → pixels), d3-shape calcula os CAMINHOS (`d` do <path>);
 *  o React só renderiza o SVG resultante. Nenhum d3-selection / manipulação de DOM do d3.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ───────────── Número animado: spring do Motion escreve direto no DOM (0 re-renders) ─────────────
   @tech Números animados sem re-render
   `useSpring(mv)` produz um valor que persegue `mv` com física de mola; o listener `spring.on('change')` escreve
   `textContent` do <span> diretamente (60×/s) — o React NÃO re-renderiza a cada frame, só quando `value` muda. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mv = useMotionValue(value)
  const spring = useSpring(mv, { stiffness: 110, damping: 22, mass: 0.6 })

  useEffect(() => mv.set(value), [value, mv])
  useEffect(() => spring.on('change', (v) => ref.current && (ref.current.textContent = format(v))), [spring, format])

  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  )
}

/* ───────────── Sparkline ───────────── */
export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = useId()
  const w = 140
  const h = 40
  // @tech Gráficos com d3-scale + d3-shape
  // `scaleLinear([domínio],[imagem])` mapeia valores → pixels; `line()/area()` com `curveMonotoneX` (curva suave que
  // não "estoura" entre pontos) transformam o array em string de path SVG. `useMemo` recalcula só quando `data` muda.
  // O mesmo padrão gera o LiveChart; `pie()` + `arc()` geram o Donut.
  const { d, a } = useMemo(() => {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const x = scaleLinear([0, data.length - 1], [0, w])
    const y = scaleLinear([min, max === min ? min + 1 : max], [h - 4, 4])
    const l = line<number>().x((_, i) => x(i)).y((v) => y(v)).curve(curveMonotoneX)
    const ar = area<number>().x((_, i) => x(i)).y0(h).y1((v) => y(v)).curve(curveMonotoneX)
    return { d: l(data) ?? '', a: ar(data) ?? '' }
  }, [data])

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={a} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ───────────── Gráfico principal ao vivo ─────────────
   • d3-scale + d3-shape geram os paths; React só renderiza
   • a "janela deslizante" é suavizada com a Web Animations API (translateX linear de 1s por tick)
   • crosshair + tooltip via pointer events */
const fmtTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function LiveChart() {
  const points = useLive((s) => s.points)
  const live = useLive((s) => s.live)
  const wrap = useRef<HTMLDivElement>(null)
  const slide = useRef<SVGGElement>(null)
  const [w, setW] = useState(720)
  const [hover, setHover] = useState<number | null>(null)
  const uid = useId()
  const h = 300
  const m = { t: 18, r: 54, b: 28, l: 52 }
  const iw = Math.max(100, w - m.l - m.r)
  const ih = h - m.t - m.b

  useLayoutEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const { x, yR, yL, areaD, rpsD, p95D } = useMemo(() => {
    const maxR = Math.max(...points.map((p) => p.rps)) * 1.12
    const maxL = Math.max(...points.map((p) => p.p95)) * 1.25
    const x = scaleLinear([0, WINDOW - 1], [0, iw])
    const yR = scaleLinear([0, maxR], [ih, 0])
    const yL = scaleLinear([0, maxL], [ih, 0])
    const mk = (get: (p: Point) => number, y: typeof yR) =>
      line<Point>().x((_, i) => x(i)).y((p) => y(get(p))).curve(curveMonotoneX)(points) ?? ''
    const ar = area<Point>().x((_, i) => x(i)).y0(ih).y1((p) => yR(p.rps)).curve(curveMonotoneX)(points) ?? ''
    return { x, yR, yL, areaD: ar, rpsD: mk((p) => p.rps, yR), p95D: mk((p) => p.p95, yL) }
  }, [points, iw, ih])

  // @tech Janela deslizante com Web Animations API
  // A cada segundo chega 1 ponto novo e os paths são recalculados deslocados 1 passo para a esquerda (saltaria).
  // Para o movimento parecer CONTÍNUO, `element.animate([translateX(+passo) → translateX(0)], { duration: 1000,
  // easing: 'linear' })` no <g> traz o gráfico de volta suavemente durante o segundo seguinte. A animação roda no
  // compositor; o cleanup `a.cancel()` evita acúmulo; reduced-motion desliga.
  // cada novo ponto desloca tudo 1 passo p/ esquerda; animamos de +passo → 0 para parecer contínuo
  const lastT = points.at(-1)?.t
  useEffect(() => {
    if (!live || !slide.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const step = iw / (WINDOW - 1)
    const a = slide.current.animate([{ transform: `translateX(${step}px)` }, { transform: 'translateX(0)' }], {
      duration: 1000,
      easing: 'linear',
    })
    return () => a.cancel()
  }, [lastT, live, iw])

  const hp = hover != null ? points[hover] : null
  const ticks = yR.ticks(4)

  return (
    <div ref={wrap} className="relative select-none">
      <svg width={w} height={h} role="img" aria-label="Requisições por segundo e latência p95 nos últimos 60 segundos">
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-mint)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--color-mint)" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <rect x="0" y="-6" width={iw} height={ih + 12} />
          </clipPath>
        </defs>
        <g transform={`translate(${m.l},${m.t})`}>
          {ticks.map((t) => (
            <g key={t} transform={`translate(0,${yR(t)})`}>
              <line x2={iw} className="stroke-white/[0.07]" strokeDasharray="3 5" />
              <text x={-12} dy="0.32em" textAnchor="end" className="fill-white/40 font-mono text-[10px]">
                {t >= 1000 ? `${t / 1000}k` : t}
              </text>
            </g>
          ))}
          {yL.ticks(4).map((t) => (
            <text key={t} x={iw + 12} y={yL(t)} dy="0.32em" className="fill-iris/70 font-mono text-[10px]">
              {t}ms
            </text>
          ))}

          <g clipPath={`url(#${uid}-clip)`}>
            <g ref={slide}>
              <path d={areaD} fill={`url(#${uid}-fill)`} />
              <path d={rpsD} fill="none" className="stroke-mint" strokeWidth="2.2" strokeLinejoin="round" />
              <path d={p95D} fill="none" className="stroke-iris" strokeWidth="1.6" strokeDasharray="5 4" />
            </g>
          </g>

          {['-60s', '-30s', 'agora'].map((l, i) => (
            <text key={l} x={(iw * i) / 2} y={ih + 20} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} className="fill-white/35 font-mono text-[10px]">
              {l}
            </text>
          ))}

          {hp && hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y2={ih} className="stroke-white/30" />
              <circle cx={x(hover)} cy={yR(hp.rps)} r="5" className="fill-ink-950 stroke-mint" strokeWidth="2" />
              <circle cx={x(hover)} cy={yL(hp.p95)} r="4" className="fill-ink-950 stroke-iris" strokeWidth="2" />
            </g>
          )}

          {/* @tech Crosshair e tooltip com Pointer Events
              Um <rect> transparente cobre a área do gráfico e captura `pointermove`. `x.invert(px)` (d3-scale) converte
              a posição do mouse de volta para o ÍNDICE do ponto mais próximo; com ele desenhamos a linha vertical,
              os dois círculos e o tooltip (limitado às bordas por `Math.min/max`). */}
          <rect
            width={iw}
            height={ih}
            fill="transparent"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setHover(Math.max(0, Math.min(WINDOW - 1, Math.round(x.invert(e.clientX - r.left)))))
            }}
            onPointerLeave={() => setHover(null)}
          />
        </g>
      </svg>

      {hp && hover != null && (
        <div
          className="pointer-events-none absolute top-3 z-10 w-44 rounded-xl border border-white/10 bg-ink-900/90 p-3 text-xs shadow-2xl backdrop-blur-md"
          style={{ left: Math.min(w - 190, Math.max(8, m.l + x(hover) + 14)) }}
        >
          <p className="mb-1.5 font-mono text-[10px] text-white/45">{fmtTime.format(hp.t)}</p>
          <p className="flex justify-between"><span className="text-mint">● req/s</span><b className="tabular-nums">{Math.round(hp.rps).toLocaleString('pt-BR')}</b></p>
          <p className="flex justify-between"><span className="text-iris">● p95</span><b className="tabular-nums">{Math.round(hp.p95)} ms</b></p>
          <p className="flex justify-between text-white/60"><span>erros</span><span className="tabular-nums">{hp.err.toFixed(2)}%</span></p>
        </div>
      )}
    </div>
  )
}

/* ───────────── Donut (pie + arc) ─────────────
   @tech Donut interativo
   `pie().padAngle(0.035)` calcula ângulos de cada fatia; `arc().innerRadius(64).outerRadius(90).cornerRadius(5)` vira
   o path de cada uma. Cada `motion.path` anima entrada (spring escalonada) e destaque: passar o mouse numa fatia OU na
   legenda define `active`, que atenua as demais (opacity .28), amplia a ativa e troca o número central. */
const classMeta = [
  { label: '2xx · sucesso', color: 'var(--color-mint)' },
  { label: '3xx · redirect', color: 'var(--color-iris)' },
  { label: '4xx · cliente', color: 'var(--color-amber-glow)' },
  { label: '5xx · servidor', color: 'var(--color-rose-glow)' },
]

export function Donut({ classes }: { classes: number[] }) {
  const [active, setActive] = useState<number | null>(null)
  const total = classes.reduce((a, b) => a + b, 0)
  const slices = useMemo(() => pie<number>().sort(null).padAngle(0.035)(classes), [classes])
  const gen = useMemo(() => arc().innerRadius(64).outerRadius(90).cornerRadius(5), [])

  return (
    <div className="grid items-center gap-6 @md:grid-cols-[auto_1fr]">
      <svg viewBox="-100 -100 200 200" className="mx-auto size-48" role="img" aria-label="Distribuição de status HTTP">
        {slices.map((s, i) => (
          <motion.path
            key={i}
            d={gen(s as never) ?? ''}
            fill={classMeta[i].color}
            initial={{ opacity: 0, scale: 0.7, rotate: -25 }}
            animate={{ opacity: active == null || active === i ? 1 : 0.28, scale: active === i ? 1.06 : 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 170, damping: 18, delay: active == null ? i * 0.07 : 0 }}
            style={{ transformOrigin: '0 0' }}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
          />
        ))}
        <text textAnchor="middle" y="-2" className="fill-white text-[22px] font-semibold tabular-nums">
          {active == null ? total.toLocaleString('pt-BR') : classes[active].toLocaleString('pt-BR')}
        </text>
        <text textAnchor="middle" y="16" className="fill-white/45 text-[9px] font-mono uppercase tracking-widest">
          {active == null ? 'eventos' : `${((classes[active] / total) * 100).toFixed(1)}%`}
        </text>
      </svg>
      <ul className="grid gap-1.5 text-sm">
        {classMeta.map((c, i) => (
          <li
            key={c.label}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            className="flex cursor-default items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
          >
            <span className="flex items-center gap-2 text-white/75">
              <i className="size-2.5 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
            <b className="font-mono text-xs tabular-nums text-white/90">{((classes[i] / total) * 100).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────── Heatmap (7 × 24) ─────────────
   @tech Heatmap com color-mix()
   Cada célula é um <i> cuja cor é `color-mix(in oklch, mint X%, ink-800)`, com X = volume normalizado (0–100): mais
   eventos → mais verde. `starting:scale-50` + `transitionDelay: índice·4ms` fazem a grade "acender" em onda ao carregar. */
const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function Heatmap({ heat }: { heat: Uint32Array }) {
  const max = useMemo(() => Math.max(...heat), [heat])
  const [tip, setTip] = useState('Passe o mouse nas células')

  return (
    <div>
      <div className="grid grid-cols-[2rem_1fr] gap-x-2 gap-y-[3px]">
        {days.map((d, di) => (
          <div key={d} className="contents">
            <span className="self-center font-mono text-[10px] text-white/40">{d}</span>
            <div className="grid grid-cols-24 gap-[3px]">
              {Array.from({ length: 24 }, (_, h) => {
                const v = heat[di * 24 + h] / max
                return (
                  <i
                    key={h}
                    className="aspect-square rounded-[3px] transition-[opacity,scale] duration-500 starting:scale-50 starting:opacity-0 hover:z-10 hover:scale-150"
                    style={{
                      background: `color-mix(in oklch, var(--color-mint) ${Math.round(v * 100)}%, var(--color-ink-800))`,
                      transitionDelay: `${(di * 24 + h) * 4}ms`,
                    }}
                    onPointerEnter={() => setTip(`${d} · ${String(h).padStart(2, '0')}h — ${heat[di * 24 + h].toLocaleString('pt-BR')} eventos`)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-white/45">
        <span>{tip}</span>
        <span className="flex items-center gap-1.5">
          menos
          <i className="h-2 w-16 rounded-full bg-linear-to-r from-ink-800 to-mint" />
          mais
        </span>
      </div>
    </div>
  )
}
