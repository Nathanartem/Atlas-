import { AnimatePresence, Reorder } from 'motion/react'
import { useActionState, useOptimistic, useState } from 'react'
import { useFormStatus } from 'react-dom'

type Sev = 'baixa' | 'média' | 'alta'
interface Incident {
  id: string
  title: string
  sev: Sev
  pending?: boolean
}

const sevStyle: Record<Sev, string> = {
  baixa: 'bg-mint/15 text-mint',
  média: 'bg-amber-glow/15 text-amber-glow',
  alta: 'bg-rose-glow/15 text-rose-glow',
}

const initial: Incident[] = [
  { id: 'i1', title: 'Latência elevada em payments (sa-east-1)', sev: 'alta' },
  { id: 'i2', title: 'Fila de notificações acumulando', sev: 'média' },
  { id: 'i3', title: 'Certificado do gateway expira em 12 dias', sev: 'baixa' },
]

interface FormState {
  error?: string
  ok?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Incidents.tsx — formulário com React 19 Actions + lista arrastável
 * ═══════════════════════════════════════════════════════════════════════════
 *  Ciclo de uma submissão (siga na ordem):
 *   1. `<form action={action}>` — o React chama a Action quando o form é enviado (sem onSubmit/preventDefault)
 *   2. a Action valida; se ok chama `addOptimistic(incident)` → o item aparece AGORA com "salvando…"
 *   3. `await sleep(1300)` simula a rede; se o título contém "erro"/"falha" a Action RETORNA um erro
 *   4. com sucesso: `setItems` grava o item de verdade → o otimista é substituído pelo real
 *      com falha: nada é gravado → `useOptimistic` descarta o item otimista sozinho (rollback automático)
 *   5. o valor retornado vira `result` (useActionState) e é mostrado em `aria-live`
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * useFormStatus lê o estado do <form> pai — sem prop drilling
 * @tech useFormStatus
 * Chamado num componente FILHO do <form> (aqui `Submit`), devolve `{ pending }`: true enquanto a Action roda.
 * O botão se desabilita e mostra o spinner sem receber nenhuma prop do formulário.
 */
function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending && <span className="size-3.5 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />}
      {pending ? 'Enviando…' : 'Registrar'}
    </button>
  )
}

export function Incidents() {
  const [items, setItems] = useState(initial)

  // @tech useOptimistic
  // `useOptimistic(valorReal, reducer)` devolve uma VERSÃO TEMPORÁRIA do estado: dentro de uma Action, chamar
  // `addOptimistic(item)` mostra o item imediatamente; quando a Action termina, o React volta ao valor real
  // (`items`). Se a Action falhou e não gravou nada, o item otimista simplesmente desaparece — rollback sem código.
  // O item aparece NA HORA (otimista) e some sozinho se a ação falhar
  const [optimistic, addOptimistic] = useOptimistic(items, (state, next: Incident) =>
    state.some((i) => i.id === next.id) ? state : [{ ...next, pending: true }, ...state],
  )

  // @tech Actions: form action + useActionState
  // `useActionState(fn, estadoInicial)` devolve `[estado, action]`. `action` vai direto em `<form action={…}>`: o
  // React monta o FormData, chama `fn(estadoAnterior, formData)` dentro de uma transição e, ao terminar, guarda o
  // retorno em `estado` (aqui `{ error?, ok? }`). Substitui onSubmit + preventDefault + useState(loading/error).
  const [result, action] = useActionState(async (_prev: FormState, form: FormData): Promise<FormState> => {
    const title = String(form.get('title') ?? '').trim()
    const sev = String(form.get('sev')) as Sev
    if (title.length < 3) return { error: 'Descreva o incidente (mín. 3 caracteres).' }

    const incident: Incident = { id: crypto.randomUUID(), title, sev }
    addOptimistic(incident)
    await sleep(1300) // "rede"
    if (/erro|falha/i.test(title)) {
      return { error: 'Servidor recusou (simulado: títulos com “erro”/“falha” falham). O item otimista foi revertido.' }
    }
    setItems((p) => [incident, ...p])
    return { ok: 'Incidente registrado.' }
  }, {})

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <form action={action} className="grid grid-cols-1 gap-3 @md:grid-cols-[minmax(0,1fr)_auto_auto] @md:items-start">
        <div className="grid gap-1.5">
          <input
            name="title"
            placeholder='Novo incidente… (tente incluir a palavra "erro")'
            aria-label="Título do incidente"
            className="h-9 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-sm outline-none transition placeholder:text-white/30 focus:border-mint/60 focus:ring-2 focus:ring-mint/20"
          />
          <p className="min-h-4 text-xs" aria-live="polite">
            {result.error && <span className="text-rose-glow">{result.error}</span>}
            {result.ok && !result.error && <span className="text-mint">{result.ok}</span>}
          </p>
        </div>
        <select
          name="sev"
          defaultValue="média"
          aria-label="Severidade"
          className="h-9 rounded-lg border border-white/10 bg-ink-950/60 px-2 text-sm outline-none focus:border-mint/60"
        >
          <option>baixa</option>
          <option>média</option>
          <option>alta</option>
        </select>
        <Submit />
      </form>

      <p className="font-mono text-[11px] text-white/40">↕ Arraste para priorizar (Reorder do Motion)</p>

      {/* @tech Reorder (drag para priorizar)
          `Reorder.Group` + `Reorder.Item` (Motion) dão arrastar-e-soltar vertical com troca de lugar animada;
          `values`/`onReorder` mantêm a ordem no estado. `AnimatePresence` anima a SAÍDA (`exit`) de itens removidos.
          Itens pendentes (`dragListener={false}`) não podem ser arrastados; o botão × usa `stopPropagation` para
          não iniciar um arrasto. */}
      <Reorder.Group
        axis="y"
        values={optimistic}
        onReorder={(next) => setItems(next.filter((i) => !i.pending))}
        className="grid grid-cols-1 gap-2"
      >
        <AnimatePresence initial={false}>
          {optimistic.map((it) => (
            <Reorder.Item
              key={it.id}
              value={it}
              dragListener={!it.pending}
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: it.pending ? 0.55 : 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              whileDrag={{ scale: 1.03, boxShadow: '0 20px 50px -10px rgb(0 0 0 / 0.6)', zIndex: 10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="flex cursor-grab items-center gap-3 rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-3 active:cursor-grabbing"
            >
              <span className="select-none text-white/25" aria-hidden>
                ⠿
              </span>
              <span className={`rounded-md px-2 py-0.5 font-mono text-[10.5px] uppercase ${sevStyle[it.sev]}`}>{it.sev}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/90">{it.title}</span>
              {it.pending ? (
                <span className="font-mono text-[10px] text-amber-glow">salvando…</span>
              ) : (
                <button
                  type="button"
                  aria-label={`Remover: ${it.title}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setItems((p) => p.filter((i) => i.id !== it.id))}
                  className="grid size-6 place-items-center rounded-md text-white/30 transition hover:bg-white/10 hover:text-white"
                >
                  ×
                </button>
              )}
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  )
}
