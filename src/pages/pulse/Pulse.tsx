import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'

import { motion } from 'motion/react'
import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { pages } from '../../data/pages.ts'
import { AnimatedNumber, Donut, Heatmap, LiveChart, Sparkline } from './charts.tsx'
import { CommandPalette, type Command } from './CommandPalette.tsx'
import { loadDataset, type DatasetMessage } from './dataset.ts'
import { EventsTable } from './EventsTable.tsx'
import { Incidents } from './Incidents.tsx'
import { useLive } from './store.ts'

/** Dispara o "feed" a cada segundo enquanto `live` estiver ligado. */
function useLiveFeed() {
  const live = useLive((s) => s.live)
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => useLive.getState().tick(), 1000)
    return () => clearInterval(id)
  }, [live])
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  04 · PULSE — dashboard em tempo real com React 19 (rota "/pulse")
 * ═══════════════════════════════════════════════════════════════════════════
 *  Mapa do arquivo
 *   useLiveFeed ... dispara o `tick()` do store a cada 1 s (feed ao vivo simulado)
 *   Card .......... cartão padrão (Tailwind v4: container query + entrada com `starting:`)
 *   Kpis .......... 4 métricas com número animado e sparkline (assina `points` do Zustand)
 *   Dashboard ..... lê o dataset do Web Worker com `use(promise)` e monta gráficos, incidentes e a tabela
 *   Skeleton ...... fallback do Suspense enquanto o worker gera os 50.000 eventos
 *   Pulse (default) estado da paleta ⌘K, atalhos, comandos e layout geral
 *
 *  Outros arquivos:  store.ts (Zustand) · dataset.ts + dataset.worker.ts · charts.tsx (d3 + SVG) ·
 *                    EventsTable.tsx (virtualizada) · Incidents.tsx (Actions) · CommandPalette.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Cartão padrão: entra com @starting-style (classe `starting:` do Tailwind), escalonado por `i`.
 * @tech Tailwind v4: tokens, @container e starting:
 *  - tokens: cores `bg-ink-900`, `text-mint`, `border-white/10` vêm do `@theme` em index.css (OKLCH)
 *  - `@container` na classe do cartão + variantes `@md:`/`@xl:` nos filhos (charts.tsx, EventsTable.tsx)
 *    respondem à largura DO CARTÃO, não da tela
 *  - `starting:translate-y-6 starting:opacity-0` = @starting-style: o cartão nasce deslocado/transparente e
 *    transiciona até o estado normal; `transitionDelay: i·70ms` escalona a entrada
 *  - variantes de estado: `aria-pressed:`, `aria-selected:`, `open:` estilizam a partir de atributos ARIA/HTML
 */
