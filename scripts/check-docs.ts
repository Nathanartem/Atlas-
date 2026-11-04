// Valida a HARMONIA entre código, catálogo (techniques.ts) e GUIA.md.
// Uso: npm run check:docs      → sai com código 1 se algo divergir
//
// Regras verificadas
//  1. Toda técnica do catálogo tem ≥ 1 marcador `@tech <nome>` no código.
//  2. Todo marcador `@tech` no código corresponde a uma técnica do catálogo (sem órfãos).
//  3. Nomes de técnicas são únicos no catálogo.
//  4. GUIA.md: todo caminho `src/...` citado existe.
//  5. GUIA.md: toda referência `arquivo.ext → símbolo` aponta para um arquivo real que contém o símbolo.
//  6. GUIA.md: toda técnica citada com «Nome» existe no catálogo, e TODA técnica do catálogo é citada.
//  7. GUIA.md: toda página (rota) tem uma seção.
import { existsSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { catalog, pages, ROOT, scanMarkers, SRC, walk } from './docs-lib.ts'

const errors: string[] = []
const warn: string[] = []
const fail = (s: string) => errors.push(s)

const entries = catalog()
const markers = scanMarkers()
const markerNames = new Set(markers.map((m) => m.name))
const catalogNames = new Set(entries.map((e) => e.name))

// 1 + 2 + 3
for (const e of entries) if (!markerNames.has(e.name)) fail(`[marcador] "${e.name}" (${e.pageId}) não tem \`@tech\` no código`)
for (const m of markers) if (!catalogNames.has(m.name)) fail(`[órfão] ${m.file}:${m.line} — "@tech ${m.name}" não existe em techniques.ts`)
const seen = new Set<string>()
for (const e of entries) {
  if (seen.has(e.name)) fail(`[duplicado] "${e.name}" aparece mais de uma vez no catálogo`)
  seen.add(e.name)
}

// índice de arquivos por basename (para `arquivo.ext → símbolo`)
const files = walk(SRC).map((abs) => ({ abs, rel: relative(ROOT, abs).split(sep).join('/'), base: abs.split(sep).pop()! }))
const byBase = new Map<string, typeof files>()
for (const f of files) byBase.set(f.base, [...(byBase.get(f.base) ?? []), f])

const guidePath = join(ROOT, 'GUIA.md')
if (!existsSync(guidePath)) {
  fail('[guia] GUIA.md não existe')
} else {
  const guide = readFileSync(guidePath, 'utf8')

  // 4. caminhos src/...
  const paths = new Set([...guide.matchAll(/`(src\/[\w./@-]+\.(?:ts|tsx|css|wgsl|json))`/g)].map((m) => m[1]))
  for (const p of paths) if (!existsSync(join(ROOT, p))) fail(`[guia] caminho inexistente: ${p}`)

  // 5. `arquivo.ext → símbolo`  (o símbolo pode ter sufixo "()" ou espaços de explicação depois)
  for (const m of guide.matchAll(/`([\w.-]+\.(?:ts|tsx|css|wgsl))\s*→\s*([^`]+)`/g)) {
    const [, base, rest] = m
    const symbol = rest.trim().split(/[\s(·,]/)[0]
    const candidates = byBase.get(base)
    if (!candidates) {
      fail(`[guia] arquivo "${base}" (em \`${m[0]}\`) não existe em src/`)
      continue
    }
    if (symbol && !candidates.some((f) => readFileSync(f.abs, 'utf8').includes(symbol))) {
      fail(`[guia] símbolo "${symbol}" não encontrado em ${candidates.map((c) => c.rel).join(' | ')} (\`${m[0]}\`)`)
    }
  }

  // 6. «técnicas»
  const cited = new Set([...guide.matchAll(/«([^»]+)»/g)].map((m) => m[1]))
  for (const c of cited) if (!catalogNames.has(c)) fail(`[guia] técnica citada «${c}» não existe no catálogo`)
  for (const e of entries) if (!cited.has(e.name)) fail(`[guia] técnica sem explicação no guia: «${e.name}» (${e.pageId})`)

  // 7. seções de página
  for (const p of pages) if (!new RegExp(`^## .*${p.number} · ${p.name}`, 'm').test(guide)) fail(`[guia] falta a seção "## … ${p.number} · ${p.name}"`)
}

// extra: arquivos de src/ citados em techniques.ts (campo where) — só aviso, formato é livre
for (const e of entries) {
  const m = e.where.match(/([\w.-]+\.(?:tsx|ts|css|wgsl))\b/)
  if (m && !byBase.has(m[1])) warn.push(`[where] "${e.name}" cita ${m[1]}, que não existe em src/`)
}

for (const w of warn) console.warn('⚠', w)
if (errors.length) {
  console.error(`\n✗ ${errors.length} problema(s) de harmonia:\n`)
  for (const e of errors) console.error('  •', e)
  process.exit(1)
}
console.log(`✓ docs em harmonia — ${entries.length} técnicas · ${markers.length} marcadores @tech · GUIA.md consistente`)
