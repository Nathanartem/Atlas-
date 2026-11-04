import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Magnetic.tsx — componente reutilizável "botão magnético"
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech Botão magnético
 * Como funciona, em 3 camadas:
 *  1. `pointermove` mede a distância do cursor ao CENTRO do wrapper e grava em MotionValues (`mx`, `my`)
 *     multiplicada por `strength` (0,35 = o botão anda 35% do caminho até o cursor)
 *  2. `useSpring` transforma esse alvo em movimento com física (mola) — dá o "puxão" elástico e o retorno
 *     quando o cursor sai (`onPointerLeave` zera o alvo)
 *  3. `useTransform(x, v => v * 0.45)` desloca o CONTEÚDO interno 45% a mais que o wrapper: parallax interno
 * MotionValues não causam re-render: o Motion escreve direto no `transform` (compositor).
 * Uso:  <Magnetic strength={0.4}><button>Clique</button></Magnetic>
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 220, damping: 14, mass: 0.4 })
  const y = useSpring(my, { stiffness: 220, damping: 14, mass: 0.4 })
  const ix = useTransform(x, (v) => v * 0.45)
  const iy = useTransform(y, (v) => v * 0.45)

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, display: 'inline-block' }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        mx.set((e.clientX - (r.left + r.width / 2)) * strength)
        my.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
    >
      <motion.span style={{ x: ix, y: iy, display: 'inline-flex' }}>{children}</motion.span>
    </motion.div>
  )
}
