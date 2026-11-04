/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  10 · TERMINAL — um shell retrô que navega pelo próprio site
 * ═══════════════════════════════════════════════════════════════════════════
 *  Mapa do arquivo
 *   1. Boot ............. sequência de inicialização (assíncrona e cancelável)
 *   2. DonutBlock ....... bloco ASCII animado impresso pelo comando `donut`
 *   3. Terminal (default) estado, teclado (histórico/Tab/Ctrl+L), render das linhas e atalhos
 *
 *  Onde está o quê
 *   • commands.ts ... parser + comandos + autocompletar   • crt-element.ts ... <atlas-crt> (Web Component)
 *   • donut.ts ...... matemática do toro ASCII            • matrix.ts ......... chuva de caracteres
 *   • terminal.css .. fósforo, glow, aberração cromática
 * ═══════════════════════════════════════════════════════════════════════════
 */
import '@fontsource-variable/jetbrains-mono/wght.css'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { pages } from '../../data/pages.ts'
import { totalTechniques } from '../../data/techniques.ts'
import { commands, complete, execute, TINTS, type Ctx, type OutLine } from './commands.ts'
import { defineCrt } from './crt-element.ts'
import { renderDonut } from './donut.ts'
import { startMatrix } from './matrix.ts'
import './terminal.css'

// Registra <atlas-crt> assim que o módulo carrega (idempotente: seguro com HMR/StrictMode)
defineCrt()

type Entry = OutLine & { id: number }
type Action = { type: 'add'; lines: OutLine[] } | { type: 'clear' }

let seq = 0
// useReducer evita closures velhas: várias respostas assíncronas podem chegar "ao mesmo tempo"
const reducer = (state: Entry[], a: Action): Entry[] =>
  a.type === 'clear' ? [] : [...state, ...a.lines.map((l) => ({ ...l, id: ++seq }))]

/* ───────────────────────── 1. BOOT ───────────────────────── */
const BOOT: OutLine[] = [
  { t: 'text', s: 'ATLAS BIOS v10.0 — teste de memória... ok', tone: 'dim' },
  { t: 'text', s: `detectando ${pages.length} mundos... ok`, tone: 'dim' },
  { t: 'text', s: `indexando ${totalTechniques} técnicas... ok`, tone: 'dim' },
  { t: 'text', s: 'montando /dev/front... ok', tone: 'dim' },
  { t: 'text', s: '' },
  { t: 'text', s: 'Bem-vindo ao terminal do Atlas.', tone: 'accent' },
  { t: 'text', s: 'Digite `help`, pressione Tab para completar, ou toque num atalho abaixo.' },
  { t: 'text', s: '' },
]

const CHIPS = ['help', 'ls', 'open mundi', 'techniques terminal', 'neofetch', 'donut', 'matrix', 'stack']

