/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  support.ts — matriz de compatibilidade: "o seu navegador suporta isto?"
 * ═══════════════════════════════════════════════════════════════════════════
 *  Cada Feature tem um `test()` de DETECÇÃO DE RECURSO (nunca de user-agent):
 *    • propriedade/construtor existe?  → `'EyeDropper' in window`
 *    • método existe?                  → `typeof [].toSorted === 'function'`
 *    • CSS suportado?                  → `CSS.supports('position-anchor: --a')`
 *    • sintaxe suportada?              → `new RegExp('a', 'v')` dentro de try/catch
 *  Os testes só LEEM — não pedem permissão nem abrem nada. A lista alimenta o painel “Matriz de suporte”.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export type Group = 'Linguagem' | 'Armazenamento' | 'Abas & rede' | 'Dispositivo' | 'Plataforma' | 'Gráficos'

export interface Feature {
  id: string
  name: string
  group: Group
  test: () => boolean
}

/** `globalThis` sem tipos estritos: várias APIs abaixo ainda não estão no lib.dom do TypeScript. */
const g = globalThis as unknown as Record<string, unknown>
const nav = navigator as unknown as Record<string, unknown>

const tryTest = (fn: () => unknown) => {
  try {
    return Boolean(fn())
  } catch {
    return false
  }
}

