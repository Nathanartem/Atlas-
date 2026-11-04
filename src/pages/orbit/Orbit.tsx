import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/instrument-serif/400.css'

import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useSmoothScroll } from '../../lib/useSmoothScroll.ts'
import { COUNT } from './morph.ts'
import './orbit.css'
import { OrbitCanvas } from './Scene.tsx'

const chapters = [
  {
    tag: '01 · esfera',
    title: 'Orbit',
    em: 'um universo em 26 mil pontos',
    text: 'Role a página e a câmera percorre uma trajetória 3D. Nada aqui é imagem: tudo é geometria, shader e luz calculada em tempo real.',
    side: 'left',
    hero: true,
  },
  {
    tag: '02 · toro',
    title: 'Vidro',
    em: 'de verdade',
    text: 'MeshTransmissionMaterial renderiza a cena atrás do objeto num buffer e a refrata, com aberração cromática, espessura e distorção temporal.',
    side: 'right',
  },
  {
    tag: '03 · cubo',
    title: 'Morph na',
    em: 'GPU',
    text: 'Cada partícula conhece 4 posições. O vertex shader interpola entre elas com atraso individual — a CPU só envia um número: o progresso do scroll.',
    side: 'left',
  },
  {
    tag: '04 · galáxia',
    title: 'Luz sem',
    em: 'arquivos',
    text: 'O ambiente é desenhado com Lightformers (retângulos, anéis e círculos emissivos). Zero HDRI baixado, reflexos coerentes com a paleta.',
    side: 'right',
  },
  {
    tag: '05 · fim',
    title: 'Performance',
    em: 'adaptativa',
    text: 'PerformanceMonitor mede o FPS e ajusta a resolução; 140 estilhaços usam um único draw call (InstancedMesh); o Bloom faz o resto.',
    side: 'left',
  },
] as const

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  06 · ORBIT — 3D guiado pelo scroll (rota "/orbit")
 * ═══════════════════════════════════════════════════════════════════════════
 *  Camadas (de trás para frente): canvas WebGL fixo (Scene.tsx) → HUD lateral (capítulos) → leitura numérica →
 *  texto dos capítulos (rola normalmente por cima do canvas).
 *  A página é só uma coluna alta de 5 seções; o scroll vira `progress` (0→1) que a cena 3D lê. Ver Scene.tsx e morph.ts.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export default function Orbit() {
  useSmoothScroll()

  // @tech Estado em refs, não em state
  // O progresso do scroll muda ~60×/s. Em `useState` isso re-renderizaria a árvore (e o Canvas) a cada frame. Em
  // `useRef` o valor muda sem render: o `useFrame` do R3F o lê (`progress.current`) quando precisa.
  const progress = useRef(0)
  const hudP = useRef<HTMLSpanElement>(null)
  const hudM = useRef<HTMLSpanElement>(null)
  const dots = useRef<HTMLOListElement>(null)

  /* progresso do scroll → ref mutável (nenhum re-render do React a cada frame)
     @tech HUD atualizado direto no DOM
     O HUD ("scroll 0.512", "uMorph 1.54" e o capítulo ativo) é escrito por `textContent` e `toggleAttribute('data-on')`
     direto nos nós (via refs) dentro do listener de scroll — sem setState. O CSS estiliza o capítulo ativo por
     `[data-on]`. `Math.floor(p · nCapítulos)` decide qual capítulo está em foco. */
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0
      progress.current = p
      if (hudP.current) hudP.current.textContent = p.toFixed(3)
      if (hudM.current) hudM.current.textContent = (p * 3).toFixed(2)
      const idx = Math.min(chapters.length - 1, Math.floor(p * chapters.length))
      dots.current?.querySelectorAll('li').forEach((li, i) => li.toggleAttribute('data-on', i === idx))
    }
    update()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    return () => {
      removeEventListener('scroll', update)
      removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="orbit" data-spot-page data-spot="orbit-page">
      <title>Atlas — Orbit</title>

      <div className="orbit__canvas" data-spot="orbit-canvas">
        <OrbitCanvas progress={progress} />
      </div>

      {/* HUD */}
      <aside className="orbit__hud" data-spot="orbit-hud" aria-hidden>
        <ol ref={dots}>
          {chapters.map((c, i) => (
            <li key={c.tag} data-on={i === 0 ? '' : undefined}>
              <i />
              <span>{c.tag.split(' · ')[1]}</span>
            </li>
          ))}
        </ol>
      </aside>
      <aside className="orbit__readout" data-spot="orbit-readout" aria-hidden>
        <p>
          scroll <b ref={hudP}>0.000</b>
        </p>
        <p>
          uMorph <b ref={hudM}>0.00</b>
        </p>
        <p>
          pontos <b>{COUNT.toLocaleString('pt-BR')}</b>
        </p>
      </aside>

      <main className="orbit__scroll">
        {chapters.map((c) => (
          <section key={c.tag} className={`orbit__chapter orbit__chapter--${c.side}`}>
            {/* @tech Cards de vidro com blur-in
                `whileInView` anima de `opacity 0 / y 60 / blur(14px)` para nítido quando 45% do cartão entra na tela; o
                vidro é `backdrop-filter: blur(14px) saturate(1.4)` no CSS (orbit.css `.orbit__card`), borrando o canvas
                3D que está atrás do texto. */}
            <motion.div
              className="orbit__card"
              data-spot={'hero' in c ? 'orbit-card' : undefined}
              initial={{ opacity: 0, y: 60, filter: 'blur(14px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ amount: 0.45 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="orbit__tag">{c.tag}</p>
              {'hero' in c ? (
                <h1>
                  {c.title} <em>{c.em}</em>
                </h1>
              ) : (
                <h2>
                  {c.title} <em>{c.em}</em>
                </h2>
              )}
              <p className="orbit__text">{c.text}</p>
            </motion.div>
          </section>
        ))}
      </main>
    </div>
  )
}
