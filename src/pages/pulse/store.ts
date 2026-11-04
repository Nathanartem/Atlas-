import { create } from 'zustand'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  store.ts — estado do "feed ao vivo" do Pulse
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech Zustand com selectors
 * `create()` devolve um hook `useLive`. O estado vive FORA da árvore do React (módulo), e cada componente chama
 * `useLive((s) => s.points)` com um SELECTOR: só re-renderiza se aquela fatia mudar (comparação por referência).
 * Os 4 cards de métrica assinam `points` e o botão "ao vivo" só `live`. `tick()` cria um novo array a cada
 * segundo (janela deslizante de WINDOW=60 pontos) — imutabilidade é o que dispara a atualização.
 * - o "feed ao vivo" é simulado aqui, mas o formato é o de um WebSocket/SSE real: trocar `tick` por um
 *   `onmessage` real não exige mudar nenhum componente.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface Point {
  t: number
  rps: number
  p95: number
  err: number
  users: number
}

export const WINDOW = 60

let phase = 0
function nextPoint(prev: Point | undefined, t: number): Point {
  phase += 0.17
  const spike = Math.random() < 0.035 ? 1.55 : 1
  const base = 1800 + Math.sin(phase) * 380 + Math.sin(phase * 0.37) * 230
  const rps = Math.max(200, base * spike + (Math.random() - 0.5) * 150)
  const p95 = Math.max(38, 118 + (rps - 1800) * 0.055 + (Math.random() - 0.5) * 26 + (spike > 1 ? 95 : 0))
  const err = Math.max(0.02, 0.55 + (spike > 1 ? 1.9 : 0) + (Math.random() - 0.5) * 0.35)
  const users = Math.round((prev?.users ?? 4200) * 0.95 + (rps / 1800) * 4200 * 0.05 + (Math.random() - 0.5) * 18)
  return { t, rps, p95, err, users }
}

function seed(): Point[] {
  const now = Date.now()
  const out: Point[] = []
  for (let i = 0; i < WINDOW; i++) out.push(nextPoint(out[i - 1], now - (WINDOW - i) * 1000))
  return out
}

interface LiveState {
  points: Point[]
  live: boolean
  setLive: (v: boolean) => void
  toggleLive: () => void
  tick: () => void
}

export const useLive = create<LiveState>()((set, get) => ({
  points: seed(),
  live: true,
  setLive: (live) => set({ live }),
  toggleLive: () => set((s) => ({ live: !s.live })),
  tick: () => {
    const { points } = get()
    const p = nextPoint(points.at(-1), Date.now())
    set({ points: [...points.slice(1), p] })
  },
}))
