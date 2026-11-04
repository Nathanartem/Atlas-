/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TabsLab.tsx — conversa entre ABAS do mesmo site (BroadcastChannel + Web Locks)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Abra esta página em duas abas lado a lado:
 *   • PRESENÇA: cada aba envia "ping" a cada 2 s; quem ouve registra `lastSeen`. Abas que somem
 *     por mais de 6 s saem da lista (sem precisar de evento de fechamento confiável).
 *   • MENSAGENS: o que você envia chega em todas as outras abas na hora.
 *   • LÍDER: Web Locks garante que SÓ UMA aba segura o lock "atlas-nativo-leader". As outras ficam
 *     na fila; se a líder fechar, o navegador entrega o lock à próxima. Eleição de líder em ~10 linhas.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef, useState } from 'react'
import { Out, Spec } from './Spec.tsx'

type Msg =
  | { type: 'ping'; id: string; leader: boolean }
  | { type: 'chat'; id: string; text: string; at: number }
  | { type: 'bye'; id: string }

const CHANNEL = 'atlas-nativo'
const LOCK = 'atlas-nativo-leader'

export function TabsLab() {
  const supported = 'BroadcastChannel' in globalThis
  const locksSupported = 'locks' in navigator
  const [me] = useState(() => crypto.randomUUID().slice(0, 4))
  const [peers, setPeers] = useState<Record<string, { seen: number; leader: boolean }>>({})
  const [log, setLog] = useState<{ id: string; text: string; at: number; mine: boolean }[]>([])
  const [text, setText] = useState('olá, outras abas!')
  const [leader, setLeader] = useState(false)
  const channel = useRef<BroadcastChannel | null>(null)
  const leaderRef = useRef(false)

  // @tech Eleição de líder entre abas com Web Locks
  // `navigator.locks.request(nome, callback)` só executa o callback quando ESTA aba obtém o lock; ele
  // permanece seguro enquanto a promessa devolvida não resolver. Resolvemos a promessa no cleanup.
  // `AbortController` cancela o pedido se ainda estivermos na fila (ex.: StrictMode desmontando).
  useEffect(() => {
    if (!locksSupported) return
    const abort = new AbortController()
    let release: () => void = () => {}
    navigator.locks
      .request(LOCK, { signal: abort.signal }, () => {
        leaderRef.current = true
        setLeader(true)
        return new Promise<void>((resolve) => (release = resolve))
      })
      .catch(() => {}) // AbortError ao desmontar: esperado
    return () => {
      abort.abort()
      release()
      leaderRef.current = false
      setLeader(false)
    }
  }, [locksSupported])

  // @tech Presença e mensagens entre abas com BroadcastChannel
  // Canal nomeado: tudo que uma aba `postMessage` chega às DEMAIS (não a si mesma). Mensagens são
  // clonadas com structured clone, então aceitam objetos simples. O heartbeat de 2 s + expiração de 6 s
  // dá presença confiável mesmo se uma aba travar ou for fechada de forma abrupta.
  useEffect(() => {
    if (!supported) return
    const ch = new BroadcastChannel(CHANNEL)
    channel.current = ch
    ch.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data
      if (m.type === 'ping') setPeers((p) => ({ ...p, [m.id]: { seen: Date.now(), leader: m.leader } }))
      else if (m.type === 'chat') setLog((l) => [{ id: m.id, text: m.text, at: m.at, mine: false }, ...l].slice(0, 6))
      else if (m.type === 'bye') setPeers((p) => Object.fromEntries(Object.entries(p).filter(([id]) => id !== m.id)))
    }
    const beat = () => ch.postMessage({ type: 'ping', id: me, leader: leaderRef.current } satisfies Msg)
    beat()
    const hb = setInterval(() => {
      beat()
      const cutoff = Date.now() - 6000
      setPeers((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v.seen > cutoff)))
    }, 2000)
    return () => {
      clearInterval(hb)
      ch.postMessage({ type: 'bye', id: me } satisfies Msg)
      ch.close()
      channel.current = null
    }
  }, [supported, me])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !channel.current) return
    const msg: Msg = { type: 'chat', id: me, text: text.trim(), at: Date.now() }
    channel.current.postMessage(msg)
    setLog((l) => [{ id: me, text: msg.text, at: msg.at, mine: true }, ...l].slice(0, 6))
  }

  const others = Object.entries(peers)
  const fmt = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' })

  return (
    <Spec fig={9} title="Conversa entre abas e eleição de líder" api="BroadcastChannel · navigator.locks" supported={supported && locksSupported} wide spot="nat-fig-09">
      <div className="nat-split">
        <div>
          <dl className="nat-outs nat-outs--3">
            <Out label="esta aba">{me}</Out>
            <Out label="abas conectadas">{others.length + 1}</Out>
            <Out label="papel">{leader ? '★ líder' : 'seguidora'}</Out>
          </dl>
          <ul className="nat-peers" aria-label="Abas conectadas">
            <li data-me>
              {me} <small>(você)</small> {leader && <b>★</b>}
            </li>
            {others.map(([id, p]) => (
              <li key={id}>
                {id} {p.leader && <b>★</b>}
              </li>
            ))}
          </ul>
          <p className="nat-hint">Abra esta mesma página em outra aba (ou janela) para ver a lista crescer. Feche a líder e a ★ migra sozinha.</p>
        </div>
        <div>
          <form className="nat-inline" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Mensagem para as outras abas" />
            <button type="submit" className="nat-btn">
              enviar
            </button>
          </form>
          <ol className="nat-log" aria-label="Mensagens">
            {log.length === 0 && <li className="nat-hint">Nenhuma mensagem ainda.</li>}
            {log.map((m) => (
              <li key={`${m.id}${m.at}`} data-mine={m.mine || undefined}>
                <small>
                  {fmt.format(m.at)} · {m.mine ? 'você' : m.id}
                </small>
                {m.text}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Spec>
  )
}
