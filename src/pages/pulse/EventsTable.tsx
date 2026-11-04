import { useVirtualizer } from '@tanstack/react-virtual'
import { useDeferredValue, useMemo, useRef, useState, useTransition, type Ref } from 'react'
import { REGIONS, SERVICES, type DatasetMessage } from './dataset.ts'

type SortKey = 'ts' | 'id' | 'service' | 'region' | 'status' | 'latency' | 'amount'
type Cls = 'all' | '2xx' | '3xx' | '4xx' | '5xx'

const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const cols: { key: SortKey; label: string; cls?: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'ts', label: 'Quando' },
  { key: 'service', label: 'Serviço' },
  { key: 'region', label: 'Região', cls: 'hidden @2xl:block' },
  { key: 'status', label: 'Status' },
  { key: 'latency', label: 'Latência', cls: 'hidden @xl:block' },
  { key: 'amount', label: 'Valor', cls: 'hidden @xl:block text-right' },
]
const GRID = 'grid grid-cols-[5.5rem_9.5rem_1fr_5rem] @xl:grid-cols-[5.5rem_9.5rem_1fr_5rem_8rem_6rem] @2xl:grid-cols-[5.5rem_9.5rem_1fr_7rem_5rem_9rem_6rem]'

/**
 * React 19: `ref` é uma prop comum — não precisa mais de forwardRef
 * @tech ref como prop (sem forwardRef)
 * Antes do React 19, passar `ref` a um componente de função exigia `forwardRef(...)`. Agora `ref` chega em `props`
 * como qualquer outra; aqui ele é repassado ao <input> para o ⌘K/atalho "/" conseguir focar a busca.
 */
function SearchInput({ ref, ...props }: React.ComponentProps<'input'> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      {...props}
      className="h-9 w-full rounded-lg border border-white/10 bg-ink-950/60 px-3 font-mono text-xs text-white outline-none transition placeholder:text-white/30 focus:border-mint/60 focus:ring-2 focus:ring-mint/20"
    />
  )
}

function badge(code: number) {
  if (code >= 500) return 'bg-rose-glow/15 text-rose-glow'
  if (code >= 400) return 'bg-amber-glow/15 text-amber-glow'
  if (code >= 300) return 'bg-iris/15 text-iris'
  return 'bg-mint/15 text-mint'
}

/**
 * Tabela de eventos: filtro + ordenação + virtualização sobre 50.000 linhas.
 * Fluxo: `query/cls/sort` (state) → `result` (useMemo: índices filtrados/ordenados) → `virt` (linhas visíveis).
 */
