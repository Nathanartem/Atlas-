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
  /** texto do comentário logo abaixo do marcador — o “como foi feita” */
  detail: string
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

const markerRe = /(?:\/\/|\/\*+|^\s*\*|\{\/\*|^)\s*@tech\s+(.+)$/

/** `/*` ainda aberto ao fim da linha `index` (comentário de bloco ou JSX). */
function blockStillOpen(lines: string[], index: number): boolean {
  let open = false
  for (let i = 0; i <= index; i++) {
    const opens = lines[i].match(/\/\*/g)?.length ?? 0
    const closes = lines[i].match(/\*\//g)?.length ?? 0
    if (opens > closes) open = true
    else if (closes > opens) open = false
  }
  return open
}

/** Parágrafo explicativo que segue o marcador, sem a linha do próprio `@tech`. */
function detailAfter(lines: string[], index: number): string {
  const parts: string[] = []
  const lineComments = lines[index].includes('//') && !lines[index].includes('/*')
  if (lineComments) {
    for (let i = index + 1; i < lines.length; i++) {
      const m = lines[i].match(/^\s*\/\/\s?(.*)$/)
      if (!m || markerRe.test(lines[i])) break
      parts.push(m[1])
    }
  } else if (blockStillOpen(lines, index)) {
    for (let i = index + 1; i < lines.length; i++) {
      if (markerRe.test(lines[i])) break
      const raw = lines[i]
      if (raw.includes('*/')) {
        const before = raw.slice(0, raw.indexOf('*/')).replace(/^\s*(?:\*\s?)?/, '').trim()
        if (before && !/^[═─\s]+$/.test(before)) parts.push(before)
        break
      }
      const piece = raw.replace(/^\s*(?:\*\s?)?/, '').trim()
      if (!piece || /^[═─\s]+$/.test(piece)) {
        if (parts.some((p) => p.trim())) break
        continue
      }
      if (/^Mapa do arquivo\b/i.test(piece)) break
      parts.push(piece)
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

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
      const m = text.match(markerRe)
      if (m) out.push({ name: clean(m[1]), file: rel, line: i + 1, detail: detailAfter(lines, i) })
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
