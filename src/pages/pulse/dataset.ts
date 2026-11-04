/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  dataset.ts — contrato do conjunto de dados + carregador (lado da thread principal)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Quem faz o quê
 *   • dataset.worker.ts ... GERA os 50.000 eventos e agrega (roda num Web Worker)
 *   • dataset.ts (aqui) ... define o formato (`DatasetMessage`) e `loadDataset()` que dispara o worker
 *   • Pulse.tsx ........... lê a Promise com `use()` (React 19) e distribui os dados aos componentes
 *
 * @tech Dados colunares com TypedArrays
 * Em vez de 50.000 objetos `{ id, ts, service, … }` (alto custo de memória e GC), guardamos UMA coluna por campo
 * em arrays tipados compactos: Float64Array (timestamps), Uint8Array (serviço/região, índices de uma lista),
 * Uint16Array (status), Float32Array (latência/valor). Filtros e ordenações trabalham sobre ÍNDICES
 * (Uint32Array) e só leem as colunas necessárias — cache-friendly e rápido (ver EventsTable.tsx).
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface DatasetMessage {
  n: number
  id: Uint32Array
  ts: Float64Array
  service: Uint8Array
  region: Uint8Array
  status: Uint16Array
  latency: Float32Array
  amount: Float32Array
  /** 7 dias × 24 horas, segunda → domingo */
  heat: Uint32Array
  /** contagem por classe de status: 2xx, 3xx, 4xx, 5xx */
  classes: number[]
  genMs: number
}

export const SERVICES = ['gateway', 'auth', 'payments', 'search', 'media', 'notify', 'billing', 'analytics'] as const
export const REGIONS = ['sa-east-1', 'us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'] as const

let cached: Promise<DatasetMessage> | null = null

/**
 * Promise em cache (mesma referência entre renders) → pode ser lida com `use(promise)` do React 19,
 * que suspende o componente até resolver. O trabalho pesado roda num Web Worker.
 */
export function loadDataset(n = 50_000): Promise<DatasetMessage> {
  cached ??= new Promise((resolve, reject) => {
    // @tech Web Worker de módulo
    // `new Worker(new URL('./dataset.worker.ts', import.meta.url), { type: 'module' })` é o padrão que o Vite entende:
    // ele empacota o worker como arquivo separado (com imports ES) e resolve a URL em dev e produção
    // (`worker.format: 'es'` em vite.config.ts). O worker roda em outra thread: gerar 50 mil eventos não trava a UI.
    // Termina o worker (`terminate`) assim que a resposta chega — não deixa thread ociosa.
    const worker = new Worker(new URL('./dataset.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<DatasetMessage>) => {
      resolve(e.data)
      worker.terminate()
    }
    worker.onerror = (err) => {
      cached = null
      reject(err)
    }
    worker.postMessage({ n })
  })
  return cached
}