// @tech Detecção de recursos (feature detection) em vez de user-agent
// Cada teste pergunta diretamente ao navegador se o recurso existe. É a única abordagem que
// continua correta quando um navegador ganha (ou perde) uma API.
export const features: Feature[] = [
  // — Linguagem —
  { id: 'segmenter', name: 'Intl.Segmenter', group: 'Linguagem', test: () => typeof Intl.Segmenter === 'function' },
  { id: 'displaynames', name: 'Intl.DisplayNames', group: 'Linguagem', test: () => typeof Intl.DisplayNames === 'function' },
  { id: 'temporal', name: 'Temporal', group: 'Linguagem', test: () => 'Temporal' in g },
  { id: 'structured', name: 'structuredClone', group: 'Linguagem', test: () => typeof structuredClone === 'function' },
  { id: 'tosorted', name: 'Array.prototype.toSorted', group: 'Linguagem', test: () => typeof [].toSorted === 'function' },
  { id: 'groupby', name: 'Object.groupBy', group: 'Linguagem', test: () => typeof (Object as unknown as { groupBy?: unknown }).groupBy === 'function' },
  { id: 'withresolvers', name: 'Promise.withResolvers', group: 'Linguagem', test: () => typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers === 'function' },
  { id: 'setunion', name: 'Set.prototype.union', group: 'Linguagem', test: () => typeof (Set.prototype as unknown as { union?: unknown }).union === 'function' },
  { id: 'regexv', name: 'RegExp flag /v', group: 'Linguagem', test: () => tryTest(() => new RegExp('[\\p{L}--[a-z]]', 'v')) },
  { id: 'urlpattern', name: 'URLPattern', group: 'Linguagem', test: () => 'URLPattern' in g },

  // — Armazenamento —
  { id: 'opfs', name: 'OPFS (sistema de arquivos privado)', group: 'Armazenamento', test: () => typeof (navigator.storage as unknown as { getDirectory?: unknown } | undefined)?.getDirectory === 'function' },
  { id: 'idb', name: 'IndexedDB', group: 'Armazenamento', test: () => 'indexedDB' in g },
  { id: 'estimate', name: 'StorageManager.estimate', group: 'Armazenamento', test: () => typeof navigator.storage?.estimate === 'function' },
  { id: 'cache', name: 'Cache API', group: 'Armazenamento', test: () => 'caches' in g },
  { id: 'locks', name: 'Web Locks', group: 'Armazenamento', test: () => 'locks' in nav },

  // — Abas & rede —
  { id: 'bc', name: 'BroadcastChannel', group: 'Abas & rede', test: () => 'BroadcastChannel' in g },
  { id: 'sharedworker', name: 'SharedWorker', group: 'Abas & rede', test: () => 'SharedWorker' in g },
  { id: 'sw', name: 'Service Worker', group: 'Abas & rede', test: () => 'serviceWorker' in nav },
  { id: 'share', name: 'Web Share', group: 'Abas & rede', test: () => typeof navigator.share === 'function' },
  { id: 'clipboard', name: 'Clipboard API', group: 'Abas & rede', test: () => typeof navigator.clipboard?.writeText === 'function' },
  { id: 'webtransport', name: 'WebTransport', group: 'Abas & rede', test: () => 'WebTransport' in g },

  // — Dispositivo —
  { id: 'eyedropper', name: 'EyeDropper', group: 'Dispositivo', test: () => 'EyeDropper' in g },
  { id: 'wakelock', name: 'Screen Wake Lock', group: 'Dispositivo', test: () => 'wakeLock' in nav },
  { id: 'vibrate', name: 'Vibration', group: 'Dispositivo', test: () => typeof navigator.vibrate === 'function' },
  { id: 'fsa', name: 'File System Access', group: 'Dispositivo', test: () => 'showOpenFilePicker' in g },
  { id: 'bluetooth', name: 'Web Bluetooth', group: 'Dispositivo', test: () => 'bluetooth' in nav },
  { id: 'usb', name: 'WebUSB', group: 'Dispositivo', test: () => 'usb' in nav },
  { id: 'serial', name: 'Web Serial', group: 'Dispositivo', test: () => 'serial' in nav },

  // — Plataforma —
  { id: 'yield', name: 'scheduler.yield()', group: 'Plataforma', test: () => typeof (g.scheduler as { yield?: unknown } | undefined)?.yield === 'function' },
  { id: 'posttask', name: 'scheduler.postTask()', group: 'Plataforma', test: () => typeof (g.scheduler as { postTask?: unknown } | undefined)?.postTask === 'function' },
  { id: 'vt', name: 'View Transitions', group: 'Plataforma', test: () => typeof document.startViewTransition === 'function' },
  { id: 'popover', name: 'Popover API', group: 'Plataforma', test: () => 'popover' in HTMLElement.prototype },
  { id: 'anchor', name: 'CSS Anchor Positioning', group: 'Plataforma', test: () => CSS.supports('anchor-name: --a') },
  { id: 'scope', name: 'CSS @scope', group: 'Plataforma', test: () => 'CSSScopeRule' in g },
  { id: 'navigation', name: 'Navigation API', group: 'Plataforma', test: () => 'navigation' in g },
  { id: 'compression', name: 'CompressionStream', group: 'Plataforma', test: () => 'CompressionStream' in g },
  { id: 'lcp', name: 'PerformanceObserver (LCP)', group: 'Plataforma', test: () => tryTest(() => PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) },

  // — Gráficos —
  { id: 'webgl2', name: 'WebGL 2', group: 'Gráficos', test: () => tryTest(() => document.createElement('canvas').getContext('webgl2')) },
  { id: 'webgpu', name: 'WebGPU', group: 'Gráficos', test: () => 'gpu' in nav },
  { id: 'offscreen', name: 'OffscreenCanvas', group: 'Gráficos', test: () => 'OffscreenCanvas' in g },
  { id: 'webcodecs', name: 'WebCodecs', group: 'Gráficos', test: () => 'VideoEncoder' in g },
  { id: 'xr', name: 'WebXR', group: 'Gráficos', test: () => 'xr' in nav },
]

export const groups: Group[] = ['Linguagem', 'Armazenamento', 'Abas & rede', 'Dispositivo', 'Plataforma', 'Gráficos']

/** Roda todos os testes uma vez (são síncronos e baratos) → mapa id → suportado. */
export function detectAll(): Record<string, boolean> {
  return Object.fromEntries(features.map((f) => [f.id, tryTest(f.test)]))
}

/** Acesso tipado ao `scheduler` (ainda fora do lib.dom). */
export interface SchedulerLike {
  yield?: () => Promise<void>
  postTask?: <T>(cb: () => T, opts?: { priority?: 'user-blocking' | 'user-visible' | 'background' }) => Promise<T>
}
export const getScheduler = () => g.scheduler as SchedulerLike | undefined
