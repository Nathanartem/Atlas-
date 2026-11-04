/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  IntlLab.tsx — internacionalização nativa (Intl) e Temporal
 * ═══════════════════════════════════════════════════════════════════════════
 *  Nenhuma biblioteca de i18n/datas: tudo vem do motor do navegador, que já traz as regras de
 *  todos os idiomas. Cada função `new Intl.X(...)` é barata, mas criamos dentro de `useMemo`
 *  quando a entrada muda (o construtor carrega dados de locale).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useMemo, useState } from 'react'
import { Out, Spec } from './Spec.tsx'
import { features } from './support.ts'

const has = (id: string) => features.find((f) => f.id === id)!.test()

/* ───────── Texto: contar "caracteres" de verdade ───────── */
export function SegmenterLab() {
  const [text, setText] = useState('Olá 👨‍👩‍👧‍👦 mundo 🇧🇷! Café ☕')

  // @tech Intl.Segmenter (grafemas e palavras)
  // `string.length` conta unidades UTF-16 — um emoji de família vale 11! O Segmenter segue as regras
  // Unicode (UAX #29): "grapheme" = o que o usuário enxerga como UM caractere; "word" separa palavras
  // em qualquer idioma (inclusive sem espaços, como japonês).
  const stats = useMemo(() => {
    const seg = (granularity: 'grapheme' | 'word') => [...new Intl.Segmenter('pt-BR', { granularity }).segment(text)]
    return {
      utf16: text.length,
      points: [...text].length,
      graphemes: seg('grapheme').length,
      words: seg('word').filter((s) => s.isWordLike).length,
    }
  }, [text])

  return (
    <Spec fig={1} title="Quantos caracteres tem este texto?" api="Intl.Segmenter" supported={has('segmenter')} spot="nat-fig-01">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-label="Texto para contar" />
      <dl className="nat-outs nat-outs--4">
        <Out label="string.length">{stats.utf16}</Out>
        <Out label="code points">{stats.points}</Out>
        <Out label="grafemas">{stats.graphemes}</Out>
        <Out label="palavras">{stats.words}</Out>
      </dl>
      <p className="nat-hint">Só “grafemas” corresponde ao que você vê na tela. Cole emojis de bandeira ou família para comparar.</p>
    </Spec>
  )
}

/* ───────── Nomes de países/idiomas em qualquer locale ───────── */
const LOCALES = ['pt-BR', 'en', 'ja', 'ar', 'ru']

export function DisplayNamesLab() {
  const [loc, setLoc] = useState('ja')
  const names = useMemo(() => {
    const region = new Intl.DisplayNames([loc], { type: 'region' })
    const lang = new Intl.DisplayNames([loc], { type: 'language' })
    const cur = new Intl.DisplayNames([loc], { type: 'currency' })
    return {
      br: region.of('BR'),
      jp: region.of('JP'),
      eg: region.of('EG'),
      pt: lang.of('pt-BR'),
      usd: cur.of('USD'),
    }
  }, [loc])

  // @tech Intl.DisplayNames (países, idiomas e moedas traduzidos)
  // Zero tabelas de tradução no bundle: o navegador devolve "Brasil", "ブラジル", "البرازيل"… a partir de códigos ISO.
  return (
    <Spec fig={2} title="Países, idiomas e moedas no idioma escolhido" api="Intl.DisplayNames" supported={has('displaynames')} spot="nat-fig-02">
      <div className="nat-chips" role="group" aria-label="Idioma de exibição">
        {LOCALES.map((l) => (
          <button key={l} type="button" aria-pressed={loc === l} onClick={() => setLoc(l)}>
            {l}
          </button>
        ))}
      </div>
      <dl className="nat-outs">
        <Out label="BR">{names.br}</Out>
        <Out label="JP">{names.jp}</Out>
        <Out label="EG">{names.eg}</Out>
        <Out label="pt-BR">{names.pt}</Out>
        <Out label="USD">{names.usd}</Out>
      </dl>
    </Spec>
  )
}

