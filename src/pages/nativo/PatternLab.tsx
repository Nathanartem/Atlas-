/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PatternLab.tsx — URLPattern: casar e extrair partes de URLs sem regex à mão
 * ═══════════════════════════════════════════════════════════════════════════
 *  A sintaxe é a mesma de rotas do Express/React Router (`/users/:id`), mas nativa. Também funciona
 *  em Service Workers (roteamento de fetch) e é a base de rotas de "Speculation Rules".
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useMemo, useState } from 'react'
import { Out, Spec } from './Spec.tsx'

interface URLPatternLike {
  exec: (input: string) => { pathname: { groups: Record<string, string | undefined> }; search: { groups: Record<string, string | undefined> } } | null
}
type URLPatternCtor = new (init: { pathname?: string; search?: string }) => URLPatternLike

export function PatternLab() {
  const Pattern = (globalThis as unknown as { URLPattern?: URLPatternCtor }).URLPattern
  const [pattern, setPattern] = useState('/mundos/:pagina/tecnicas/:n(\\d+)')
  const [url, setUrl] = useState('https://atlas.dev/mundos/pulse/tecnicas/7?lang=pt')

  // @tech URLPattern (roteamento nativo por padrão de URL)
  // `new URLPattern({ pathname })` compila `:nome`, `:n(\\d+)` (com regex), `*` e `{grupo}?`. `exec(url)` devolve
  // os grupos nomeados ou null. Erros de sintaxe do padrão lançam — por isso o try/catch e a mensagem na UI.
  const result = useMemo(() => {
    if (!Pattern) return { error: 'indisponível', groups: null as Record<string, string | undefined> | null }
    try {
      const m = new Pattern({ pathname: pattern }).exec(url)
      return { error: '', groups: m ? m.pathname.groups : null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'padrão inválido', groups: null }
    }
  }, [Pattern, pattern, url])

  return (
    <Spec fig={7} title="Casar URLs com padrões nomeados" api="URLPattern" supported={Boolean(Pattern)} spot="nat-fig-07">
      <label className="nat-field">
        <span>pathname do padrão</span>
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} />
      </label>
      <label className="nat-field">
        <span>URL</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
      </label>
      <dl className="nat-outs">
        <Out label="resultado">{result.error ? `erro: ${result.error}` : result.groups ? '✓ casou' : '✗ não casou'}</Out>
        {result.groups &&
          Object.entries(result.groups)
            .filter(([k]) => Number.isNaN(Number(k)))
            .map(([k, val]) => (
              <Out key={k} label={`:${k}`}>
                {val ?? '—'}
              </Out>
            ))}
      </dl>
    </Spec>
  )
}
