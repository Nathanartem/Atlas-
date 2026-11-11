/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  commands.ts — o "shell" do terminal: parser, registro de comandos e autocompletar
 * ═══════════════════════════════════════════════════════════════════════════
 *  Camadas (de baixo para cima)
 *   1. Tipos: `OutLine` (o que pode ser impresso) e `Ctx` (o que um comando pode fazer na UI)
 *   2. Comandos: um objeto `commands` — nome → { help, run }. Para criar um comando novo basta
 *      adicionar uma entrada; `help` e o autocompletar o enxergam sozinhos.
 *   3. `execute()`: separa a linha em palavras (respeitando aspas) e despacha.
 *   4. `complete()`: autocompletar por Tab (nomes de comandos e de páginas).
 *
 *  Os comandos leem os MESMOS dados que o resto do site (`pages`, `techniques`, `package.json`),
 *  então o terminal nunca fica desatualizado em relação ao catálogo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { pages, type PageMeta } from '../../data/pages.ts'
import { techDetails } from '../../data/tech-details.ts'
import { shellTechniques, techniques, totalTechniques, type Technique } from '../../data/techniques.ts'
import { spotLook } from '../../shell/spotlight.ts'
import pkg from '../../../package.json'

/* ───────────────────────── 1. TIPOS ───────────────────────── */
export type Tone = 'dim' | 'accent' | 'error' | 'ok'

/** Uma "linha" de saída. `t` discrimina o formato; o componente decide como desenhar cada um. */
export type OutLine =
  | { t: 'text'; s: string; tone?: Tone }
  | { t: 'cmd'; s: string } // eco do que o usuário digitou (prefixo de prompt)
  | { t: 'row'; k: string; v: string } // par "chave  valor" alinhado em colunas
  | { t: 'donut' } // bloco ASCII animado (donut)

export interface Ctx {
  navigate: (path: string) => void
  setTint: (name: string) => boolean
  toggleMatrix: () => boolean
  clear: () => void
  history: () => string[]
}

interface Command {
  help: string
  usage?: string
  run: (args: string[], ctx: Ctx) => OutLine[] | Promise<OutLine[]>
}

/** Cores de fósforo disponíveis (o nome é o argumento do comando `theme`). */
export const TINTS: Record<string, string> = {
  green: '#39ff88',
  amber: '#ffb000',
  ice: '#8fd8ff',
  mono: '#e6e6e6',
}

const text = (s: string, tone?: Tone): OutLine => ({ t: 'text', s, tone })
const row = (k: string, v: string): OutLine => ({ t: 'row', k, v })

/** Encontra uma página por id, nome, número ("07" ou "7") ou rota. */
function findPage(q: string | undefined): PageMeta | undefined {
  if (!q) return undefined
  const s = q.toLowerCase().replace(/^\//, '')
  return pages.find(
    (p) => p.id === s || p.name.toLowerCase() === s || p.number === s.padStart(2, '0') || p.path.replace(/^\//, '') === s,
  )
}

/**
 * GPU via WEBGL_debug_renderer_info (a única forma de saber o nome da placa no navegador).
 * @tech Detecção de hardware do navegador (neofetch)
 * Combina `navigator.hardwareConcurrency/deviceMemory/userAgentData`, `screen`, `matchMedia`,
 * `Intl...resolvedOptions().timeZone` e a extensão de debug do WebGL — tudo com fallback.
 */
function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const name = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'indisponível'
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return 'indisponível'
  }
}

const QUOTES = [
  '“Premature optimization is the root of all evil.” — Knuth',
  '“Make it work, make it right, make it fast.” — Kent Beck',
  '“Simplicity is prerequisite for reliability.” — Dijkstra',
  '“There are only two hard things: cache invalidation and naming things.” — Karlton',
  '“Any sufficiently advanced CSS is indistinguishable from magic.” — adaptado de Clarke',
]

