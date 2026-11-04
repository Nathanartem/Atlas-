/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  07 · NEBULA — computação na GPU com WebGPU
 * ═══════════════════════════════════════════════════════════════════════════
 *  Mapa do arquivo
 *   1. PRESETS / CONTAGENS ........ valores iniciais e botões da UI
 *   2. NebulaStage (hook) ......... cria o motor (WebGPU → fallback Canvas 2D) e cuida do ciclo de vida
 *   3. Hero ....................... título, HUD ao vivo e painel de controles
 *   4. Pipeline ................... explicação visual do fluxo CPU → compute → render → blit
 *   5. CodeViewer ................. mostra os .wgsl REAIS (importados com ?raw) com realce de sintaxe
 *   6. GpuReport .................. introspecção do adapter (nome, features, limites)
 *
 *  Onde está o quê:  engine.ts (WebGPU) · fallback2d.ts · *.wgsl (shaders) · nebula.css (@scope)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import './nebula.css'
import { createWebGPUEngine, shaderSources, type GpuInfo, type NebulaEngine, type NebulaParams } from './engine.ts'
import { createCanvas2DEngine } from './fallback2d.ts'
import { highlightWgsl } from './highlight.tsx'

/* ───────────────────────── 1. PRESETS / CONTAGENS ───────────────────────── */
const PRESETS: Record<string, NebulaParams & { label: string }> = {
  vortex: { label: 'Vórtice', attract: 1.6, curl: 0.25, drag: 1.1, fade: 0.06 },
  aurora: { label: 'Aurora', attract: 0.35, curl: 0.9, drag: 0.7, fade: 0.035 },
  swarm: { label: 'Enxame', attract: 3.2, curl: 0.35, drag: 0.5, fade: 0.1 },
  dust: { label: 'Poeira', attract: 0.8, curl: 0.12, drag: 2.2, fade: 0.2 },
}
const COUNTS = [60_000, 250_000, 1_000_000, 2_000_000]

// @tech Intl.NumberFormat em notação compacta
// "250 mil", "1 mi", "2 mi" sem escrever uma linha de formatação manual — respeita o idioma pt-BR.
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/* ───────────────────────── 2. CICLO DE VIDA DO MOTOR ───────────────────────── */
type Status = 'loading' | 'webgpu' | 'canvas2d'

function useNebulaEngine(initialCount: number) {
  const stage = useRef<HTMLDivElement>(null)
  const [engine, setEngine] = useState<NebulaEngine | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [reason, setReason] = useState('')
  // Os parâmetros vivem num objeto mutável compartilhado com o motor (lido a cada frame, sem re-render).
  // A UI só o altera dentro de handlers de evento — nunca durante o render.
  const params = useRef<NebulaParams>({ ...PRESETS.vortex })
  // valores iniciais capturados uma vez: o efeito não deve recriar o motor quando a UI muda
  const bootCount = useRef(initialCount)

  useEffect(() => {
    const host = stage.current!
    let cancelled = false // StrictMode monta → desmonta → monta: a 1ª tentativa assíncrona precisa se descartar
    let current: NebulaEngine | null = null

    const switchToFallback = (why: string) => {
      current?.dispose()
      current = createCanvas2DEngine(host, bootCount.current, params.current)
      setEngine(current)
      setStatus('canvas2d')
      setReason(why)
    }

    void (async () => {
      let why = ''
      try {
        current = await createWebGPUEngine(host, bootCount.current, params.current)
        if (!current) why = 'navigator.gpu indisponível (ou nenhum adapter encontrado)'
      } catch (err) {
        why = err instanceof Error ? err.message : String(err)
      }
      if (cancelled) {
        current?.dispose()
        return
      }
      if (!current) return switchToFallback(why)
      current.onLost = (msg) => switchToFallback(`device perdido: ${msg}`)
      setEngine(current)
      setStatus('webgpu')
    })()

    return () => {
      cancelled = true
      current?.dispose()
    }
  }, [])

  return { stage, engine, status, reason, params }
}

