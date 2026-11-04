/**
 * Biblioteca compartilhada pelos scripts de documentação (gen-techniques.ts e check-docs.ts).
 *
 * Fonte da verdade:
 *   • src/data/techniques.ts → o CATÁLOGO (nome, o que é, onde)
 *   • marcadores `@tech <nome exato>` espalhados pelo código → a LOCALIZAÇÃO real (arquivo:linha)
 * Se o nome de uma técnica não tiver marcador (ou vice-versa) o `check-docs` falha — é isso que impede
 * o catálogo, o guia e o código de divergirem.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pages } from '../src/data/pages.ts'
import { shellTechniques, techniques } from '../src/data/techniques.ts'

// fileURLToPath decodifica "%20" e a letra do drive no Windows (pathname puro quebraria com "teste front")
export const ROOT = fileURLToPath(new URL('..', import.meta.url))
export const SRC = join(ROOT, 'src')

export interface Marker {
  name: string
  /** caminho relativo à raiz do projeto, com "/" */
  file: string
  line: number
}

/** Extensões que podem conter marcadores. */
const EXT = /\.(ts|tsx|css|wgsl)$/

export function walk(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: false })
    .map(String)
    .filter((f) => EXT.test(f))
    .map((f) => join(dir, f))
}

// Remove o fechamento de comentário de bloco (com ou sem "}" de JSX) no fim da linha, além de espaços.
const clean = (s: string) => s.replace(/\s*\*\/\}?\s*$/, '').trim()

/** Varre `src/` e devolve todos os marcadores `@tech Nome`. */
export function scanMarkers(): Marker[] {
  const out: Marker[] = []
  for (const abs of walk(SRC)) {
    const rel = relative(ROOT, abs).split(sep).join('/')
    const lines = readFileSync(abs, 'utf8').split(/\r?\n/)
    lines.forEach((text, i) => {
      // O marcador só vale se a etiqueta abre o comentário ou a linha: `// @tech`, `/* @tech`, `{/* @tech`,
      // ` * @tech` ou (dentro de comentário de bloco CSS) linha que começa direto em `@tech`.
      // Menções no meio de uma frase (ex.: explicando a convenção) NÃO contam.
      const m = text.match(/(?:\/\/|\/\*+|^\s*\*|\{\/\*|^)\s*@tech\s+(.+)$/)
      if (m) out.push({ name: clean(m[1]), file: rel, line: i + 1 })
    })
  }
  return out
}

export interface CatalogEntry {
  pageId: string | 'shell'
  index: number
  name: string
  what: string
  where: string
}

/** Catálogo achatado (páginas na ordem de `pages.ts`, depois a casca). */
export function catalog(): CatalogEntry[] {
  const out: CatalogEntry[] = []
  for (const p of pages) (techniques[p.id] ?? []).forEach((t, i) => out.push({ pageId: p.id, index: i + 1, ...t }))
  shellTechniques.forEach((t, i) => out.push({ pageId: 'shell', index: i + 1, ...t }))
  return out
}

export { pages, shellTechniques, techniques }
