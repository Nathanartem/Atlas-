/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  VitalsLab.tsx — observadores do navegador: desempenho, preferências e tamanho
 * ═══════════════════════════════════════════════════════════════════════════
 *  Três "observatórios" ao vivo:
 *   1. Core Web Vitals (PerformanceObserver): LCP, CLS, long tasks, resposta a eventos
 *   2. Preferências do sistema (matchMedia): tema, movimento, contraste, ponteiro…
 *   3. Tamanho de um elemento (ResizeObserver) — arraste o canto da caixa
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../../lib/hooks.ts'
import { Spec } from './Spec.tsx'

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

interface Vitals {
  lcp: number | null
  cls: number
  longTasks: number
  longMax: number
  slowest: number
}
const INITIAL: Vitals = { lcp: null, cls: 0, longTasks: 0, longMax: 0, slowest: 0 }

/** "good" / "warn" / "bad" segundo os limites públicos do web.dev. */
const grade = (v: number, good: number, ok: number) => (v <= good ? 'good' : v <= ok ? 'warn' : 'bad')

export function VitalsLab() {
  const [v, setV] = useState<Vitals>(INITIAL)
  const supported = typeof PerformanceObserver !== 'undefined'

  // @tech PerformanceObserver (Core Web Vitals ao vivo)
  // Um observador por tipo de entrada: `largest-contentful-paint` (LCP), `layout-shift` (CLS: soma dos
  // deslocamentos SEM interação recente), `longtask` (>50 ms na thread principal) e `event` (latência de
  // interação, base do INP). `buffered: true` entrega também o que aconteceu ANTES de assinarmos.
  // Acumulamos em variáveis locais do efeito e gravamos valores absolutos — assim o StrictMode (que monta
  // o efeito duas vezes) não soma as entradas em dobro.
  useEffect(() => {
    if (!supported) return
    const observers: PerformanceObserver[] = []
    let cls = 0
    let longTasks = 0
    let longMax = 0
    let slowest = 0

    const observe = (type: string, cb: (entries: PerformanceEntryList) => void, extra: object = {}) => {
      try {
        const po = new PerformanceObserver((list) => cb(list.getEntries()))
        po.observe({ type, buffered: true, ...extra } as PerformanceObserverInit)
        observers.push(po)
      } catch {
        /* tipo de entrada não suportado neste navegador */
      }
    }

    observe('largest-contentful-paint', (es) => setV((p) => ({ ...p, lcp: es[es.length - 1].startTime })))
    observe('layout-shift', (es) => {
      for (const e of es as LayoutShiftEntry[]) if (!e.hadRecentInput) cls += e.value
      setV((p) => ({ ...p, cls }))
    })
    observe('longtask', (es) => {
      for (const e of es) {
        longTasks++
        longMax = Math.max(longMax, e.duration)
      }
      setV((p) => ({ ...p, longTasks, longMax }))
    })
    observe(
      'event',
      (es) => {
        for (const e of es) slowest = Math.max(slowest, e.duration)
        setV((p) => ({ ...p, slowest }))
      },
      { durationThreshold: 16 },
    )
    return () => observers.forEach((o) => o.disconnect())
  }, [supported])

  return (
    <Spec fig={13} title="Core Web Vitals desta página, agora" api="PerformanceObserver" supported={supported} spot="nat-fig-13">
      <dl className="nat-vitals">
        <div data-grade={v.lcp === null ? 'none' : grade(v.lcp, 2500, 4000)}>
          <dt>LCP</dt>
          <dd>{v.lcp === null ? '—' : `${Math.round(v.lcp)} ms`}</dd>
        </div>
        <div data-grade={grade(v.cls, 0.1, 0.25)}>
          <dt>CLS</dt>
          <dd>{v.cls.toFixed(3)}</dd>
        </div>
        <div data-grade={v.slowest === 0 ? 'none' : grade(v.slowest, 200, 500)}>
          <dt>interação mais lenta</dt>
          <dd>{v.slowest ? `${Math.round(v.slowest)} ms` : 'clique algo'}</dd>
        </div>
        <div data-grade={v.longTasks === 0 ? 'good' : grade(v.longMax, 100, 300)}>
          <dt>long tasks</dt>
          <dd>{v.longTasks ? `${v.longTasks} · máx ${Math.round(v.longMax)} ms` : '0'}</dd>
        </div>
      </dl>
      <p className="nat-hint">Rode o experimento do FIG. 10 em “bloqueante” e veja as long tasks aparecerem aqui.</p>
    </Spec>
  )
}

/* ───────── Preferências do sistema ───────── */
const QUERIES: [string, string][] = [
  ['tema escuro', '(prefers-color-scheme: dark)'],
  ['menos movimento', '(prefers-reduced-motion: reduce)'],
  ['alto contraste', '(prefers-contrast: more)'],
  ['mouse (hover)', '(hover: hover)'],
  ['toque (pointer coarse)', '(pointer: coarse)'],
  ['app instalado', '(display-mode: standalone)'],
  ['tela em retrato', '(orientation: portrait)'],
  ['cores P3', '(color-gamut: p3)'],
  ['HDR', '(dynamic-range: high)'],
  ['cores forçadas', '(forced-colors: active)'],
]

function Query({ label, query }: { label: string; query: string }) {
  // useMediaQuery usa useSyncExternalStore: atualiza NA HORA quando você muda o tema do SO ou gira o aparelho
  const on = useMediaQuery(query)
  return (
    <li data-on={on || undefined}>
      <i aria-hidden="true" />
      {label}
      <code>{query}</code>
    </li>
  )
}

/** Caixa redimensionável que reporta o próprio tamanho via ResizeObserver. */
function ResizeBox() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // @tech ResizeObserver (reage ao tamanho do ELEMENTO, não da janela)
  // `contentBoxSize` entrega medidas fracionárias sem forçar layout (ao contrário de ler getBoundingClientRect
  // em loop). Base de container queries em JS, gráficos responsivos e virtualização.
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentBoxSize[0].inlineSize, h: e.contentBoxSize[0].blockSize }))
    ro.observe(ref.current!)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="nat-resize">
      <span>
        {Math.round(size.w)} × {Math.round(size.h)} px
      </span>
      <small>arraste o canto ↘</small>
    </div>
  )
}

export function MediaLab() {
  return (
    <Spec fig={14} title="Preferências do sistema e tamanho de elementos" api="matchMedia · ResizeObserver" supported spot="nat-fig-14">
      <div className="nat-split">
        {/* @tech matchMedia reativo com useSyncExternalStore */}
        <ul className="nat-queries" aria-label="Preferências detectadas">
          {QUERIES.map(([label, q]) => (
            <Query key={q} label={label} query={q} />
          ))}
        </ul>
        <div>
          <ResizeBox />
          <p className="nat-hint">Mude o tema do sistema, gire o aparelho ou redimensione a caixa: tudo atualiza sem polling.</p>
        </div>
      </div>
    </Spec>
  )
}
