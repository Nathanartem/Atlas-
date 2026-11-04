import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router'
import { getLenis, scrollToTarget } from '../lib/useSmoothScroll.ts'
import { findSpot, getSpotlight, hideSpotlight, spotLook, subscribeSpotlight } from './spotlight.ts'
import './spotlight.css'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Spotlight.tsx — guia visual da técnica na página
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech Guia visual de técnicas (spotlight)
 *  O contorno segue a borda REAL do elemento `[data-spot]` (recortada à área visível).
 *  Cantos brancos + uma etiqueta colada na borda dizem o que é aquele bloco.
 *  O escurecimento fica SÓ fora do bloco, para o olho ir direto nele — e o miolo
 *  continua interativo (dá para mexer o mouse e ver a técnica funcionando).
 *  O cartão é a aula, em três partes: onde na página, como foi utilizada, onde no código.
 *  Blocos que ocupam a tela (shader, WebGPU, página inteira) não ganham um retângulo
 *  flutuante no meio: o contorno vai até a borda deles e o véu fica mais claro.
 * ═══════════════════════════════════════════════════════════════════════════
 */

type Box = { top: number; left: number; width: number; height: number }

const PAD = 6
const CARD_W = 400
const DOCK_ROOM = 108

/** Caixa do elemento, ampliada só quando o desenho (letra grande, máscara) vaza para fora. */
function visualRect(el: Element) {
  const r = el.getBoundingClientRect()
  let top = r.top
  let left = r.left
  let right = r.right
  let bottom = r.bottom
  if (el instanceof HTMLElement && el.childElementCount > 0 && el.childElementCount < 80) {
    const range = document.createRange()
    range.selectNodeContents(el)
    for (const c of range.getClientRects()) {
      if (c.width < 1 || c.height < 1) continue
      top = Math.min(top, Math.max(c.top, r.top - 80))
      left = Math.min(left, Math.max(c.left, r.left - 40))
      right = Math.max(right, Math.min(c.right, r.right + 40))
      bottom = Math.max(bottom, Math.min(c.bottom, r.bottom + 80))
    }
    // line-height < 1 (títulos display) deixa a letra vazar da caixa; o range só vê a linha
    const cs = getComputedStyle(el)
    const fs = parseFloat(cs.fontSize)
    const lh = parseFloat(cs.lineHeight)
    if (fs > 24 && lh > 0 && lh < fs * 0.92) {
      const hang = fs - lh
      top -= hang * 0.2
      bottom += hang * 0.72
    }
  }
  return { top, left, right, bottom, width: right - left, height: bottom - top, rawBottom: r.bottom, rawTop: r.top }
}

function measure(el: Element): { box: Box; fills: boolean; clipped: boolean } {
  const r = visualRect(el)
  const vw = innerWidth
  const vh = innerHeight
  const edge = 10

  const visTop = Math.max(r.top, edge)
  const visLeft = Math.max(r.left, edge)
  const visRight = Math.min(r.right, vw - edge)
  const visBottom = Math.min(r.bottom, vh - edge)
  let width = visRight - visLeft
  let height = visBottom - visTop

  // Alvo minúsculo (cursor): um quadrado em volta do centro, ainda colado nele
  if (width < 16 || height < 16) {
    const cx = Math.min(vw - 28, Math.max(28, r.left + r.width / 2))
    const cy = Math.min(vh - 28, Math.max(28, r.top + r.height / 2))
    return {
      box: { top: cy - 26, left: cx - 26, width: 52, height: 52 },
      fills: false,
      clipped: false,
    }
  }

  const box: Box = {
    top: visTop - PAD,
    left: visLeft - PAD,
    width: width + PAD * 2,
    height: height + PAD * 2,
  }
  const area = (width * height) / (vw * vh)
  const clipped = r.rawTop < edge - 4 || r.rawBottom > vh - edge + 4 || r.rawBottom - r.rawTop > vh * 0.92
  return { box, fills: area > 0.42, clipped }
}

function placeCard(hole: Box, cardH: number, fills: boolean): { top: number; left: number } {
  const vw = innerWidth
  const vh = innerHeight
  const w = Math.min(CARD_W, vw - 24)
  const gap = 16
  const clampX = (x: number) => Math.min(vw - w - 12, Math.max(12, x))
  const clampY = (y: number) => Math.min(vh - cardH - 16, Math.max(12, y))

  // Região grande: o cartão senta acima do dock, sem inventar um buraco no meio
  if (fills || vw <= 560) {
    return { top: Math.max(12, vh - cardH - DOCK_ROOM), left: vw <= 560 ? 12 : clampX(20) }
  }

  const right = hole.left + hole.width + gap
  if (right + w <= vw - 12) return { top: clampY(hole.top), left: right }

  const left = hole.left - gap - w
  if (left >= 12) return { top: clampY(hole.top), left }

  const below = hole.top + hole.height + gap
  if (below + cardH <= vh - DOCK_ROOM) return { top: below, left: clampX(hole.left) }

  return { top: clampY(hole.top - gap - cardH), left: clampX(hole.left) }
}