/* ───────────────────────── PÁGINA ───────────────────────── */
export default function Nebula() {
  const [ui, setUi] = useState<NebulaParams>({ ...PRESETS.vortex })
  const [preset, setPreset] = useState('vortex')
  const [count, setCount] = useState(250_000)
  const { stage, engine, status, reason, params } = useNebulaEngine(count)

  // HUD: amostra stats do motor a cada 400 ms (o motor roda fora do React)
  const [hud, setHud] = useState({ fps: 0, count: 0 })
  useEffect(() => {
    if (!engine) return
    const id = setInterval(() => setHud({ fps: engine.stats.fps, count: engine.stats.count }), 400)
    return () => clearInterval(id)
  }, [engine])

  const applyParams = (next: NebulaParams) => {
    Object.assign(params.current, next) // o motor enxerga na hora (mesma referência)
    setUi(next)
  }
  const pickPreset = (id: string) => {
    const { attract, curl, drag, fade } = PRESETS[id]
    setPreset(id)
    applyParams({ attract, curl, drag, fade })
  }
  const slider = (key: keyof NebulaParams) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreset('')
    applyParams({ ...ui, [key]: Number(e.target.value) })
  }
  const pickCount = (n: number) => {
    setCount(n)
    engine?.setCount(n)
  }

  return (
    <main className="nebula" data-spot-page data-spot="nebula-page">
      <title>Atlas — Nebula</title>

      {/* Canvas fixo atrás de tudo: a simulação continua viva enquanto você rola a página */}
      <div ref={stage} className="nebula-stage" data-spot="nebula-canvas" aria-hidden="true" />

      {/* ── 3. HERO ─────────────────────────────────────────────── */}
      <section className="nebula-hero" data-spot="nebula-hero">
        <p className="nebula-eyebrow">07 — Compute · WebGPU</p>
        <h1>Nebula</h1>
        <p className="nebula-lede">
          {compact.format(hud.count || count)} partículas simuladas <b>inteiramente na GPU</b>. Mova o cursor para atrair,
          segure o clique para repelir. Em repouso, um atrator em Lissajous mantém tudo em movimento.
        </p>

        <dl className="nebula-hud">
          <div>
            <dt>motor</dt>
            <dd data-status={status}>{status === 'loading' ? '…' : status === 'webgpu' ? 'WebGPU' : 'Canvas 2D'}</dd>
          </div>
          <div>
            <dt>partículas</dt>
            <dd>{hud.count ? compact.format(hud.count) : '—'}</dd>
          </div>
          <div>
            <dt>fps</dt>
            <dd>{hud.fps ? Math.round(hud.fps) : '—'}</dd>
          </div>
        </dl>

        {status === 'canvas2d' && (
          <p className="nebula-warn" role="status">
            WebGPU não está disponível aqui, então esta é a versão <b>Canvas 2D</b> (limitada a 12 mil partículas).
            <small>{reason}</small>
          </p>
        )}

        <div className="nebula-panel">
          <fieldset>
            <legend>Preset</legend>
            <div className="nebula-chips">
              {Object.entries(PRESETS).map(([id, p]) => (
                <button key={id} type="button" aria-pressed={preset === id} onClick={() => pickPreset(id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Partículas</legend>
            <div className="nebula-chips">
              {COUNTS.map((n) => (
                <button key={n} type="button" aria-pressed={count === n} onClick={() => pickCount(n)}>
                  {compact.format(n)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="nebula-sliders">
            <label>
              <span>Atração</span>
              <input type="range" min="0" max="4" step="0.05" value={ui.attract} onChange={slider('attract')} />
              <output>{ui.attract.toFixed(2)}</output>
            </label>
            <label>
              <span>Turbulência</span>
              <input type="range" min="0" max="1.2" step="0.01" value={ui.curl} onChange={slider('curl')} />
              <output>{ui.curl.toFixed(2)}</output>
            </label>
            <label>
              <span>Atrito</span>
              <input type="range" min="0.1" max="3" step="0.05" value={ui.drag} onChange={slider('drag')} />
              <output>{ui.drag.toFixed(2)}</output>
            </label>
            <label>
              <span>Rastro</span>
              <input
                type="range"
                min="0.02"
                max="0.4"
                step="0.005"
                // slider invertido: à direita = rastro mais longo = fade menor
                value={0.42 - ui.fade}
                onChange={(e) => {
                  setPreset('')
                  applyParams({ ...ui, fade: 0.42 - Number(e.target.value) })
                }}
              />
              <output>{Math.round(((0.4 - ui.fade) / 0.38) * 100)}%</output>
            </label>
          </div>
        </div>
      </section>

      <Pipeline />
      <CodeViewer />
      <GpuReport gpu={engine?.gpu ?? null} status={status} />

      <footer className="nebula-footer">
        <p>
          Os três arquivos <code>.wgsl</code> acima são exatamente os que rodam na sua GPU. Guia completo em <code>GUIA.md</code>.
        </p>
      </footer>
    </main>
  )
}

/* ───────────────────────── 4. PIPELINE ───────────────────────── */
const STEPS = [
  { tag: 'CPU · 1×', title: 'Semear', text: 'Um Float32Array com posições aleatórias é copiado para um storage buffer. Só isso toca a CPU.' },
  { tag: 'GPU · compute', title: 'Simular', text: 'ceil(n/64) grupos de 64 threads: cada thread aplica curl noise, atração, atrito e move UMA partícula.' },
  { tag: 'GPU · render', title: 'Desenhar', text: 'draw(4, n): instancing sem vertex buffer, blend aditivo, rastros por fade numa textura HDR.' },
  { tag: 'GPU · blit', title: 'Apresentar', text: 'Tone mapping de Reinhard e vinheta levam a textura HDR ao canvas.' },
]

function Pipeline() {
  return (
    <section className="nebula-section" data-spot="nebula-pipe">
      <p className="nebula-eyebrow">Como funciona</p>
      <h2>Quatro passos por frame, zero cópias de volta.</h2>
      <ol className="nebula-flow">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="nebula-flow__tag">{s.tag}</span>
            <h3>
              <i>{i + 1}</i>
              {s.title}
            </h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ───────────────────────── 5. VISUALIZADOR DE CÓDIGO ───────────────────────── */
const TABS = [
  { id: 'compute', file: 'compute.wgsl', hint: 'a simulação' },
  { id: 'render', file: 'render.wgsl', hint: 'instancing + fade' },
  { id: 'blit', file: 'blit.wgsl', hint: 'tone mapping' },
] as const

function CodeViewer() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('compute')
  // O highlight roda só quando a aba muda (regex sobre ~100 linhas: barato, mas não precisa repetir)
  const nodes = useMemo(() => highlightWgsl(shaderSources[tab]), [tab])
  const lines = shaderSources[tab].split('\n').length

  return (
    <section className="nebula-section" data-spot="nebula-code">
      <p className="nebula-eyebrow">O código de verdade</p>
      <h2>Shaders em WGSL, importados com <code>?raw</code>.</h2>
      <div className="nebula-code">
        <div role="tablist" aria-label="Arquivos WGSL">
          {TABS.map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.file}
              <small>{t.hint}</small>
            </button>
          ))}
          <span className="nebula-code__lines">{lines} linhas</span>
        </div>
        <pre data-lenis-prevent tabIndex={0}>
          <code>{nodes}</code>
        </pre>
      </div>
    </section>
  )
}

/* ───────────────────────── 6. RELATÓRIO DA GPU ───────────────────────── */
function GpuReport({ gpu, status }: { gpu: GpuInfo | null; status: Status }) {
  return (
    <section className="nebula-section" data-spot="nebula-gpu">
      <p className="nebula-eyebrow">Sua máquina</p>
      <h2>O que o adapter diz sobre a sua GPU.</h2>
      {/* @tech Introspecção da GPU (adapter.info, features, limits) */}
      {gpu ? (
        <div className="nebula-report">
          <p className="nebula-report__name">{gpu.description}</p>
          <div>
            <h3>Limites relevantes</h3>
            <table>
              <tbody>
                {Object.entries(gpu.limits).map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{new Intl.NumberFormat('pt-BR').format(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3>Features opcionais ({gpu.features.length})</h3>
            <ul className="nebula-chips nebula-chips--static">
              {gpu.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="nebula-muted">
          {status === 'loading' ? 'Consultando o adapter…' : 'Sem adapter WebGPU: nada para listar (o fallback Canvas 2D está ativo).'}
        </p>
      )}
    </section>
  )
}
