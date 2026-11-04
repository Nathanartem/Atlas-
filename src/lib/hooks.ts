import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  hooks.ts — hooks utilitários compartilhados
 * ═══════════════════════════════════════════════════════════════════════════
 *   useMediaQuery(q) ........ reage a uma media query (tema, ponteiro, largura…)
 *   usePrefersReducedMotion . atalho para `(prefers-reduced-motion: reduce)`
 *   useInView(rootMargin) ... true enquanto o elemento está visível (para pausar loops)
 *   clamp / lerp ............ matemática pequena usada por vários efeitos
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Assina uma media query com useSyncExternalStore (sem tearing, SSR-safe).
 * @tech matchMedia reativo com useSyncExternalStore
 * `subscribe` registra o listener `change` da MediaQueryList; `getSnapshot` lê `matches`; o 3º argumento
 * é o valor no servidor. O React re-renderiza só quando o resultado muda — sem estado duplicado nem efeitos.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

/** true enquanto o elemento está (parcialmente) visível — útil para pausar loops de render. */
export function useInView<T extends Element>(rootMargin = '0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return [ref, inView] as const
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