function inViewport(el: Element) {
  const r = el.getBoundingClientRect()
  const visible = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)
  return visible > Math.min(r.height, innerHeight) * 0.35 && r.width > 0
}

export function Spotlight() {
  const req = useSyncExternalStore(subscribeSpotlight, getSpotlight, getSpotlight)
  const { pathname } = useLocation()
  const titleId = useId()
  const cardRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [frame, setFrame] = useState<{ box: Box; fills: boolean; clipped: boolean } | null>(null)
  const [cardH, setCardH] = useState(280)
  const [found, setFound] = useState(true)

  useEffect(() => {
    if (!req) {
      setFrame(null)
      return
    }

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    let target: Element | null = null
    let raf = 0

    const paint = () => {
      if (cancelled || !target) return
      setFrame(measure(target))
    }

    const start = async () => {
      await new Promise((r) => setTimeout(r, reduced ? 0 : 240))
      if (cancelled) return
      target = findSpot(req.technique.spot)
      const exact = Boolean(document.querySelector(`[data-spot="${CSS.escape(req.technique.spot)}"]`))
      setFound(exact)
      if (!target) return
      if (!inViewport(target)) {
        scrollToTarget(target, reduced ? 0 : 0.85)
        await new Promise((r) => setTimeout(r, reduced ? 40 : 920))
        if (cancelled) return
      }
      paint()
      closeRef.current?.focus()
    }

    void start()

    const onPointer = () => {
      if (req.technique.spot !== 'shell-cursor') return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(paint)
    }

    addEventListener('resize', paint)
    addEventListener('scroll', paint, { passive: true })
    addEventListener('pointermove', onPointer, { passive: true })
    const lenis = getLenis()
    lenis?.on('scroll', paint)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      removeEventListener('resize', paint)
      removeEventListener('scroll', paint)
      removeEventListener('pointermove', onPointer)
      lenis?.off('scroll', paint)
    }
  }, [req])

  useLayoutEffect(() => {
    if (!req || !cardRef.current) return
    setCardH(cardRef.current.getBoundingClientRect().height)
  }, [req, frame])

  useEffect(() => {
    hideSpotlight()
  }, [pathname])

  useEffect(() => {
    if (!req) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        hideSpotlight()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [req])

  if (!req) return null

  const box = frame?.box
  const fills = frame?.fills ?? false
  const pos = box ? placeCard(box, cardH, fills) : { top: 24, left: 24 }
  const look = spotLook(req.technique.spot)
  const tagCut = look.split(/[.:]/)[0].trim()
  const tag = tagCut.length > 68 ? `${tagCut.slice(0, 66)}…` : tagCut
  const nearDock = box ? box.top + box.height > innerHeight - 120 : false
  const tagPlace = !box
    ? 'out'
    : fills || nearDock || box.top < 46
      ? 'inside'
      : box.height > 140
        ? 'below'
        : 'out'
  const t = req.technique

  const dim = (style: React.CSSProperties, key: string) => (
    <button
      key={key}
      type="button"
      className="spot__dim"
      style={style}
      tabIndex={-1}
      aria-hidden
      onClick={() => hideSpotlight()}
    />
  )

  return (
    <div
      className="spot"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-lenis-prevent
      data-fills={fills || undefined}
      style={{ '--accent': req.accent } as React.CSSProperties}
    >
      {box && (
        <>
          {dim({ top: 0, left: 0, right: 0, height: box.top }, 't')}
          {dim({ top: box.top, left: 0, width: box.left, height: box.height }, 'l')}
          {dim({ top: box.top, left: box.left + box.width, right: 0, height: box.height }, 'r')}
          {dim({ top: box.top + box.height, left: 0, right: 0, bottom: 0 }, 'b')}

          <div
            className="spot__frame"
            data-tag={tagPlace}
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
            aria-hidden
          >
            <i className="spot__corner spot__corner--tl" />
            <i className="spot__corner spot__corner--tr" />
            <i className="spot__corner spot__corner--bl" />
            <i className="spot__corner spot__corner--br" />
            <span className="spot__tag">
              <b>{req.n}</b>
              {tag}
            </span>
          </div>
        </>
      )}

      <aside ref={cardRef} className="spot__card" style={{ top: pos.top, left: pos.left }}>
        <p className="spot__kicker">{req.kind === 'shell' ? 'Casca do site' : 'Nesta página'} · técnica {req.n}</p>
        <h2 id={titleId}>{t.name}</h2>

        <section className="spot__block">
          <h3>Onde na página</h3>
          <p>{found ? look : 'Esta técnica não tem um bloco próprio: o contorno mostra a página em que ela age.'}</p>
          {frame?.clipped && found && (
            <p className="spot__note">O contorno segue a borda do bloco que cabe na tela. Role para ver o restante.</p>
          )}
        </section>

        <section className="spot__block">
          <h3>Como foi utilizada</h3>
          <p>{t.what}</p>
        </section>

        <section className="spot__block">
          <h3>Onde no código</h3>
          <code>{t.where}</code>
        </section>

        <button ref={closeRef} type="button" className="spot__close" onClick={() => hideSpotlight()}>
          Fechar guia · Esc
        </button>
      </aside>
    </div>
  )
}
