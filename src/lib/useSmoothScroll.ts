import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useEffect } from 'react'

gsap.registerPlugin(ScrollTrigger)

let current: Lenis | null = null
/** Permite que qualquer componente faça `getLenis()?.scrollTo(...)` */
export const getLenis = () => current

/** Rola suavemente até um seletor/posição/elemento — usa Lenis se ativo, senão o scroll nativo. */
export function scrollToTarget(target: string | number | Element, duration = 1.6) {
  if (current) {
    current.scrollTo(target, { duration, offset: typeof target === 'number' ? 0 : -72 })
    return
  }
  if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' })
  else if (typeof target === 'string') document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  else target.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/**
 * Scroll suave (Lenis) sincronizado ao ticker do GSAP.
 * @tech Scroll suave com Lenis + ticker do GSAP
 *  - Lenis interpola o scroll (`lerp: 0.09`) e "rouba" a roda do mouse; precisamos avisar o ScrollTrigger
 *    a cada passo (`lenis.on('scroll', ScrollTrigger.update)`) senão as animações atrasam
 *  - UM único requestAnimationFrame para tudo: `gsap.ticker.add(t => lenis.raf(t * 1000))` — Lenis,
 *    ScrollTrigger e tweens do GSAP avançam no MESMO tick (sem brigar por frames)
 *  - `lagSmoothing(0)` desliga a compensação de lag do GSAP, que causaria saltos com scroll interpolado
 *  - respeita `prefers-reduced-motion` (não cria o Lenis) e devolve cleanup completo
 * Uso: chame `useSmoothScroll()` no componente da página que deve ter scroll suave.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 })
    current = lenis
    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (current === lenis) current = null
    }
  }, [enabled])
}
