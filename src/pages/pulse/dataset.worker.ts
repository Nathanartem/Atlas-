/**
 * Web Worker: gera 50.000 eventos e agrega tudo FORA da thread principal.
 * O resultado volta em colunas tipadas (Float64Array, Uint8Array…) como Transferable:
 * os buffers são MOVIDOS (zero-copy) em vez de clonados.
 */
import type { DatasetMessage } from './dataset.ts'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STATUS = [200, 200, 200, 200, 201, 204, 301, 304, 400, 401, 404, 429, 500, 502, 503] as const

self.onmessage = (e: MessageEvent<{ n: number }>) => {
  const t0 = performance.now()
  const n = e.data.n
  const rnd = mulberry32(20261019)

  const ts = new Float64Array(n)
  const heat = new Uint32Array(7 * 24)
  const now = Date.now()
  const startOfWeek = now - 7 * 86400000

  for (let i = 0; i < n; i++) {
    // dia uniforme; hora por amostragem com rejeição (pico por volta das 14h)
    const day = Math.floor(rnd() * 7)
    let hour = 0
    for (;;) {
      hour = Math.floor(rnd() * 24)
      const w = 0.22 + 0.78 * Math.exp(-(((hour - 14) / 5) ** 2))
      if (rnd() < w) break
    }
    const weekend = day >= 5 ? 0.55 : 1
    if (rnd() > weekend) {
      i--
      continue
    }
    const t = startOfWeek + day * 86400000 + hour * 3600000 + rnd() * 3600000
    ts[i] = t
    heat[((new Date(t).getDay() + 6) % 7) * 24 + new Date(t).getHours()]++
  }
  ts.sort() // numérico e nativo
  ts.reverse() // mais recentes primeiro

  const id = new Uint32Array(n)
  const service = new Uint8Array(n)
  const region = new Uint8Array(n)
  const status = new Uint16Array(n)
  const latency = new Float32Array(n)
  const amount = new Float32Array(n)
  const classes = [0, 0, 0, 0] // 2xx 3xx 4xx 5xx

  for (let i = 0; i < n; i++) {
    id[i] = 100000 + (n - i)
    service[i] = Math.floor(rnd() ** 1.4 * 8)
    region[i] = Math.floor(rnd() * 5)
    const s = STATUS[Math.floor(rnd() * STATUS.length)]
    status[i] = s
    classes[Math.floor(s / 100) - 2]++
    // log-normal: maioria rápida, cauda longa
    latency[i] = Math.min(2400, Math.exp(4.4 + (rnd() + rnd() + rnd() - 1.5) * 1.5) * (s >= 500 ? 2.2 : 1))
    amount[i] = Math.round(rnd() ** 2.2 * 4800) / 100
  }

  const msg: DatasetMessage = { n, id, ts, service, region, status, latency, amount, heat, classes, genMs: performance.now() - t0 }
  // @tech Transferable ArrayBuffers
  // `postMessage(msg, { transfer: [buffers] })` MOVE a posse dos ArrayBuffers para a thread principal (zero-copy,
  // O(1)) em vez de clonar ~1,5 MB por structured clone. Depois da transferência o worker não enxerga mais esses
  // buffers (ficam "detached") — por isso o worker é descartável (ver `terminate` em dataset.ts).
  self.postMessage(msg, {
    transfer: [id.buffer, ts.buffer, service.buffer, region.buffer, status.buffer, latency.buffer, amount.buffer, heat.buffer],
  })
}
