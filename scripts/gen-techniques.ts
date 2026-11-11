// Gera TECHNIQUES.md a partir de src/data/techniques.ts + marcadores `@tech` do código.
// Uso: npm run docs   (Node 24 executa TypeScript nativamente)
import { writeFileSync } from 'node:fs'
import { catalog, pages, scanMarkers, shellTechniques, techniques } from './docs-lib.ts'

const markers = scanMarkers()
const byName = new Map<string, typeof markers>()
for (const m of markers) byName.set(m.name, [...(byName.get(m.name) ?? []), m])

const esc = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ')
/** `src/x/y.ts:42` — clicável no GitHub/Cursor. */
const loc = (name: string) =>
  (byName.get(name) ?? []).map((m) => `\`${m.file}:${m.line}\``).join('<br>') || '**⚠ sem marcador @tech**'

const total = catalog().length
const lines: string[] = []
const push = (s = '') => lines.push(s)

push('# Catálogo de técnicas — Atlas')
push()
push(`> Gerado automaticamente por \`npm run docs\` a partir de \`src/data/techniques.ts\` e dos marcadores \`@tech\` no código.`)
push(`> **${total} técnicas** em ${pages.length} páginas + casca compartilhada. A coluna “Onde” aponta o **arquivo:linha real** do marcador — não edite este arquivo à mão.`)
push('> Para levar uma técnica a outro projeto, peça pelo **nome** exato; para entender o “como”, leia o [GUIA.md](./GUIA.md).')
push()
push('## Índice')
push()
for (const p of pages) push(`- [${p.number} · ${p.name}](#${p.number}--${p.name.toLowerCase()}) — \`${p.path}\` · ${techniques[p.id]?.length ?? 0} técnicas`)
push('- [Casca compartilhada](#casca-compartilhada)')
push()

const table = (list: { name: string; what: string }[]) => {
  push('| # | Técnica | O que é | Onde (arquivo:linha) |')
  push('|---|---------|---------|----------------------|')
  list.forEach((t, i) => push(`| ${i + 1} | **${esc(t.name)}** | ${esc(t.what)} | ${loc(t.name)} |`))
  push()
}

for (const p of pages) {
  push(`## ${p.number} · ${p.name}`)
  push()
  push(`**Rota:** \`${p.path}\` · **Tagline:** ${p.tagline}`)
  push()
  push(p.summary)
  push()
  push(`Tags: ${p.tags.map((t) => `\`${t}\``).join(' ')}`)
  push()
  table(techniques[p.id] ?? [])
}

push('## Casca compartilhada')
push()
push('Presente em todas as rotas (`src/shell/`, `src/router.tsx`, `src/index.css`, `src/lib/`).')
push()
table(shellTechniques)

writeFileSync(new URL('../TECHNIQUES.md', import.meta.url), lines.join('\n'))

// Texto dos comentários @tech, para o comando `explain` do terminal. Não edite à mão.
const notes = catalog().map((t) => {
  const marks = byName.get(t.name) ?? []
  const detail = [...new Set(marks.map((m) => m.detail).filter(Boolean))].join(' ')
  const first = marks[0]
  return `  ${JSON.stringify(t.name)}: { file: ${JSON.stringify(first?.file ?? '')}, line: ${first?.line ?? 0}, detail: ${JSON.stringify(detail)} },`
})
writeFileSync(
  new URL('../src/data/tech-details.ts', import.meta.url),
  `// Gerado por \`npm run docs\`. Não edite à mão — o texto vem dos comentários @tech.\nexport const techDetails: Record<string, { file: string; line: number; detail: string }> = {\n${notes.join('\n')}\n}\n`,
)

const missing = catalog().filter((t) => !byName.has(t.name)).length
console.log(`TECHNIQUES.md gerado — ${total} técnicas${missing ? `, ${missing} SEM marcador (rode npm run check:docs)` : ', todas localizadas no código'}`)