/* ───────── Tempo relativo, listas e ordenação ───────── */
export function FormatLab() {
  const [days, setDays] = useState(-3)
  const [items] = useState(['Vite', 'React', 'TypeScript', 'Tailwind'])
  const rtf = useMemo(() => new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }), [])
  // @tech Intl.RelativeTimeFormat, ListFormat e Collator
  // "há 3 dias", "amanhã", "A, B e C", "arquivo2 antes de arquivo10": regras de plural, conjunção e
  // ordenação natural vêm do navegador — nada de `if (n === 1)` espalhado pelo código.
  const list = (type: 'conjunction' | 'disjunction') => new Intl.ListFormat('pt-BR', { style: 'long', type }).format(items)
  const sorted = ['arquivo10', 'Arquivo2', 'arquivo1', 'árvore'].toSorted(new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' }).compare)

  return (
    <Spec fig={3} title="Datas relativas, listas e ordenação natural" api="Intl.RelativeTimeFormat · ListFormat · Collator" supported spot="nat-fig-03">
      <label className="nat-field">
        <span>dias a partir de hoje: {days}</span>
        <input type="range" min={-30} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} />
      </label>
      <dl className="nat-outs">
        <Out label="relativo">{rtf.format(days, 'day')}</Out>
        <Out label="e">{list('conjunction')}</Out>
        <Out label="ou">{list('disjunction')}</Out>
        <Out label="ordem natural">{sorted.join(' < ')}</Out>
      </dl>
    </Spec>
  )
}

/* ───────── Temporal (quando existir) ───────── */
interface TemporalLike {
  Now: { zonedDateTimeISO: (tz?: string) => ZonedLike; timeZoneId: () => string }
}
interface ZonedLike {
  toString: () => string
  year: number
  until: (other: ZonedLike, o: { largestUnit: string }) => { days: number; hours: number }
  with: (f: Record<string, number>) => ZonedLike
  add: (d: Record<string, number>) => ZonedLike
  withTimeZone: (tz: string) => ZonedLike
  toLocaleString: (l: string, o?: object) => string
}

export function TemporalLab() {
  const T = (globalThis as unknown as { Temporal?: TemporalLike }).Temporal
  const supported = Boolean(T)

  // @tech Temporal (datas imutáveis com fuso)
  // Substitui o `Date`: objetos imutáveis, fusos IANA de primeira classe e aritmética sem pegadinhas
  // (`until` já considera horário de verão). Só roda onde `globalThis.Temporal` existe.
  const info = useMemo(() => {
    if (!T) return null
    const now = T.Now.zonedDateTimeISO()
    const nextYear = now.with({ month: 1, day: 1, hour: 0, minute: 0, second: 0 }).add({ years: 1 })
    const until = now.until(nextYear, { largestUnit: 'day' })
    return {
      iso: now.toString(),
      tz: T.Now.timeZoneId(),
      toNewYear: `${until.days} dias e ${until.hours} h`,
      tokyo: now.withTimeZone('Asia/Tokyo').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    }
  }, [T])

  return (
    <Spec fig={4} title="Datas com fuso, sem moment.js" api="Temporal.Now · ZonedDateTime" supported={supported} spot="nat-fig-04">
      {info ? (
        <dl className="nat-outs">
          <Out label="agora (ISO)">{info.iso}</Out>
          <Out label="fuso">{info.tz}</Out>
          <Out label="até o Ano-Novo">{info.toNewYear}</Out>
          <Out label="em Tóquio">{info.tokyo}</Out>
        </dl>
      ) : (
        <p className="nat-hint">Este navegador ainda não expõe <code>Temporal</code>. Use o polyfill <code>@js-temporal/polyfill</code> enquanto isso.</p>
      )}
    </Spec>
  )
}
