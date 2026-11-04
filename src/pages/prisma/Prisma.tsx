import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'

import { useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import './prisma.css'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  02 · PRISMA — "quase sem JavaScript" (rota "/prisma")
 * ═══════════════════════════════════════════════════════════════════════════
 * Todo o comportamento (animações por scroll, popovers com âncora, acordeão, temas por :has, carrossel,
 * cubo 3D) é CSS. O JS aqui só faz 2 coisas: trocar o tema (com View Transition) e ler o slider de matiz.
 *
 * Este arquivo é só MARCAÇÃO (JSX) + dados dos exemplos; os efeitos estão em `prisma.css`. Mapa das seções:
 *   header ...... barra grudenta com seções, slider de matiz, "auto" (deriva de cor) e tema
 *   #topo ....... hero: blobs gooey + título com filtro de turbulência + cartões com parallax
 *   #luz ........ cartões com animações guiadas pelo scroll (view())
 *   #container .. caixa redimensionável que responde com container queries
 *   #has ........ laboratório de :has(), :user-invalid, field-sizing
 *   #ancora ..... tooltips com anchor positioning + popover + acordeão <details name>
 *   #cubo ....... cubo 3D conduzido por uma view-timeline nomeada
 *   #carrossel .. carrossel com scroll-snap e marcadores nativos
 * ═══════════════════════════════════════════════════════════════════════════
 */

const snippets = [
  { fx: 'prisma-rise', title: 'Scroll-driven animations', code: 'animation-timeline: view();\nanimation-range: entry 0% cover 46%;' },
  { fx: 'prisma-pop', title: '@property tipado', code: '@property --angle {\n  syntax: "<angle>";\n  initial-value: 0deg;\n}' },
  { fx: 'prisma-wipe', title: 'Cor relativa em OKLCH', code: '--c2: oklch(\n  from var(--c1) l c calc(h + 70)\n);' },
  { fx: 'prisma-blur', title: 'Interpolação de gradiente', code: 'background: conic-gradient(\n  in oklch longer hue,\n  red, blue);' },
  { fx: 'prisma-flip', title: 'light-dark() nativo', code: 'color-scheme: light dark;\n--bg: light-dark(#fff, #0b0b12);' },
  { fx: 'prisma-rise', title: 'Motion path em CSS', code: 'offset-path: path("M0 0 C ...");\nanimation: run 20s linear infinite;' },
] as const

const anchors = [
  { id: 'a', label: 'Tooltip', body: 'Posicionado pelo navegador com anchor-name + position-area. Sem Popper/Floating UI.' },
  { id: 'b', label: 'Se vira sozinho', body: 'Sem espaço em cima? position-try-fallbacks: flip-block inverte para baixo automaticamente.' },
  { id: 'c', label: 'Top layer', body: 'O atributo popover joga o elemento na top layer: sem z-index, sem portal, fecha com Esc e clique fora.' },
] as const

export default function Prisma() {
  const root = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // @tech Troca de tema com View Transition circular
  // `document.startViewTransition(callback)` tira um print do estado atual, executa o callback (que muda o DOM)
  // e anima do print velho para o novo. `flushSync` obriga o React a aplicar o novo tema SINCRONAMENTE dentro do
  // callback — sem isso o navegador capturaria o "depois" antes do React renderizar. O círculo nasce no clique
  // porque gravamos --vt-x/--vt-y (mesmas variáveis da transição entre páginas, ver index.css). Fallback: se a
  // API não existir (ou houver reduced-motion), aplica direto.
  const toggleTheme = (e: React.MouseEvent) => {
    const next = theme === 'light' ? 'dark' : 'light'
    const apply = () => flushSync(() => setTheme(next))
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply()
    const r = document.documentElement.style
    r.setProperty('--vt-x', `${e.clientX}px`)
    r.setProperty('--vt-y', `${e.clientY}px`)
    document.startViewTransition(apply)
  }

  return (
    <div ref={root} className="prisma" data-theme={theme} data-spot-page data-spot="prisma-page">
      <title>Atlas — Prisma</title>
      <div className="prisma-progress" data-spot="prisma-progress" aria-hidden />

      {/* @tech Filtros SVG: gooey e turbulência
          Um <svg> invisível guarda dois filtros que o CSS referencia com `filter: url(#id)`:
          • prisma-goo: borra os blobs (feGaussianBlur) e depois ENDURECE o alfa com feColorMatrix (×24 −10): onde
            dois círculos se sobrepõem a borda "gruda" como gota de óleo.
          • prisma-liquid: feTurbulence (ruído fractal, animado por <animate>) alimenta feDisplacementMap, que
            empurra os pixels do título — o texto "ondula" no hover.
          Filtros SVG rodam na GPU em navegadores modernos e funcionam em QUALQUER elemento HTML. */}
      {/* Filtros SVG reutilizados pelo CSS */}
      <svg className="prisma-defs" width="0" height="0" aria-hidden>
        <defs>
          <filter id="prisma-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b" />
            <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" />
          </filter>
          <filter id="prisma-liquid" x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="4" result="n">
              <animate attributeName="baseFrequency" values="0.012 0.03;0.02 0.05;0.012 0.03" dur="7s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* ───────── Header: muda de aparência quando "gruda" (scroll-state container query) ───────── */}
      <header className="prisma-head" data-spot="prisma-head">
        <div className="prisma-head__bar">
          <a href="#topo" className="prisma-logo">
            <i /> Prisma
          </a>
          <nav aria-label="Seções">
            <a href="#luz">Scroll</a>
            <a href="#container">Container</a>
            <a href="#has">:has()</a>
            <a href="#ancora">Âncora</a>
            <a href="#cubo">3D</a>
            <a href="#carrossel">Carrossel</a>
          </nav>
          <div className="prisma-controls">
            <label className="prisma-hue" title="Matiz base da paleta (OKLCH)">
              <span>matiz</span>
              <input
                type="range"
                min="0"
                max="360"
                defaultValue="330"
                onInput={(e) => root.current?.style.setProperty('--hue-base', e.currentTarget.value)}
              />
            </label>
            {/* :has(#drift:checked) no CSS liga a animação — zero JS */}
            <label className="prisma-switch">
              <input id="drift" type="checkbox" />
              <span>auto</span>
            </label>
            <button type="button" className="prisma-theme" data-spot="prisma-theme" onClick={toggleTheme} aria-label="Alternar tema claro/escuro">
              <span aria-hidden>{theme === 'light' ? '☾' : '☀'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ───────── HERO ───────── */}
      <section id="topo" className="prisma-hero" data-spot="prisma-hero">
        <div className="prisma-blobs" aria-hidden>
          <i style={{ '--d': '0s' } as CSSProperties} />
          <i style={{ '--d': '-6s' } as CSSProperties} />
          <i style={{ '--d': '-12s' } as CSSProperties} />
          <i style={{ '--d': '-18s' } as CSSProperties} />
        </div>

        <p className="prisma-kicker">02 · CSS moderno, sem biblioteca</p>
        <h1>
          Luz, vidro<br />e <span>CSS puro.</span>
        </h1>
        <p className="prisma-lead">
          Passe o mouse no título: um filtro SVG de turbulência deforma o texto. Role a página: tudo que anima é
          controlado pela <b>posição do scroll</b>, direto na thread do compositor.
        </p>
        <div className="prisma-hero__cards" aria-hidden>
          <div style={{ '--rise': 160, '--tilt': '-6deg' } as CSSProperties}>
            <small>cor</small>
            <b>oklch()</b>
          </div>
          <div style={{ '--rise': 300, '--tilt': '4deg' } as CSSProperties}>
            <small>animação</small>
            <b>view()</b>
          </div>
          <div style={{ '--rise': 90, '--tilt': '-2deg' } as CSSProperties}>
            <small>tipagem</small>
            <b>@property</b>
          </div>
        </div>
      </section>

      {/* ───────── SCROLL-DRIVEN ───────── */}
      <section id="luz" className="prisma-sec">
        <header className="prisma-sec__head">
          <p className="prisma-kicker">animation-timeline</p>
          <h2>Cada cartão entra de um jeito — guiado pelo scroll.</h2>
        </header>
        <div className="prisma-reveal-grid" data-spot="prisma-reveal">
          {snippets.map((s, i) => (
            <article key={s.title} className="prisma-card reveal" style={{ '--fx': s.fx, '--i': i } as CSSProperties}>
              <span className="prisma-card__n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <pre>
                <code>{s.code}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

      {/* ───────── CONTAINER QUERIES ───────── */}
      <section id="container" className="prisma-sec" data-spot="prisma-cq">
        <header className="prisma-sec__head">
          <p className="prisma-kicker">@container + cqi</p>
          <h2>O componente responde ao espaço dele, não à janela.</h2>
          <p className="prisma-hint">↔ Arraste o canto inferior direito da caixa para redimensionar</p>
        </header>
        <div className="prisma-resizer">
          <div className="cq">
            <article className="cq-card">
              <div className="cq-card__art" aria-hidden />
              <div className="cq-card__body">
                <span className="cq-card__tag">Container Query</span>
                <h3>Cartão adaptável</h3>
                <p>
                  Em 3 larguras ele vira lista compacta, cartão com arte ao lado e, no maior tamanho, painel com
                  colunas. A tipografia usa <code>cqi</code> (1% da largura do container).
                </p>
                <ul>
                  <li>container-type: inline-size</li>
                  <li>@container (min-width: …)</li>
                  <li>unidades cqi / cqb</li>
                </ul>
              </div>
              <div className="cq-card__side">
                <b>100%</b>
                <span>sem media query</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ───────── :has() ───────── */}
      <section id="has" className="prisma-sec">
        <header className="prisma-sec__head">
          <p className="prisma-kicker">:has() · @property · transição de matiz</p>
          <h2>O pai reage ao filho. Escolha um plano.</h2>
        </header>

        <div className="has-lab" data-spot="prisma-has">
          <fieldset className="plans">
            <legend className="sr-only">Plano</legend>
            {[
              ['p1', 'Aurora', 'Matiz verde-água', '0'],
              ['p2', 'Oceano', 'Matiz azul', '29'],
              ['p3', 'Magenta', 'Matiz rosa', '59'],
            ].map(([id, name, desc, price], i) => (
              <label key={id} className="plan">
                <input type="radio" name="plan" id={id} defaultChecked={i === 1} />
                <span className="plan__name">{name}</span>
                <span className="plan__desc">{desc}</span>
                <span className="plan__price">
                  R$ <b>{price}</b>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="has-lab__side">
            <div className="dimgrid" aria-label="Passe o mouse: os irmãos escurecem via :has()">
              {['Vidro', 'Névoa', 'Prisma', 'Aurora', 'Cristal', 'Luz'].map((t) => (
                <button key={t} type="button" className="tile">
                  {t}
                </button>
              ))}
            </div>

            <form className="mini-form" onSubmit={(e) => e.preventDefault()}>
              <label className="field">
                <span>E-mail (validação com :user-invalid)</span>
                <input type="email" required placeholder="voce@exemplo.com" />
                <em className="field__msg">Parece que falta algo no e-mail…</em>
                <em className="field__ok">Perfeito ✓</em>
              </label>
              <label className="field">
                <span>Mensagem (field-sizing: content)</span>
                <textarea placeholder="Escreva e veja a caixa crescer sozinha…" rows={1} />
              </label>
              <button type="submit">Enviar</button>
            </form>
          </div>
        </div>
      </section>

      {/* ───────── ANCHOR + POPOVER + DETAILS ───────── */}
      <section id="ancora" className="prisma-sec" data-spot="prisma-anchor">
        <header className="prisma-sec__head">
          <p className="prisma-kicker">anchor positioning · popover · details</p>
          <h2>Tooltips e menus sem uma linha de JavaScript.</h2>
        </header>

        <div className="anchor-lab">
          <div className="anchor-lab__chips">
            {anchors.map((a, i) => (
              <div key={a.id} className="anchor-slot">
                <button
                  type="button"
                  className="chip"
                  popoverTarget={`tip-${a.id}`}
                  style={{ anchorName: `--chip-${a.id}` } as CSSProperties}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span> {a.label}
                </button>
                <div
                  id={`tip-${a.id}`}
                  popover="auto"
                  className="tip"
                  style={{ positionAnchor: `--chip-${a.id}` } as CSSProperties}
                >
                  {a.body}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="chip chip--menu"
              popoverTarget="menu-x"
              style={{ anchorName: '--menu-x' } as CSSProperties}
            >
              Menu ▾
            </button>
            <div id="menu-x" popover="auto" className="menu" style={{ positionAnchor: '--menu-x' } as CSSProperties}>
              <a href="#luz">Scroll-driven</a>
              <a href="#container">Container queries</a>
              <a href="#cubo">Cubo 3D</a>
              <a href="#carrossel">Carrossel</a>
            </div>
          </div>

          <div className="faq">
            <details name="faq" open>
              <summary>Por que animar com CSS?</summary>
              <p>
                Animações de transform/opacity/filter rodam no compositor, fora da thread principal. Mesmo com o JS
                ocupado, o scroll continua fluido.
              </p>
            </details>
            <details name="faq">
              <summary>O que é interpolate-size?</summary>
              <p>
                Permite transicionar de <code>height: 0</code> para <code>auto</code>. Este acordeão anima a altura
                real do conteúdo via <code>::details-content</code>.
              </p>
            </details>
            <details name="faq">
              <summary>E nos navegadores sem suporte?</summary>
              <p>
                Tudo aqui degrada com elegância: popovers viram diálogos centrais, animações por scroll ficam no
                estado final e o carrossel vira uma lista rolável.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ───────── CUBO 3D guiado por scroll ───────── */}
      <section id="cubo" className="story" data-spot="prisma-cube">
        <div className="story__sticky">
          <div className="story__scene" aria-hidden>
            <div className="cube">
              <i className="f f1" />
              <i className="f f2" />
              <i className="f f3" />
              <i className="f f4" />
              <i className="f f5" />
              <i className="f f6" />
              <b className="core" />
            </div>
          </div>
          <div className="story__ring" aria-hidden />
          <div className="story__caps">
            <p className="cap cap1">
              <small>01</small>
              <b>transform 3D</b>
              Seis faces, <code>preserve-3d</code> e perspectiva — nenhum canvas.
            </p>
            <p className="cap cap2">
              <small>02</small>
              <b>named view-timeline</b>
              Uma única linha do tempo (<code>--story</code>) conduz cubo, anel e legendas.
            </p>
            <p className="cap cap3">
              <small>03</small>
              <b>@property animado</b>
              O anel de progresso anima um número registrado (<code>--p</code>) usado no gradiente cônico.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── CARROSSEL CSS ───────── */}
      <section id="carrossel" className="prisma-sec">
        <header className="prisma-sec__head">
          <p className="prisma-kicker">scroll-snap · ::scroll-marker · view(inline)</p>
          <h2>Um carrossel com indicadores — gerado pelo CSS.</h2>
          <p className="prisma-hint">Em Chrome 135+ aparecem setas e marcadores nativos. Nos demais, scroll-snap puro.</p>
        </header>
        <ul className="carousel" data-spot="prisma-carousel">
          {['Aurora', 'Névoa', 'Cristal', 'Lume', 'Brisa', 'Aço'].map((n, i) => (
            <li key={n} style={{ '--i': i } as CSSProperties}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      </section>

      <footer className="prisma-foot">
        <p>
          Tudo desta página cabe em <b>~1 arquivo CSS</b>. Peça a técnica pelo nome e eu isolo o trecho.
        </p>
      </footer>
    </div>
  )
}
