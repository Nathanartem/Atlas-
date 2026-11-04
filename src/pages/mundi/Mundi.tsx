/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  08 · MUNDI — cartografia e visualização de dados com d3-geo
 * ═══════════════════════════════════════════════════════════════════════════
 *  Mapa do arquivo
 *   • Mundi (default) ... compõe as seções e guarda a cidade selecionada (estado compartilhado)
 *   • CityCard .......... ficha da cidade: relógio local (Intl) + dia/noite
 *   • Ranking ........... barras CSS das cidades mais populosas (clicar seleciona no globo)
 *
 *  Onde está o quê
 *   • cities.ts ........ dados das cidades        • geo.ts ... mundo, projeções, indicadores, Sol
 *   • Globe.tsx ........ globo (loop contínuo)    • Lab.tsx .. mapa plano (redesenho sob demanda)
 *   • mundi.css ........ visual "carta náutica" (papel, tinta, azul-marinho)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import { useEffect, useMemo, useState } from 'react'
import './mundi.css'
import { cities } from './cities.ts'
import { subsolarPoint } from './geo.ts'
import { Globe } from './Globe.tsx'
import { Lab } from './Lab.tsx'

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Ficha da cidade selecionada. */
function CityCard({ index }: { index: number | null }) {
  // Relógio: re-renderiza a cada segundo SOMENTE este componente
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (index === null) {
    return (
      <div className="mundi-card mundi-card--empty" data-spot="mundi-clock">
        <p>Clique em uma cidade no globo (ou no ranking) para ver o horário local e se lá é dia ou noite.</p>
      </div>
    )
  }
  const c = cities[index]
  // @tech Relógio local com Intl.DateTimeFormat e fusos IANA
  // `timeZone: 'Asia/Tokyo'` etc. — o navegador resolve horário de verão e regras históricas sozinho.
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone: c.tz, weekday: 'long', day: 'numeric', month: 'long' }).format(now)

  // Dia ou noite? O sol está acima do horizonte quando a distância angular ao ponto subsolar é < 90°.
  const [sLon, sLat] = subsolarPoint(now)
  const toRad = Math.PI / 180
  const cosDist =
    Math.sin(c.lat * toRad) * Math.sin(sLat * toRad) + Math.cos(c.lat * toRad) * Math.cos(sLat * toRad) * Math.cos((c.lon - sLon) * toRad)
  const isDay = cosDist > 0

  return (
    <div className="mundi-card" data-spot="mundi-clock">
      <p className="mundi-card__country">{c.country}</p>
      <h3>{c.name}</h3>
      <p className="mundi-card__time">{time}</p>
      <p className="mundi-card__day">{day}</p>
      <dl>
        <div>
          <dt>população (aprox.)</dt>
          <dd>{c.pop < 1 ? nf.format(c.pop * 1000) + ' mil' : nf.format(c.pop) + ' mi'}</dd>
        </div>
        <div>
          <dt>coordenadas</dt>
          <dd>
            {Math.abs(c.lat).toFixed(2)}°{c.lat >= 0 ? 'N' : 'S'} {Math.abs(c.lon).toFixed(2)}°{c.lon >= 0 ? 'L' : 'O'}
          </dd>
        </div>
        <div>
          <dt>agora</dt>
          <dd>{isDay ? '☀ dia' : '☾ noite'}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Barras horizontais: largura = população / maior população (transição CSS entre estados). */
function Ranking({ selected, onSelect }: { selected: number | null; onSelect: (i: number) => void }) {
  const top = useMemo(
    () =>
      cities
        .map((c, i) => ({ c, i }))
        .sort((a, b) => b.c.pop - a.c.pop)
        .slice(0, 12),
    [],
  )
  const max = top[0].c.pop
  return (
    <ol className="mundi-rank" data-spot="mundi-rank">
      {top.map(({ c, i }, rank) => (
        <li key={c.name}>
          <button type="button" aria-pressed={selected === i} onClick={() => onSelect(i)}>
            <span className="mundi-rank__n">{String(rank + 1).padStart(2, '0')}</span>
            <span className="mundi-rank__name">
              {c.name} <small>{c.country}</small>
            </span>
            <span className="mundi-rank__bar" style={{ '--w': `${(c.pop / max) * 100}%` } as React.CSSProperties} />
            <span className="mundi-rank__v">{nf.format(c.pop)} mi</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

export default function Mundi() {
  const [selected, setSelected] = useState<number | null>(null)

  const select = (i: number | null) => {
    setSelected(i)
    // vindo do ranking: leva o usuário de volta ao globo
    if (i !== null) document.getElementById('globo')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main className="mundi" data-spot-page data-spot="mundi-page">
      <title>Atlas — Mundi</title>

      <header className="mundi-hero" id="globo">
        <div className="mundi-hero__text">
          <p className="mundi-eyebrow">08 — Cartografia · d3-geo</p>
          <h1>
            Mundi<em>.</em>
          </h1>
          <p className="mundi-lede">
            Um globo de verdade, desenhado em canvas com <code>d3-geo</code>: arraste, deixe girar, clique numa cidade. A sombra é o{' '}
            <b>terminador dia/noite calculado agora</b> a partir da posição do Sol.
          </p>
          <CityCard index={selected} />
        </div>
        <div className="mundi-hero__globe" data-spot="mundi-globe">
          <Globe selected={selected} onSelect={select} />
        </div>
      </header>

      <section className="mundi-section">
        <p className="mundi-eyebrow">Laboratório</p>
        <h2>
          Todo mapa <em>mente</em> um pouco. Veja como.
        </h2>
        <p className="mundi-lead">
          Troque a projeção e o mapa se transforma em tempo real (interpolação ponto a ponto). Ative os <b>círculos de Tissot</b>: todos são
          iguais na esfera — o quanto eles se deformam é o erro da projeção.
        </p>
        <Lab />
      </section>

      <section className="mundi-section">
        <p className="mundi-eyebrow">Ranking</p>
        <h2>
          As doze maiores <em>metrópoles</em>.
        </h2>
        <Ranking selected={selected} onSelect={select} />
        <p className="mundi-foot">
          Populações metropolitanas aproximadas, apenas ilustrativas. Fronteiras: Natural Earth 1:110m (pacote <code>world-atlas</code>). Os
          indicadores “sintéticos” do laboratório são modelos simplificados para demonstrar a técnica — não são dados medidos.
        </p>
      </section>
    </main>
  )
}
