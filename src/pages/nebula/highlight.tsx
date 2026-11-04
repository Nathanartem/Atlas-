import type { ReactNode } from 'react'

/**
 * Realce de sintaxe WGSL em ~20 linhas, sem biblioteca.
 *
 * @tech Realce de sintaxe WGSL sem biblioteca
 * Uma única regex com 6 grupos de captura percorre o texto com `matchAll`. O índice do grupo que
 * casou decide a classe CSS (`wgsl-comment`, `wgsl-attr`, …; estilos em nebula.css). O texto entre
 * dois matches é preservado como string pura, então `<pre>` mantém indentação e quebras de linha.
 */
const TOKEN =
  /(\/\/.*$)|(@\w+)|\b(fn|var|let|const|struct|if|else|for|loop|return|discard|break|continue)\b|\b(f32|u32|i32|bool|vec[234][fiu]?|mat[234]x[234]f?|array|texture_2d|sampler)\b|\b(\d+\.?\d*(?:e-?\d+)?[fu]?)\b|\b([a-z_][A-Za-z0-9_]*)(?=\()/gm

const CLASSES = ['', 'wgsl-comment', 'wgsl-attr', 'wgsl-keyword', 'wgsl-type', 'wgsl-number', 'wgsl-fn']

export function highlightWgsl(source: string): ReactNode[] {
  const out: ReactNode[] = []
  let cursor = 0
  for (const m of source.matchAll(TOKEN)) {
    const start = m.index
    if (start > cursor) out.push(source.slice(cursor, start))
    // m[1..6] — o primeiro grupo definido indica a categoria do token
    const group = m.findIndex((g, idx) => idx > 0 && g !== undefined)
    out.push(
      <span key={start} className={CLASSES[group]}>
        {m[0]}
      </span>,
    )
    cursor = start + m[0].length
  }
  if (cursor < source.length) out.push(source.slice(cursor))
  return out
}
