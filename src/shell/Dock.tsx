import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { pages, type PageMeta } from '../data/pages.ts'
import { useMediaQuery } from '../lib/hooks.ts'
import './dock.css'

const glyphs: Record<string, string> = {
  lumen: '✦',
  prisma: '◇',
  tipo: 'Aa',
  pulse: '∿',
  gravity: '●',
  orbit: '◎',
  nebula: '✺',
  mundi: '◍',
  terminal: '>_',
  nativo: '{}',
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Dock.tsx — navegação principal estilo "dock do macOS"
 * ═══════════════════════════════════════════════════════════════════════════
 *  Peças
 *   • `glyphs`            ícone (texto) de cada página
 *   • `setTransitionOrigin` guarda onde o clique ocorreu para a View Transition circular (index.css)
 *   • `DockItem`          um ícone: magnificação por proximidade + tooltip + indicador de página ativa
 *   • `Dock`              container: rastreia o mouse, adapta para celular (rolável) e mantém o ativo visível
 *  A lista vem de `src/data/pages.ts`: adicionar uma página lá cria o ícone automaticamente.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Guarda o ponto do clique para a transição circular (CSS var lida em index.css). */
function setTransitionOrigin(e: React.MouseEvent) {
  const root = document.documentElement
  root.style.setProperty('--vt-x', `${e.clientX}px`)
  root.style.setProperty('--vt-y', `${e.clientY}px`)
}

function DockItem({ page, mouseX, base, peak }: { page: PageMeta; mouseX: MotionValue<number>; base: number; peak: number }) {
  const ref = useRef<HTMLAnchorElement>(null)

  // @tech Dock com magnificação (estilo macOS)
  // Pipeline de MotionValues (nenhum re-render do React por movimento do mouse):
  //   mouseX (px) → distance (cursor − centro do item) → rawSize (46→78→46 por interpolação linear)
  //   → size (useSpring: mola dá o "gelatinoso") → width/height do tile.
  // O indicador do item ativo usa `layoutId="dock-active"`: o Motion anima o MESMO elemento de um item
  // para outro (shared layout animation) em vez de desmontar/montar.
  // Distância (px) do cursor ao centro deste item → tamanho (efeito "dock do macOS")
  const distance = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect()
    return b ? x - (b.left + b.width / 2) : Infinity
  })
  // `base` = tamanho em repouso; `peak` = tamanho sob o cursor. Em telas de toque base === peak (sem magnificação).
  const rawSize = useTransform(distance, [-140, 0, 140], [base, peak, base])
  const size = useSpring(rawSize, { mass: 0.12, stiffness: 190, damping: 14 })

  return (
    <NavLink
      ref={ref}
      to={page.path}
      end={page.path === '/'}
      viewTransition
      onClick={setTransitionOrigin}
      className="dock__link"
      aria-label={`${page.number} · ${page.name}`}
      style={{ '--accent': page.accent } as React.CSSProperties}
    >
      {({ isActive }) => (
        <>
          <motion.span className="dock__tile" style={{ width: size, height: size }}>
            <span className="dock__glyph">{glyphs[page.id]}</span>
          </motion.span>
          <span className="dock__tip">
            <b>{page.number}</b> {page.name}
            <small>{page.tagline}</small>
          </span>
          {isActive && <motion.span layoutId="dock-active" className="dock__dot" />}
        </>
      )}
    </NavLink>
  )
}

export function Dock() {
  const mouseX = useMotionValue(Infinity)
  const navRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  // Com 10 páginas o dock não cabe numa tela de celular: tiles menores, sem magnificação, e o dock rola na horizontal
  const compact = useMediaQuery('(max-width: 640px)')
  const base = compact ? 36 : 46
  const peak = compact ? 36 : 78

  // Mantém o item ativo visível no dock rolável (ao navegar por outro meio — terminal, cards, links)
  useEffect(() => {
    navRef.current?.querySelector('.dock__link.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [pathname, compact])

  return (
    <nav
      ref={navRef}
      className="dock vt-persist-dock"
      data-spot="shell-dock"
      aria-label="Páginas"
      onPointerMove={(e) => e.pointerType === 'mouse' && mouseX.set(e.clientX)}
      onPointerLeave={() => mouseX.set(Infinity)}
    >
      {pages.map((p) => (
        <DockItem key={p.id} page={p} mouseX={mouseX} base={base} peak={peak} />
      ))}
    </nav>
  )
}
