import { useEffect, useRef } from 'react'
import './cursor.css'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Cursor.tsx — cursor customizado (anel com inércia + ponto exato)
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech Cursor customizado com inércia
 * Dois elementos fixos: o PONTO segue o ponteiro na hora; o ANEL persegue com interpolação linear
 * (`rx += (x − rx) · 0,16` a cada frame), o que dá a sensação de "peso".
 *  - o anel cresce sobre links/botões/inputs (`closest('a, button, …')` → `data-hot`)
 *  - `mix-blend-mode: difference` (cursor.css) inverte a cor do que está atrás → legível em qualquer fundo
 *  - só ativa com `(pointer: fine)`: em telas de toque nem é criado
 *  - posição escrita direto em `style.transform` por rAF: ZERO re-render do React por movimento
 *  - estados (visível, sobre-algo, pressionado) viajam como `data-*` e o CSS reage a eles
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return
    const el = ring.current!
    const d = dot.current!
    let x = innerWidth / 2
    let y = innerHeight / 2
    let rx = x
    let ry = y
    let raf = 0

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`
      el.dataset.visible = 'true'
      const t = e.target as Element | null
      const hot = t?.closest('a, button, summary, [role="button"], input, label, [data-cursor]')
      el.dataset.hot = hot ? 'true' : 'false'
      el.dataset.label = hot?.closest('[data-cursor-label]')?.getAttribute('data-cursor-label') ?? ''
    }
    const down = () => (el.dataset.down = 'true')
    const up = () => (el.dataset.down = 'false')
    const leave = () => (el.dataset.visible = 'false')

    const loop = () => {
      rx += (x - rx) * 0.16
      ry += (y - ry) * 0.16
      el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerdown', down)
    addEventListener('pointerup', up)
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('pointermove', move)
      removeEventListener('pointerdown', down)
      removeEventListener('pointerup', up)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <>
      <div ref={ring} className="cursor" aria-hidden="true" data-visible="false" data-spot="shell-cursor">
        <span className="cursor__ring" />
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
