/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DeviceLab.tsx — APIs que falam com o dispositivo e o sistema
 * ═══════════════════════════════════════════════════════════════════════════
 *  Regra de ouro de todas elas: DETECTAR antes de usar e tratar a recusa do usuário (try/catch).
 *  Muitas exigem um GESTO do usuário (clique) e contexto seguro (HTTPS/localhost).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Out, Spec } from './Spec.tsx'

/* ───────── EyeDropper + Clipboard ───────── */
interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>
}

export function ColorLab() {
  const Dropper = (globalThis as unknown as { EyeDropper?: new () => EyeDropperLike }).EyeDropper
  const [color, setColor] = useState('#2f4bff')
  const [msg, setMsg] = useState('')

  // @tech EyeDropper API (conta-gotas de tela inteira)
  // `new EyeDropper().open()` mostra uma lupa que lê a cor de QUALQUER pixel da tela (até de outros
  // aplicativos). Rejeita com AbortError se o usuário apertar Esc — por isso o try/catch.
  const pick = async () => {
    if (!Dropper) return
    try {
      const { sRGBHex } = await new Dropper().open()
      setColor(sRGBHex)
      setMsg('')
    } catch {
      setMsg('cancelado')
    }
  }

  // @tech Clipboard API assíncrona
  // `navigator.clipboard.writeText` devolve uma Promise e pode ser negada (sem foco/permissão).
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(color)
      setMsg(`${color} copiado`)
    } catch {
      setMsg('não foi possível copiar')
    }
  }

  return (
    <Spec fig={8} title="Pegar uma cor da tela e copiar" api="EyeDropper · navigator.clipboard" supported={Boolean(Dropper)} spot="nat-fig-08">
      <div className="nat-swatch" style={{ background: color }} aria-label={`Cor ${color}`} />
      <div className="nat-inline">
        <button type="button" className="nat-btn" onClick={() => void pick()} disabled={!Dropper}>
          conta-gotas
        </button>
        <button type="button" className="nat-btn" onClick={() => void copy()}>
          copiar {color}
        </button>
      </div>
      <p className="nat-hint" aria-live="polite">
        {Dropper ? msg || 'Clique em “conta-gotas” e escolha qualquer pixel da tela.' : 'EyeDropper não existe neste navegador (hoje só em Chromium).'}
      </p>
    </Spec>
  )
}

/* ───────── Wake Lock + Vibração + Compartilhar ───────── */
export function HardwareLab() {
  const [awake, setAwake] = useState(false)
  const [note, setNote] = useState('')
  const lock = useRef<WakeLockSentinel | null>(null)
  const wakeSupported = 'wakeLock' in navigator
  const canShare = typeof navigator.share === 'function'
  const canVibrate = typeof navigator.vibrate === 'function'

  // @tech Screen Wake Lock (impede a tela de apagar)
  // O navegador SOLTA o lock sozinho quando a aba fica oculta; o evento `release` mantém o estado da UI
  // sincronizado. Útil em receitas, apresentações, mapas e players.
  const toggleWake = async () => {
    try {
      if (lock.current) {
        await lock.current.release()
        return
      }
      const s = await navigator.wakeLock.request('screen')
      lock.current = s
      setAwake(true)
      s.addEventListener('release', () => {
        lock.current = null
        setAwake(false)
      })
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'recusado')
    }
  }
  useEffect(
    () => () => {
      void lock.current?.release()
    },
    [],
  )

  const share = async () => {
    try {
      await navigator.share({ title: 'Atlas', text: 'Laboratório de front-end', url: location.href })
      setNote('compartilhado')
    } catch {
      setNote('compartilhamento cancelado')
    }
  }

  return (
    <Spec fig={11} title="Tela acesa, vibração e compartilhar" api="wakeLock · vibrate · share" supported={wakeSupported || canShare || canVibrate} spot="nat-fig-11">
      <dl className="nat-outs nat-outs--3">
        <Out label="wake lock">{wakeSupported ? (awake ? 'ativo' : 'inativo') : 'indisponível'}</Out>
        <Out label="vibração">{canVibrate ? 'sim' : 'não (desktop)'}</Out>
        <Out label="share">{canShare ? 'sim' : 'não'}</Out>
      </dl>
      <div className="nat-inline">
        <button type="button" className="nat-btn" disabled={!wakeSupported} onClick={() => void toggleWake()} aria-pressed={awake}>
          {awake ? 'soltar tela' : 'manter tela acesa'}
        </button>
        <button type="button" className="nat-btn" disabled={!canVibrate} onClick={() => navigator.vibrate([60, 40, 60, 40, 120])}>
          vibrar
        </button>
        <button type="button" className="nat-btn" disabled={!canShare} onClick={() => void share()}>
          compartilhar
        </button>
      </div>
      <p className="nat-hint" aria-live="polite">
        {note}
      </p>
    </Spec>
  )
}