export function EventsTable({ ds, inputRef }: { ds: DatasetMessage; inputRef?: Ref<HTMLInputElement> }) {
  const [query, setQuery] = useState('')
  // @tech useDeferredValue
  // `deferredQuery` fica "atrasado" em relação a `query`: o React atualiza o <input> NA HORA (prioridade alta) e
  // recalcula a filtragem pesada depois, em prioridade baixa e interrompível. Digitar nunca engasga; `stale`
  // (query !== deferredQuery) acende o contador em âmbar enquanto o resultado velho ainda é exibido.
  const deferredQuery = useDeferredValue(query) // a digitação nunca trava: a filtragem roda em prioridade menor
  const [cls, setCls] = useState<Cls>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'ts', dir: -1 })
  // @tech useTransition
  // Ordenar 50 mil linhas é caro. Envolver o `setSort` em `startSorting(() => …)` o marca como TRANSIÇÃO: o React
  // mantém a UI responsiva (e pode abandonar o render se você clicar de novo); `sorting` (isPending) dá o feedback.
  const [sorting, startSorting] = useTransition()
  const scroller = useRef<HTMLDivElement>(null)

  /** Filtra e ordena ÍNDICES (Uint32Array) em vez de objetos — 50 mil linhas em poucos ms. */
  const result = useMemo(() => {
    const t0 = performance.now()
    const q = deferredQuery.trim().toLowerCase()
    const svcOk = SERVICES.map((s) => q !== '' && s.includes(q))
    const regOk = REGIONS.map((r) => q !== '' && r.includes(q))
    const numeric = /^\d+$/.test(q)
    const wantClass = cls === 'all' ? 0 : Number(cls[0])

    const idx = new Uint32Array(ds.n)
    let n = 0
    for (let i = 0; i < ds.n; i++) {
      if (wantClass && Math.floor(ds.status[i] / 100) !== wantClass) continue
      if (q && !(svcOk[ds.service[i]] || regOk[ds.region[i]] || (numeric && String(ds.id[i]).includes(q)) || (numeric && String(ds.status[i]).startsWith(q)))) continue
      idx[n++] = i
    }
    const out = idx.subarray(0, n)
    if (!(sort.key === 'ts' && sort.dir === -1)) {
      const col = ds[sort.key]
      const d = sort.dir
      out.sort((a, b) => (col[a] - col[b]) * d || a - b)
    }
    return { idx: out, ms: performance.now() - t0 }
  }, [ds, deferredQuery, cls, sort])

  // @tech Virtualização (TanStack Virtual)
  // Só as linhas visíveis (+ `overscan: 14` de folga) existem no DOM — ~30 em vez de 50.000. O contêiner interno
  // tem a ALTURA TOTAL (`virt.getTotalSize()`) para a barra de rolagem ser fiel, e cada linha é posicionada com
  // `translateY(v.start)`. `estimateSize: 44` é a altura fixa de cada linha.
  const virt = useVirtualizer({
    count: result.idx.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 44,
    overscan: 14,
  })

  const stale = query !== deferredQuery

  return (
    <div className="@container">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar serviço, região, ID, status…"
            aria-label="Buscar eventos"
          />
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Classe de status">
          {(['all', '2xx', '3xx', '4xx', '5xx'] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cls === c}
              onClick={() => setCls(c)}
              className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-white/60 transition hover:border-white/25 hover:text-white aria-pressed:border-mint/60 aria-pressed:bg-mint/15 aria-pressed:text-mint"
            >
              {c === 'all' ? 'todos' : c}
            </button>
          ))}
        </div>
        <p className="ml-auto font-mono text-[11px] text-white/45" aria-live="polite">
          <b className={stale || sorting ? 'text-amber-glow' : 'text-mint'}>{result.idx.length.toLocaleString('pt-BR')}</b> de{' '}
          {ds.n.toLocaleString('pt-BR')} · filtrado em {result.ms.toFixed(1)} ms · {virt.getVirtualItems().length} linhas no DOM
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950/50">
        <div className={`${GRID} gap-3 border-b border-white/10 bg-ink-900/80 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-wider text-white/45`}>
          {cols.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`${c.cls ?? ''} cursor-pointer text-left uppercase transition hover:text-white ${sort.key === c.key ? 'text-mint' : ''}`}
              onClick={() =>
                startSorting(() =>
                  setSort((s) => (s.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: c.key === 'latency' || c.key === 'amount' ? -1 : 1 })),
                )
              }
            >
              {c.label} {sort.key === c.key && (sort.dir === 1 ? '↑' : '↓')}
            </button>
          ))}
        </div>

        <div ref={scroller} className="relative h-[460px] overflow-auto overscroll-contain" data-lenis-prevent>
          <div style={{ height: virt.getTotalSize() }} className={`relative w-full transition-opacity ${stale || sorting ? 'opacity-60' : ''}`}>
            {virt.getVirtualItems().map((v) => {
              const i = result.idx[v.index]
              const code = ds.status[i]
              const lat = ds.latency[i]
              return (
                <div
                  key={v.key}
                  className={`${GRID} absolute inset-x-0 items-center gap-3 border-b border-white/[0.04] px-4 text-[13px] hover:bg-white/[0.04]`}
                  style={{ height: v.size, transform: `translateY(${v.start}px)` }}
                >
                  <span className="font-mono text-xs text-white/50">#{ds.id[i]}</span>
                  <span className="font-mono text-xs text-white/70">{fmt.format(ds.ts[i])}</span>
                  <span className="truncate font-medium text-white/90">{SERVICES[ds.service[i]]}</span>
                  <span className="hidden font-mono text-xs text-white/55 @2xl:block">{REGIONS[ds.region[i]]}</span>
                  <span>
                    <b className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${badge(code)}`}>{code}</b>
                  </span>
                  <span className="hidden items-center gap-2 @xl:flex">
                    <i className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <i
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (lat / 1200) * 100)}%`,
                          background: lat > 600 ? 'var(--color-rose-glow)' : lat > 250 ? 'var(--color-amber-glow)' : 'var(--color-mint)',
                        }}
                      />
                    </i>
                    <span className="w-12 text-right font-mono text-xs tabular-nums text-white/70">{Math.round(lat)}ms</span>
                  </span>
                  <span className="hidden text-right font-mono text-xs tabular-nums text-white/70 @xl:block">{brl.format(ds.amount[i])}</span>
                </div>
              )
            })}
          </div>
          {result.idx.length === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-white/40">Nenhum evento encontrado.</p>}
        </div>
      </div>
    </div>
  )
}