/* ───────────────────────── 2. DONUT ───────────────────────── */
function DonutBlock() {
  const pre = useRef<HTMLPreElement>(null)
  useEffect(() => {
    const el = pre.current!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let A = 1
    let B = 1
    let raf = 0
    const draw = () => {
      el.textContent = renderDonut(A, B).join('\n')
      A += 0.045
      B += 0.025
    }
    draw()
    if (!reduced) {
      const loop = () => {
        draw()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    return () => cancelAnimationFrame(raf)
  }, [])
  return <pre ref={pre} className="term-donut" aria-hidden="true" />
}

/* ───────────────────────── 3. TERMINAL ───────────────────────── */
export default function Terminal() {
  const navigate = useNavigate()
  const [lines, dispatch] = useReducer(reducer, [])
  const [input, setInput] = useState('')
  const [ready, setReady] = useState(false)
  const [power, setPower] = useState<'on' | 'off'>('off')
  const [tint, setTint] = useState(TINTS.green)
  const [matrix, setMatrix] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const matrixCanvas = useRef<HTMLCanvasElement>(null)
  const matrixOn = useRef(false)
  const history = useRef<string[]>([])
  const histIdx = useRef(-1) // -1 = digitando; 0..n-1 = navegando no histórico
  const draft = useRef('') // o que estava digitado antes de apertar ↑

  // TV "liga" logo após montar (o atributo power dispara a transição CSS no Shadow DOM)
  useEffect(() => {
    const id = setTimeout(() => setPower('on'), 80)
    return () => clearTimeout(id)
  }, [])

  // @tech Sequência de boot assíncrona e cancelável
  // Cada linha entra num setTimeout encadeado. Qualquer tecla (ou reduced-motion) "pula" a animação e
  // despeja o resto de uma vez. O cleanup cancela os timers — e como o StrictMode monta duas vezes em dev,
  // o efeito começa com `clear` para não duplicar linhas.
  useEffect(() => {
    dispatch({ type: 'clear' })
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let i = 0
    let timer = 0
    let done = false
    const flush = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      dispatch({ type: 'add', lines: BOOT.slice(i) })
      setReady(true)
    }
    const step = () => {
      if (i >= BOOT.length) return flush()
      dispatch({ type: 'add', lines: [BOOT[i++]] })
      timer = window.setTimeout(step, 150)
    }
    if (reduced) flush()
    else {
      timer = window.setTimeout(step, 500)
      addEventListener('keydown', flush, { once: true })
    }
    return () => {
      done = true
      clearTimeout(timer)
      removeEventListener('keydown', flush)
    }
  }, [])

  // foca o campo quando o boot termina (em telas de toque o teclado virtual só abre se o usuário tocar)
  useEffect(() => {
    if (ready && !matchMedia('(pointer: coarse)').matches) inputRef.current?.focus()
  }, [ready])

  // sempre mostra a última linha
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, input])

  // chuva de caracteres: liga/desliga o canvas
  useEffect(() => {
    if (!matrix || !matrixCanvas.current) return
    return startMatrix(matrixCanvas.current, tint)
  }, [matrix, tint])

  // O contexto que os comandos recebem. Só usa setters estáveis e refs, então memoizar por `navigate`
  // mantém a identidade de `run` estável (os chips e o submit não recriam handlers à toa).
  const ctx = useMemo<Ctx>(
    () => ({
      // @tech Navegação programática com View Transition
      // `navigate(path, { viewTransition: true })` — o mesmo círculo de revelação do dock, disparado por texto.
      navigate: (path) => navigate(path, { viewTransition: true }),
      setTint: (name) => {
        const c = TINTS[name]
        if (c) setTint(c)
        return Boolean(c)
      },
      toggleMatrix: () => {
        matrixOn.current = !matrixOn.current
        setMatrix(matrixOn.current)
        return matrixOn.current
      },
      clear: () => dispatch({ type: 'clear' }),
      history: () => history.current,
    }),
    [navigate],
  )

  const run = useCallback(
    async (line: string) => {
      const trimmed = line.trim()
      dispatch({ type: 'add', lines: [{ t: 'cmd', s: line }] })
      if (!trimmed) return
      history.current.push(trimmed)
      histIdx.current = -1
      const out = await execute(trimmed, ctx)
      if (out.length) dispatch({ type: 'add', lines: out })
    },
    [ctx],
  )

  // @tech Histórico de comandos com ↑/↓, Tab e Ctrl+L
  // `histIdx` aponta para o item do histórico em exibição (−1 = linha em edição, guardada em `draft`).
  // Tab usa `complete()` (prefixo comum + lista de opções); Ctrl+L limpa; Ctrl+C descarta a linha.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const h = history.current
    if (e.key === 'ArrowUp' && h.length) {
      e.preventDefault()
      if (histIdx.current === -1) draft.current = input
      histIdx.current = Math.min(h.length - 1, histIdx.current + 1)
      setInput(h[h.length - 1 - histIdx.current])
    } else if (e.key === 'ArrowDown' && histIdx.current >= 0) {
      e.preventDefault()
      histIdx.current -= 1
      setInput(histIdx.current === -1 ? draft.current : h[h.length - 1 - histIdx.current])
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const { value, options } = complete(input)
      setInput(value)
      if (options.length) dispatch({ type: 'add', lines: [{ t: 'text', s: options.join('   '), tone: 'dim' }] })
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      dispatch({ type: 'clear' })
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      dispatch({ type: 'add', lines: [{ t: 'cmd', s: `${input}^C` }] })
      setInput('')
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const line = input
    setInput('')
    void run(line)
  }

  return (
    <main className="term" data-spot-page data-spot="term-page" style={{ '--crt-tint': tint } as React.CSSProperties}>
      <title>Atlas — Terminal</title>

      {/* @tech Custom Element no React 19 (atributos e slot)
          O React 19 reconhece elementos customizados: strings viram atributos, funções/objetos viram
          propriedades. O conteúdo filho vai para o <slot> do Shadow DOM. */}
      <atlas-crt power={power} className="term-crt" data-spot="term-crt">
        <div className="term-screen" onClick={() => inputRef.current?.focus()}>
          {matrix && <canvas ref={matrixCanvas} className="term-matrix" aria-hidden="true" />}

          <div ref={scroller} className="term-scroll">
            {/* @tech Saída de terminal acessível (role log)
                `role="log"` já implica aria-live="polite": leitores de tela anunciam só o que for ACRESCENTADO. */}
            <div role="log" className="term-out" data-spot="term-out">
              {lines.map((l) => {
                switch (l.t) {
                  case 'cmd':
                    return (
                      <p key={l.id} className="term-line">
                        <span className="term-prompt">visitante@atlas:~$</span> {l.s}
                      </p>
                    )
                  case 'row':
                    return (
                      <p key={l.id} className="term-row">
                        <span>{l.k}</span>
                        <span>{l.v}</span>
                      </p>
                    )
                  case 'donut':
                    return <DonutBlock key={l.id} />
                  default:
                    return (
                      <p key={l.id} className={`term-line tone-${l.tone ?? 'base'}`}>
                        {l.s || '\u00a0'}
                      </p>
                    )
                }
              })}
            </div>

            <form className="term-form" data-spot="term-form" onSubmit={submit}>
              <label htmlFor="term-input" className="term-prompt">
                visitante@atlas:~$
              </label>
              <input
                id="term-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!ready}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Digite um comando"
              />
            </form>
          </div>

          {/* @tech Atalhos clicáveis (chips) para telas de toque
              Sem teclado físico o terminal seria inútil; os chips executam o comando com um toque
              e ensinam a sintaxe. A lista vem do array CHIPS. */}
          <div className="term-chips" data-spot="term-chips" role="group" aria-label="Atalhos de comandos">
            {CHIPS.filter((c) => commands[c.split(' ')[0]]).map((c) => (
              <button key={c} type="button" disabled={!ready} onClick={() => void run(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </atlas-crt>
    </main>
  )
}
