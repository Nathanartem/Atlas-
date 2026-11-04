/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CryptoLab.tsx — Web Crypto e Compression Streams (dados binários no navegador)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Todas as operações são ASSÍNCRONAS e rodam fora da thread principal (o navegador delega ao
 *  sistema). Por isso cada efeito usa uma flag `cancelled`: se o texto mudar antes de a promessa
 *  anterior resolver, o resultado velho é descartado (evita "resposta atrasada sobrescreve a nova").
 *  `useDeferredValue` mantém o campo de texto fluido mesmo com textos grandes.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useDeferredValue, useEffect, useState } from 'react'
import { Out, Spec } from './Spec.tsx'

const encoder = new TextEncoder()
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const toBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))

async function sha256(text: string) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(text)))
}

/** Tamanho (bytes) do texto depois do gzip, usando streams nativos (sem biblioteca). */
async function gzipSize(text: string, format: CompressionFormat) {
  // Blob → ReadableStream → CompressionStream → Response (que sabe juntar os pedaços num ArrayBuffer)
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream(format))
  return (await new Response(stream).arrayBuffer()).byteLength
}

/** Cifra e decifra com AES-GCM numa chave efêmera: prova que o ciclo completo funciona. */
async function aesRoundTrip(text: string) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12)) // IV de 96 bits, único por mensagem
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return { cipher: toBase64(cipher), plain: new TextDecoder().decode(plain) }
}

const SAMPLE = 'Atlas Atlas Atlas — o navegador comprime textos repetitivos muito bem. '.repeat(6)

export function HashLab() {
  const [text, setText] = useState('Atlas')
  const deferred = useDeferredValue(text)
  const [hash, setHash] = useState('')
  const [aes, setAes] = useState<{ cipher: string; plain: string } | null>(null)
  const [uuid, setUuid] = useState(() => crypto.randomUUID())
  const secure = typeof crypto !== 'undefined' && Boolean(crypto.subtle)

  // @tech Web Crypto: SHA-256 e AES-GCM
  // `crypto.subtle` só existe em contextos seguros (HTTPS ou localhost). SHA-256 → digest; AES-GCM →
  // generateKey (chave NÃO exportável) + encrypt/decrypt com IV aleatório. Resultado antigo é descartado.
  useEffect(() => {
    if (!secure) return
    let cancelled = false
    void sha256(deferred).then((h) => !cancelled && setHash(h))
    void aesRoundTrip(deferred).then((r) => !cancelled && setAes(r))
    return () => {
      cancelled = true
    }
  }, [deferred, secure])

  return (
    <Spec fig={5} title="Hash e criptografia sem biblioteca" api="crypto.subtle · randomUUID" supported={secure} spot="nat-fig-05">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-label="Texto para o hash" />
      <dl className="nat-outs">
        <Out label="SHA-256">{hash ? `${hash.slice(0, 32)}…` : '…'}</Out>
        <Out label="AES-GCM">{aes ? `${aes.cipher.slice(0, 40)}${aes.cipher.length > 40 ? '…' : ''}` : '…'}</Out>
        <Out label="decifrado">{aes?.plain === deferred ? '✓ idêntico ao original' : aes ? '✗ diferente' : '…'}</Out>
        <Out label="UUID v4">{uuid}</Out>
      </dl>
      <button type="button" className="nat-btn" onClick={() => setUuid(crypto.randomUUID())}>
        novo UUID
      </button>
    </Spec>
  )
}

export function CompressLab() {
  const [text, setText] = useState(SAMPLE)
  const deferred = useDeferredValue(text)
  const [sizes, setSizes] = useState<{ raw: number; gzip: number; deflate: number } | null>(null)
  const supported = 'CompressionStream' in globalThis

  // @tech Compression Streams (gzip/deflate nativos)
  // `Blob.stream().pipeThrough(new CompressionStream('gzip'))` comprime em streaming, sem pako/fflate.
  // Útil para enviar JSON grande ao servidor ou guardar dados no IndexedDB com menos espaço.
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    void Promise.all([gzipSize(deferred, 'gzip'), gzipSize(deferred, 'deflate')]).then(([gzip, deflate]) => {
      if (!cancelled) setSizes({ raw: encoder.encode(deferred).byteLength, gzip, deflate })
    })
    return () => {
      cancelled = true
    }
  }, [deferred, supported])

  const pct = (n: number) => (sizes ? `${n} B · ${Math.round((n / Math.max(1, sizes.raw)) * 100)}%` : '…')

  return (
    <Spec fig={6} title="Comprimir dados no navegador" api="CompressionStream" supported={supported} spot="nat-fig-06">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} aria-label="Texto para comprimir" />
      <dl className="nat-outs nat-outs--3">
        <Out label="original">{sizes ? `${sizes.raw} B` : '…'}</Out>
        <Out label="gzip">{sizes ? pct(sizes.gzip) : '…'}</Out>
        <Out label="deflate">{sizes ? pct(sizes.deflate) : '…'}</Out>
      </dl>
      {sizes && (
        <div className="nat-bar" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (sizes.gzip / Math.max(1, sizes.raw)) * 100)}%` }} />
        </div>
      )}
    </Spec>
  )
}