/* ───────── Armazenamento: estimate + OPFS ───────── */
const FILE = 'atlas-nativo-nota.txt'

/** 244 → "244 B", 1.5e6 → "1,5 MB", 9.1e10 → "91 GB" (base 1000, como o navegador reporta a cota). */
function fmtBytes(n: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: n < 10 && i > 0 ? 1 : 0 }).format(n)} ${units[i]}`
}

export function StorageLab() {
  const supported = typeof (navigator.storage as unknown as { getDirectory?: unknown } | undefined)?.getDirectory === 'function'
  const [note, setNote] = useState('Esta nota fica salva em um arquivo privado do navegador.')
  const [status, setStatus] = useState('')
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null)
  const [files, setFiles] = useState<string[]>([])

  const refresh = useCallback(async () => {
    const dir = await navigator.storage.getDirectory()
    const names: string[] = []
    // `entries()` ainda não está nas libs de tipo → acesso por cast
    for await (const [name] of (dir as unknown as { entries: () => AsyncIterable<[string, unknown]> }).entries()) names.push(name)
    setFiles(names)
    const est = await navigator.storage.estimate()
    setQuota({ usage: est.usage ?? 0, quota: est.quota ?? 0 })
  }, [])

  // @tech OPFS — sistema de arquivos privado de origem
  // `navigator.storage.getDirectory()` devolve uma pasta INVISÍVEL ao usuário, só desta origem, com API
  // de arquivos real (handles, streams graváveis). Mais rápido que IndexedDB para blobs e sem diálogos de permissão.
  // Aqui lemos a nota salva (se existir) ao montar.
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    void (async () => {
      try {
        const dir = await navigator.storage.getDirectory()
        const handle = await dir.getFileHandle(FILE)
        const text = await (await handle.getFile()).text()
        if (!cancelled) setNote(text)
      } catch {
        /* arquivo ainda não existe: mantém o texto padrão */
      }
      if (!cancelled) await refresh().catch(() => {})
    })()
    return () => {
      cancelled = true
    }
  }, [supported, refresh])

  const save = async () => {
    try {
      const dir = await navigator.storage.getDirectory()
      const handle = await dir.getFileHandle(FILE, { create: true })
      const w = await handle.createWritable() // stream gravável; o conteúdo só "vale" após close()
      await w.write(note)
      await w.close()
      setStatus(`salvo (${new Blob([note]).size} B)`)
      await refresh()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'falhou')
    }
  }

  const remove = async () => {
    try {
      const dir = await navigator.storage.getDirectory()
      await dir.removeEntry(FILE)
      setStatus('arquivo removido')
      await refresh()
    } catch {
      setStatus('nada para remover')
    }
  }

  return (
    <Spec fig={12} title="Salvar um arquivo privado no navegador" api="OPFS · storage.estimate()" supported={supported} spot="nat-fig-12">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} aria-label="Conteúdo do arquivo" />
      <div className="nat-inline">
        <button type="button" className="nat-btn" disabled={!supported} onClick={() => void save()}>
          salvar
        </button>
        <button type="button" className="nat-btn" disabled={!supported} onClick={() => void remove()}>
          apagar
        </button>
        <span className="nat-hint" aria-live="polite">
          {status}
        </span>
      </div>
      <dl className="nat-outs">
        <Out label="arquivos">{files.length ? files.join(', ') : '—'}</Out>
        <Out label="uso / cota">{quota ? `${fmtBytes(quota.usage)} de ${fmtBytes(quota.quota)}` : '…'}</Out>
      </dl>
      {quota && quota.quota > 0 && (
        <div className="nat-bar" aria-hidden="true">
          <i style={{ width: `${Math.max(1, (quota.usage / quota.quota) * 100)}%` }} />
        </div>
      )}
    </Spec>
  )
}