/* ───────────────────────── 2. COMANDOS ───────────────────────── */
// @tech Registro extensível de comandos (objeto nome → { help, run })
// O `help` e o autocompletar percorrem este mesmo objeto: adicionar uma chave cria o comando, a ajuda
// e a sugestão de Tab de uma vez.
function explainTechnique(t: Technique, n: number, total: number, wherePage: string): OutLine[] {
  const note = techDetails[t.name]
  const how = note?.detail ?? ''
  const loc = note?.file ? `${note.file}:${note.line}` : t.where
  const out: OutLine[] = [
    text(`${wherePage}   ${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, 'dim'),
    text(t.name, 'accent'),
    row('o que é', t.what),
  ]
  if (how) out.push(row('como', how))
  out.push(row('código', loc))
  if (t.where && t.where !== loc) out.push(row('arquivo', t.where))
  out.push(row('na página', spotLook(t.spot)))
  out.push(text('No botão { } Técnicas, clique neste nome para ver o bloco iluminado.', 'dim'))
  return out
}

export const commands: Record<string, Command> = {
  help: {
    help: 'lista os comandos',
    run: () => [
      text('Comandos disponíveis:', 'accent'),
      ...Object.entries(commands).map(([name, c]) => row(c.usage ?? name, c.help)),
      text('Dica: Tab completa, ↑/↓ navega no histórico, Ctrl+L limpa.', 'dim'),
    ],
  },

  ls: {
    help: 'lista as páginas do site',
    run: () => [
      ...pages.map((p) => row(`${p.number}  ${p.id}`, `${p.tagline}  ·  ${(techniques[p.id] ?? []).length} técnicas`)),
      text(`${pages.length} páginas · ${totalTechniques} técnicas no total`, 'dim'),
    ],
  },

  open: {
    help: 'navega até uma página (id, nome ou número)',
    usage: 'open <página>',
    run: (args, ctx) => {
      const p = findPage(args[0])
      if (!p) return [text(`open: página "${args[0] ?? ''}" não encontrada. Tente \`ls\`.`, 'error')]
      // pequena espera para o usuário ler a resposta antes da View Transition
      setTimeout(() => ctx.navigate(p.path), 450)
      return [text(`abrindo ${p.number} · ${p.name}…`, 'ok')]
    },
  },

  techniques: {
    help: 'lista as técnicas de uma página',
    usage: 'techniques <página>',
    run: (args) => {
      const p = findPage(args[0])
      if (!p) return [text('uso: techniques <página>   (veja `ls`)', 'error')]
      const list = techniques[p.id] ?? []
      return [
        text(`${p.number} · ${p.name} — ${list.length} técnicas`, 'accent'),
        ...list.map((t, i) => row(String(i + 1).padStart(2, '0'), t.name)),
        text(`use: explain ${p.id} <n> para ver os detalhes`, 'dim'),
      ]
    },
  },

  explain: {
    help: 'explica uma técnica: o que é, como foi feita, onde está no código e na página',
    usage: 'explain <página|shell> <n>',
    run: (args) => {
      const shell = /^(shell|casca)$/i.test(args[0] ?? '')
      const p = shell ? undefined : findPage(args[0])
      const n = Number(args[1])
      const list: Technique[] = shell ? shellTechniques : p ? (techniques[p.id] ?? []) : []
      if ((!shell && !p) || !Number.isInteger(n) || n < 1 || n > list.length) {
        return [text('uso: explain <página|shell> <n>   (n vem de `techniques` ou `shell`)', 'error')]
      }
      return explainTechnique(list[n - 1], n, list.length, shell ? 'casca compartilhada' : `${p!.number} · ${p!.name}`)
    },
  },

  shell: {
    help: 'técnicas da casca compartilhada (dock, transições…)',
    run: () => [
      ...shellTechniques.map((t, i) => row(String(i + 1).padStart(2, '0'), t.name)),
      text('use: explain shell <n> para ver os detalhes', 'dim'),
    ],
  },

  // @tech package.json importado como módulo (comando stack)
  // `resolveJsonModule` deixa importar o JSON como objeto tipado: a lista de bibliotecas e versões
  // exibida no terminal é sempre a real, sem duplicar nada à mão.
  stack: {
    help: 'bibliotecas e versões (lidas do package.json real)',
    run: () => {
      const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>
      return [
        text(`${Object.keys(pkg.dependencies).length} dependências · ${Object.keys(pkg.devDependencies).length} de desenvolvimento`, 'accent'),
        ...Object.entries(all)
          .filter(([k]) => !k.startsWith('@types/'))
          .map(([k, v]) => row(k, v.replace('^', ''))),
      ]
    },
  },

  neofetch: {
    help: 'informações do seu navegador e da sua máquina',
    run: () => {
      const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { brands?: { brand: string; version: string }[] } }
      const brand = nav.userAgentData?.brands?.filter((b) => !/not.?a.?brand/i.test(b.brand)).map((b) => `${b.brand} ${b.version}`).join(' · ')
      return [
        text('visitante@atlas', 'accent'),
        row('navegador', brand || navigator.userAgent.slice(0, 60)),
        row('idioma', `${navigator.language} · fuso ${Intl.DateTimeFormat().resolvedOptions().timeZone}`),
        row('núcleos', String(navigator.hardwareConcurrency ?? '?')),
        row('memória', nav.deviceMemory ? `≥ ${nav.deviceMemory} GB` : 'oculta pelo navegador'),
        row('tela', `${screen.width}×${screen.height} @${devicePixelRatio}x · janela ${innerWidth}×${innerHeight}`),
        row('tema', matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'),
        row('gpu (WebGL)', gpuName()),
        row('WebGPU', 'gpu' in navigator ? 'disponível' : 'indisponível'),
        row('online', navigator.onLine ? 'sim' : 'não'),
      ]
    },
  },

  theme: {
    help: 'troca a cor do fósforo: green, amber, ice, mono',
    usage: 'theme <cor>',
    run: (args, ctx) =>
      ctx.setTint(args[0] ?? '') ? [text(`tema: ${args[0]}`, 'ok')] : [text(`uso: theme <${Object.keys(TINTS).join('|')}>`, 'error')],
  },

  matrix: {
    help: 'liga/desliga a chuva de caracteres',
    run: (_a, ctx) => [text(ctx.toggleMatrix() ? 'matrix: ligado' : 'matrix: desligado', 'ok')],
  },

  donut: {
    help: 'um toro 3D desenhado só com caracteres',
    run: () => [text('renderizando… (clear remove)', 'dim'), { t: 'donut' }],
  },

  date: {
    help: 'data e hora atuais',
    run: () => [text(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'medium' }).format(new Date()))],
  },

  whoami: { help: 'quem é você?', run: () => [text('visitante — com acesso de leitura a 10 mundos.')] },

  echo: { help: 'repete o texto', usage: 'echo <texto>', run: (args) => [text(args.join(' '))] },

  history: {
    help: 'comandos já digitados',
    run: (_a, ctx) => ctx.history().map((h, i) => row(String(i + 1), h)),
  },

  fortune: { help: 'uma frase para o dia', run: () => [text(QUOTES[Math.floor(Math.random() * QUOTES.length)])] },

  clear: {
    help: 'limpa a tela (Ctrl+L)',
    run: (_a, ctx) => {
      ctx.clear()
      return []
    },
  },

  sudo: { help: 'tente a sorte', run: () => [text('visitante não está no arquivo sudoers. Este incidente será relatado. (brincadeira)', 'error')] },
}

