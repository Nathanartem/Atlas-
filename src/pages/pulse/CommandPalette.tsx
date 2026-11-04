import { useEffect, useMemo, useRef, useState } from 'react'

export interface Command {
  id: string
  label: string
  group: string
  hint?: string
  run: () => void
}

/** Busca "fuzzy" mínima: todos os caracteres da query aparecem em ordem. Retorna pontuação (menor = melhor). */
function score(label: string, q: string) {
  if (!q) return 0
  const l = label.toLowerCase()
  let pos = -1
  let s = 0
  for (const ch of q.toLowerCase()) {
    const at = l.indexOf(ch, pos + 1)
    if (at === -1) return Infinity
    s += at - pos
    pos = at
  }
  return s
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CommandPalette.tsx — paleta de comandos (⌘K / Ctrl+K)
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech Command palette (⌘K) com dialog nativo
 * Peças: (1) `score()` — busca fuzzy mínima: cada letra da busca precisa aparecer em ORDEM no rótulo; a pontuação
 * soma as distâncias entre acertos (menor = melhor); (2) `results` — filtra e ordena os comandos com useMemo;
 * (3) navegação por ↑/↓/Enter e `scrollIntoView({ block: 'nearest' })` mantém o item ativo visível;
 * (4) <dialog> nativo: `showModal()` dá top layer, foco preso, Esc e ::backdrop; a animação de entrada vem de
 * classes Tailwind `starting:` (= @starting-style). A lista de comandos é injetada por quem usa (Pulse.tsx),
 * incluindo "ir para página" via `navigate(path, { viewTransition: true })`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const d = dialog.current!
    if (open && !d.open) {
      setQ('')
      setActive(0)
      d.showModal()
    }
    if (!open && d.open) d.close()
  }, [open])

  const results = useMemo(
    () =>
      commands
        .map((c) => ({ c, s: score(`${c.group} ${c.label}`, q) }))
        .filter((r) => r.s !== Infinity)
        .sort((a, b) => a.s - b.s)
        .map((r) => r.c),
    [commands, q],
  )

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, results])

  const run = (c?: Command) => {
    if (!c) return
    onClose()
    queueMicrotask(c.run)
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto mt-[14vh] w-[min(640px,92vw)] overflow-hidden rounded-2xl border border-white/12 bg-ink-900/95 p-0 text-white opacity-0 shadow-[0_40px_120px_-20px_rgb(0_0_0/0.8)] backdrop-blur-2xl transition-[opacity,scale,translate,display,overlay] duration-300 transition-discrete ease-out-expo -translate-y-3 scale-95 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:translate-y-0 open:scale-100 open:opacity-100 starting:open:-translate-y-3 starting:open:scale-95 starting:open:opacity-0"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4">
        <span className="text-white/35" aria-hidden>⌕</span>
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(results.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(results[active])
            }
          }}
          placeholder="Digite um comando ou página…"
          aria-label="Buscar comandos"
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-white/30"
        />
        <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/45">esc</kbd>
      </div>

      <ul ref={list} role="listbox" className="max-h-[50vh] overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
        {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-white/40">Nada encontrado para “{q}”.</li>}
        {results.map((c, i) => (
          <li
            key={c.id}
            role="option"
            aria-selected={i === active}
            onPointerMove={() => setActive(i)}
            onClick={() => run(c)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 aria-selected:bg-mint/12 aria-selected:text-white"
          >
            <span className="flex items-center gap-3">
              <span className="w-16 font-mono text-[10px] uppercase tracking-wider text-white/35">{c.group}</span>
              {c.label}
            </span>
            {c.hint && <kbd className="font-mono text-[10px] text-white/35">{c.hint}</kbd>}
          </li>
        ))}
      </ul>
    </dialog>
  )
}
