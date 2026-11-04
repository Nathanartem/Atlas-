/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  audio.ts — mini-sintetizador com Web Audio API (nenhum arquivo de áudio)
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech Síntese com Web Audio API
 * Cadeia: voz → master (gain) → compressor → analyser → destino.
 * O AnalyserNode alimenta o osciloscópio desenhado em canvas.
 *
 * Como cada som nasce
 *   • `tone()`  — OscillatorNode (sine/triangle/square/sawtooth) → [lowpass opcional] → GainNode com ENVELOPE
 *                 exponencial (ataque de 8 ms e queda até silêncio) → master. `slideTo` desliza a frequência
 *                 (kick = 160→38 Hz; zap = 1600→70 Hz).
 *   • `noise()` — AudioBufferSource tocando ruído branco, filtrado (high/band-pass) e com a mesma envoltória.
 *   • `pads`    — receitas prontas (kick, snare, hat, clap, bass, pluck, zap, bell) combinando tone + noise.
 *   • `hitSound()` — som das colisões físicas (Playground.tsx): a nota vem da escala pentatônica.
 * Política de autoplay: o AudioContext só pode ser criado/retomado dentro de um gesto → `unlockAudio()`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
let ctx: AudioContext | null = null
let master: GainNode
let analyser: AnalyserNode
let noiseBuf: AudioBuffer

/** Navegadores só liberam áudio após um gesto do usuário → chame dentro de um clique/tecla. */
export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.55
    const comp = ctx.createDynamicsCompressor()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    master.connect(comp).connect(analyser).connect(ctx.destination)

    // @tech Ruído branco como AudioBuffer
    // 1 segundo de amostras aleatórias em [-1, 1] gravadas UMA vez num AudioBuffer mono; cada chiado (snare, hi-hat,
    // clap) reutiliza esse buffer num BufferSource novo (barato) e o filtra: high-pass = "chiado agudo" (hat),
    // band-pass = "corpo" de caixa/palmas.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export const getAnalyser = () => analyser as AnalyserNode | undefined
export const audioReady = () => ctx !== null

/**
 * Escala pentatônica: qualquer sequência soa agradável.
 * @tech Escala pentatônica
 * `PENTA` = semitons [0,2,4,7,9] (sem os intervalos que "brigam"). A frequência é `196 · 2^(semitons/12)` (G3 como
 * base); o índice sobe oitavas a cada 5 notas. Em hitSound o `seed` é o id do corpo físico: cada objeto sempre
 * toca a MESMA nota, então bater em objetos diferentes forma melodias.
 */
const PENTA = [0, 2, 4, 7, 9]
export const pentaFreq = (i: number) => 196 * 2 ** ((PENTA[i % 5] + 12 * (Math.floor(i / 5) % 3)) / 12)

interface ToneOpts {
  freq: number
  type?: OscillatorType
  dur?: number
  gain?: number
  slideTo?: number
  filter?: number
}

function tone({ freq, type = 'sine', dur = 0.3, gain = 0.3, slideTo, filter }: ToneOpts) {
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = osc
  if (filter) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = filter
    osc.connect(f)
    node = f
  }
  node.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise({ dur = 0.15, gain = 0.3, hp = 0, bp = 0 }: { dur?: number; gain?: number; hp?: number; bp?: number }) {
  if (!ctx) return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = src
  if (hp || bp) {
    const f = ctx.createBiquadFilter()
    f.type = hp ? 'highpass' : 'bandpass'
    f.frequency.value = hp || bp
    src.connect(f)
    node = f
  }
  node.connect(g).connect(master)
  src.start(t)
  src.stop(t + dur + 0.05)
}

/** Som de colisão: nota da escala escolhida pelo corpo; volume e timbre pela intensidade do impacto. */
export function hitSound(velocity: number, seed: number) {
  const v = Math.min(1, velocity / 18)
  tone({ freq: pentaFreq(seed), type: v > 0.6 ? 'triangle' : 'sine', dur: 0.12 + v * 0.35, gain: 0.05 + v * 0.22, filter: 2400 })
  if (v > 0.55) noise({ dur: 0.05, gain: 0.08 * v, hp: 3000 })
}

/* ───────── Pads de percussão / sintetizador ───────── */
export interface Pad {
  name: string
  key: string
  color: string
  play: () => void
}

export const pads: Pad[] = [
  { name: 'Kick', key: 'Q', color: '#ff6bb5', play: () => { tone({ freq: 160, slideTo: 38, dur: 0.38, gain: 0.9 }); noise({ dur: 0.02, gain: 0.2, hp: 1500 }) } },
  { name: 'Snare', key: 'W', color: '#4d7cff', play: () => { noise({ dur: 0.2, gain: 0.5, bp: 1900 }); tone({ freq: 190, type: 'triangle', dur: 0.12, gain: 0.3 }) } },
  { name: 'Hat', key: 'E', color: '#3ddc84', play: () => noise({ dur: 0.05, gain: 0.3, hp: 7500 }) },
  { name: 'Clap', key: 'R', color: '#ff8a3d', play: () => { for (let i = 0; i < 3; i++) setTimeout(() => noise({ dur: 0.07, gain: 0.35, bp: 1500 }), i * 18); noise({ dur: 0.25, gain: 0.25, bp: 1300 }) } },
  { name: 'Bass', key: 'A', color: '#a56bff', play: () => tone({ freq: 55, type: 'sawtooth', dur: 0.55, gain: 0.45, filter: 380 }) },
  { name: 'Pluck', key: 'S', color: '#ffd23f', play: () => tone({ freq: pentaFreq(Math.floor(Math.random() * 10) + 5), type: 'triangle', dur: 0.4, gain: 0.4, filter: 3200 }) },
  { name: 'Zap', key: 'D', color: '#00d1c1', play: () => tone({ freq: 1600, type: 'square', slideTo: 70, dur: 0.28, gain: 0.18, filter: 4000 }) },
  {
    name: 'Bell',
    key: 'F',
    color: '#ff5d5d',
    play: () => {
      tone({ freq: 880, dur: 1.1, gain: 0.3 })
      tone({ freq: 1320, dur: 0.7, gain: 0.14 })
      tone({ freq: 2217, dur: 0.4, gain: 0.07 })
    },
  },
]