/* ───────────────────────── 3. EXECUTAR ───────────────────────── */
/**
 * Divide a linha em palavras respeitando aspas: `echo "olá mundo"` → ['echo', 'olá mundo'].
 * A regex captura "…", '…' ou qualquer sequência sem espaço.
 */
// @tech Parser de linha de comando com aspas (regex + matchAll)
export function tokenize(line: string): string[] {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3])
}

export async function execute(line: string, ctx: Ctx): Promise<OutLine[]> {
  const [name, ...args] = tokenize(line)
  if (!name) return []
  const cmd = commands[name.toLowerCase()]
  if (!cmd) return [text(`${name}: comando não encontrado. Digite \`help\`.`, 'error')]
  try {
    return await cmd.run(args, ctx)
  } catch (err) {
    return [text(`${name}: ${err instanceof Error ? err.message : String(err)}`, 'error')]
  }
}

/* ───────────────────────── 4. AUTOCOMPLETAR ───────────────────────── */
const PAGE_ARG_COMMANDS = new Set(['open', 'techniques', 'explain'])

/**
 * Retorna `{ value, options }`: `value` é o texto completado (quando há um único candidato ou um
 * prefixo comum) e `options` a lista a exibir quando há ambiguidade.
 */
// @tech Autocompletar por Tab com prefixo comum
export function complete(input: string): { value: string; options: string[] } {
  const endsWithSpace = /\s$/.test(input)
  const parts = tokenize(input)
  const idx = endsWithSpace ? parts.length : parts.length - 1
  const prefix = endsWithSpace ? '' : (parts[idx] ?? '')

  let pool: string[] = []
  if (idx === 0) pool = Object.keys(commands)
  else if (idx === 1 && PAGE_ARG_COMMANDS.has(parts[0]?.toLowerCase())) {
    pool = pages.map((p) => p.id)
    if (parts[0]?.toLowerCase() === 'explain') pool = [...pool, 'shell']
  }
  else if (idx === 1 && parts[0]?.toLowerCase() === 'theme') pool = Object.keys(TINTS)

  const options = pool.filter((c) => c.startsWith(prefix.toLowerCase()))
  if (!options.length) return { value: input, options: [] }

  // prefixo comum entre todos os candidatos
  let common = options[0]
  for (const o of options) while (!o.startsWith(common)) common = common.slice(0, -1)
  const head = parts.slice(0, idx).join(' ')
  const value = `${head ? head + ' ' : ''}${common}${options.length === 1 ? ' ' : ''}`
  return { value, options: options.length > 1 ? options : [] }
}