function Card({
  title,
  right,
  children,
  className = '',
  i = 0,
  id,
  spot,
}: {
  title: string
  right?: ReactNode
  children: ReactNode
  className?: string
  i?: number
  id?: string
  spot?: string
}) {
  return (
    <section
      id={id}
      data-spot={spot}
      style={{ transitionDelay: `${i * 70}ms` }}
      className={`@container min-w-0 scroll-mt-24 rounded-2xl border border-white/10 bg-ink-900/55 p-5 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.9)] backdrop-blur-sm transition-[opacity,translate] duration-700 ease-out-expo starting:translate-y-6 starting:opacity-0 ${className}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold tracking-tight text-white/80">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  )
}

/* ───────────────────── KPIs ───────────────────── */
const nf = (n: number) => Math.round(n).toLocaleString('pt-BR')

function Kpis() {
  const points = useLive((s) => s.points)
  const last = points.at(-1)!
  const prevAvg = (k: 'rps' | 'p95' | 'err' | 'users') => points.slice(-11, -1).reduce((a, p) => a + p[k], 0) / 10

  const items = [
    { k: 'rps', label: 'Requisições / s', fmt: nf, color: 'var(--color-mint)', good: 1 },
    { k: 'p95', label: 'Latência p95', fmt: (n: number) => `${Math.round(n)} ms`, color: 'var(--color-iris)', good: -1 },
    { k: 'err', label: 'Taxa de erro', fmt: (n: number) => `${n.toFixed(2)}%`, color: 'var(--color-rose-glow)', good: -1 },
    { k: 'users', label: 'Usuários ativos', fmt: nf, color: 'var(--color-amber-glow)', good: 1 },
  ] as const

  return (
    <div data-spot="pulse-kpis" className="col-span-12 grid grid-cols-12 gap-4">
      {items.map((it, i) => {
        const v = last[it.k]
        const delta = ((v - prevAvg(it.k)) / prevAvg(it.k)) * 100
        const good = delta * it.good >= 0
        return (
          <Card key={it.k} title={it.label} i={i} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <p className="text-[2rem] font-semibold leading-none tracking-tight">
              <AnimatedNumber value={v} format={it.fmt} />
            </p>
            <p className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] ${good ? 'bg-mint/12 text-mint' : 'bg-rose-glow/12 text-rose-glow'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
              <span className="text-white/35">vs 10s</span>
            </p>
            <div className="mt-3">
              <Sparkline data={points.slice(-30).map((p) => p[it.k])} color={it.color} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ───────────────────── Dashboard (usa o dataset via `use`) ───────────────────── */
function Dashboard({ promise, inputRef }: { promise: Promise<DatasetMessage>; inputRef: React.RefObject<HTMLInputElement | null> }) {
  // @tech use(promise) + Suspense
  // React 19: `use` lê a Promise e SUSPENDE até o Web Worker responder. A Promise precisa ter a MESMA referência
  // entre renders (por isso `loadDataset()` guarda em cache e Pulse usa `useMemo`): senão cada render criaria
  // uma nova e suspenderia para sempre. O <Suspense fallback={<Skeleton/>}> (em Pulse) mostra o esqueleto.
  const ds = use(promise)
  const toggleLive = useLive((s) => s.toggleLive)
  const live = useLive((s) => s.live)

  return (
    <>
      <Kpis />

      <Card
        title="Tráfego ao vivo"
        i={4}
        spot="pulse-chart"
        className="col-span-12 xl:col-span-8"
        right={
          <div className="flex items-center gap-3 font-mono text-[11px] text-white/50">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-mint" />req/s</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-iris" />p95</span>
            <button
              type="button"
              onClick={toggleLive}
              className="rounded-md border border-white/10 px-2 py-1 transition hover:border-white/30 hover:text-white"
            >
              {live ? '❚❚ pausar' : '▶ retomar'}
            </button>
          </div>
        }
      >
        <LiveChart />
      </Card>

      <Card title="Status HTTP (50k eventos)" i={5} spot="pulse-donut" className="col-span-12 xl:col-span-4">
        <Donut classes={ds.classes} />
      </Card>

      <Card id="heatmap" title="Volume por dia e hora" i={6} spot="pulse-heatmap" className="col-span-12 lg:col-span-7">
        <Heatmap heat={ds.heat} />
      </Card>

      <Card id="incidentes" title="Incidentes · Actions + useOptimistic" i={7} spot="pulse-incidents" className="col-span-12 lg:col-span-5">
        <Incidents />
      </Card>

      <Card
        id="eventos"
        title="Eventos · virtualizados (TanStack Virtual)"
        i={8}
        spot="pulse-table"
        className="col-span-12"
        right={<span className="font-mono text-[11px] text-white/40">gerados em {ds.genMs.toFixed(0)} ms num Web Worker</span>}
      >
        <EventsTable ds={ds} inputRef={inputRef} />
      </Card>
    </>
  )
}

// @tech Skeleton enquanto o worker trabalha
// Fallback do <Suspense>: blocos cinza com `animate-pulse` do Tailwind nas MESMAS posições da grade final, para o
// layout não "pular" quando os dados chegam.
function Skeleton() {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="col-span-12 h-44 animate-pulse rounded-2xl bg-ink-900/60 sm:col-span-6 lg:col-span-3" />
      ))}
      <div className="col-span-12 h-80 animate-pulse rounded-2xl bg-ink-900/60 xl:col-span-8" />
      <div className="col-span-12 h-80 animate-pulse rounded-2xl bg-ink-900/60 xl:col-span-4" />
      <p className="col-span-12 text-center font-mono text-xs text-white/40">Web Worker gerando 50.000 eventos…</p>
    </>
  )
}

export default function Pulse() {
  useLiveFeed()
  const navigate = useNavigate()
  const live = useLive((s) => s.live)
  const toggleLive = useLive((s) => s.toggleLive)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const promise = useMemo(() => loadDataset(), [])

  // ⌘K / Ctrl+K em qualquer lugar da página
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const goto = useCallback((id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), [])

  const commands: Command[] = useMemo(
    () => [
      { id: 'live', group: 'feed', label: live ? 'Pausar feed ao vivo' : 'Retomar feed ao vivo', run: toggleLive },
      { id: 'search', group: 'tabela', label: 'Buscar nos eventos', hint: '/', run: () => { goto('eventos'); setTimeout(() => searchRef.current?.focus(), 450) } },
      { id: 'heat', group: 'ir para', label: 'Heatmap de volume', run: () => goto('heatmap') },
      { id: 'inc', group: 'ir para', label: 'Incidentes', run: () => goto('incidentes') },
      ...pages.map((p) => ({
        id: p.id,
        group: 'página',
        label: `${p.number} · ${p.name} — ${p.tagline}`,
        run: () => navigate(p.path, { viewTransition: true }),
      })),
    ],
    [live, toggleLive, goto, navigate],
  )

  return (
    <div
      data-spot-page
      data-spot="pulse-page"
      className="min-h-screen bg-ink-950 bg-[radial-gradient(60rem_40rem_at_85%_-10%,oklch(0.45_0.15_165/0.25),transparent),radial-gradient(50rem_40rem_at_0%_20%,oklch(0.4_0.18_285/0.2),transparent)] font-sans text-white antialiased"
    >
      {/* @tech Título do documento no componente (React 19)
          React 19 "eleva" (hoist) `<title>`, `<meta>` e `<link>` renderizados em QUALQUER componente para o <head>.
          Cada página declara o próprio título no JSX — sem react-helmet. */}
      <title>Atlas — Pulse</title>

      <header data-spot="pulse-header" className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-4 pt-5 pr-40 sm:px-8 sm:pr-44">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-mint to-iris text-ink-950">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12h4l3-8 5 16 3-8h5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none tracking-tight">Pulse</h1>
            <p className="mt-1 font-mono text-[10.5px] text-white/40">observabilidade · React 19</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLive}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] transition hover:border-white/25"
        >
          <span className="relative flex size-2">
            {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />}
            <span className={`relative inline-flex size-2 rounded-full ${live ? 'bg-mint' : 'bg-white/30'}`} />
          </span>
          {live ? 'AO VIVO' : 'PAUSADO'}
        </button>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          data-spot="pulse-cmd"
          className="ml-auto flex h-9 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] pr-2 pl-3 text-sm text-white/50 transition hover:border-white/25 hover:text-white"
        >
          Buscar comandos…
          <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </button>
      </header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto grid max-w-[1500px] grid-cols-12 gap-4 px-4 pt-6 pb-40 sm:px-8"
      >
        <Suspense fallback={<Skeleton />}>
          <Dashboard promise={promise} inputRef={searchRef} />
        </Suspense>
      </motion.main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  )
}
