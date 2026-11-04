/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SchedulerLab.tsx — trabalho pesado SEM travar a página (scheduler.yield)
 * ═══════════════════════════════════════════════════════════════════════════
 *  O experimento roda a MESMA conta duas vezes:
 *   • BLOQUEANTE: um laço síncrono único — a thread principal fica ocupada, nenhum frame é pintado
 *   • FATIADO:    a conta é dividida em pedaços e, entre eles, `scheduler.yield()` devolve o controle
 *                 ao navegador (que pinta, processa cliques, etc.) e retoma logo depois
 *  Para MEDIR a diferença, um laço de requestAnimationFrame registra o intervalo entre quadros durante
 *  a execução. 16,7 ms = 60 fps; centenas de ms = a página congelou.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useState } from 'react'
import { Out, Spec } from './Spec.tsx'
import { getScheduler } from './support.ts'

const SLICES = 40
/** Impede o motor JS de descartar a conta como "código morto". */
let sink = 0

/** Um pedaço de trabalho (~10–25 ms em hardware comum). */
function slice() {
  let x = 0
  for (let i = 1; i < 900_000; i++) x += Math.sqrt(i) * Math.sin(i)
  sink += x
}

// @tech scheduler.yield() para fatiar tarefas longas
// Cede a thread ao navegador entre fatias. Prefere `scheduler.yield()` (retoma com prioridade, na frente
// de outras tarefas pendentes); se não existir, cai em `setTimeout(0)`, que funciona mas retoma no fim da fila.
const yieldToMain = (): Promise<void> => getScheduler()?.yield?.() ?? new Promise((r) => setTimeout(r, 0))

interface Result {
  mode: string
  total: number
  worstGap: number
  frames: number
}

/** Mede intervalos entre frames enquanto `work` roda. */
async function measure(mode: string, work: () => Promise<void> | void): Promise<Result> {
  const stamps: number[] = []
  // ATENÇÃO: usamos performance.now() DENTRO do callback, e não o argumento do rAF. O argumento é o horário
  // de início do frame (decidido pelo compositor), que pode ser anterior à tarefa bloqueante e esconderia o congelamento.
  let raf = requestAnimationFrame(function loop() {
    stamps.push(performance.now())
    raf = requestAnimationFrame(loop)
  })
  const t0 = performance.now()
  await work()
  const total = performance.now() - t0
  // um último frame para fechar a janela de medição
  await new Promise((r) => requestAnimationFrame(r))
  cancelAnimationFrame(raf)
  // O primeiro intervalo parte de `t0`: no modo bloqueante nenhum frame sai durante a tarefa, então o
  // "buraco" aparece entre o início da conta e o primeiro quadro pintado depois dela.
  let prev = t0
  let worst = 0
  for (const s of stamps) {
    worst = Math.max(worst, s - prev)
    prev = s
  }
  return { mode, total, worstGap: worst, frames: stamps.length }
}

export function SchedulerLab() {
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const hasYield = typeof getScheduler()?.yield === 'function'

  const run = async (kind: 'block' | 'slice') => {
    setRunning(kind)
    // deixa o React pintar o estado "rodando…" ANTES de o laço bloqueante começar
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)))
    const res =
      kind === 'block'
        ? await measure('bloqueante', () => {
            for (let i = 0; i < SLICES; i++) slice()
          })
        : await measure('fatiado', async () => {
            for (let i = 0; i < SLICES; i++) {
              slice()
              await yieldToMain()
            }
          })
    setResults((r) => [res, ...r].slice(0, 4))
    setRunning(null)
  }

  return (
    <Spec fig={10} title="Tarefa pesada sem congelar a interface" api="scheduler.yield() · requestAnimationFrame" supported={hasYield} wide spot="nat-fig-10">
      <div className="nat-inline">
        <button type="button" className="nat-btn" disabled={Boolean(running)} onClick={() => void run('block')}>
          {running === 'block' ? 'rodando…' : '▶ bloqueante'}
        </button>
        <button type="button" className="nat-btn nat-btn--accent" disabled={Boolean(running)} onClick={() => void run('slice')}>
          {running === 'slice' ? 'rodando…' : '▶ fatiado'}
        </button>
        <span className="nat-hint">
          {SLICES} fatias de ~15 ms. {hasYield ? 'Usando scheduler.yield().' : 'scheduler.yield indisponível: usando setTimeout(0).'}
        </span>
      </div>
      <table className="nat-table">
        <thead>
          <tr>
            <th>modo</th>
            <th>duração total</th>
            <th>pior intervalo entre frames</th>
            <th>frames pintados</th>
          </tr>
        </thead>
        <tbody>
          {results.length === 0 && (
            <tr>
              <td colSpan={4} className="nat-hint">
                Rode os dois modos e compare.
              </td>
            </tr>
          )}
          {results.map((r, i) => (
            <tr key={i} data-bad={r.worstGap > 100 || undefined}>
              <td>{r.mode}</td>
              <td>{Math.round(r.total)} ms</td>
              <td>{Math.round(r.worstGap)} ms</td>
              <td>{r.frames}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Out label="interpretação">
        {results[0] ? (results[0].worstGap > 100 ? 'a página congelou durante a tarefa' : 'a interface continuou responsiva') : '—'}
      </Out>
    </Spec>
  )
}
