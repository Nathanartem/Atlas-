import type { Technique } from '../data/techniques.ts'

/**
 * Estado mínimo do holofote (módulo, sem Context): o TechPanel dispara, o Spotlight escuta.
 * `useSyncExternalStore` no componente garante um único assinante React e funciona com StrictMode.
 */
export interface SpotlightRequest {
  technique: Technique
  accent: string
  /** "07" na página, "S3" na casca */
  n: string
  kind: 'page' | 'shell'
}

let current: SpotlightRequest | null = null
const listeners = new Set<() => void>()

const emit = () => {
  for (const fn of listeners) fn()
}

export function showSpotlight(req: SpotlightRequest) {
  current = req
  emit()
}

export function hideSpotlight() {
  if (!current) return
  current = null
  emit()
}

export const getSpotlight = () => current

export function subscribeSpotlight(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function findSpot(spot: string): Element | null {
  const named = document.querySelector(`[data-spot="${CSS.escape(spot)}"]`)
  if (named) return named
  return document.querySelector('[data-spot-page]')
}

/**
 * Legenda do que o aluno está vendo. Uma frase por `data-spot` — várias técnicas
 * podem dividir o mesmo bloco; o cartão diferencia o "como" pelo texto da técnica.
 */
const LOOK: Record<string, string> = {
  'shell-page': 'Não há um pedaço isolado: o contorno envolve a página inteira, porque a técnica está na estrutura.',
  'shell-dock': 'A barra de navegação fixa no rodapé — os ícones das 10 páginas.',
  'shell-cursor': 'O anel que segue o ponteiro. Mexa o mouse: o contorno acompanha.',
  'shell-tech': 'O botão “{ } Técnicas” no canto superior direito.',

  'lumen-shader': 'O canvas do shader, atrás do título. É o fundo inteiro desta dobra.',
  'lumen-title': 'A palavra “ATLAS”.',
  'lumen-sub': 'O parágrafo logo abaixo do título.',
  'lumen-cta': 'Os dois botões do hero — o sólido é magnético.',
  'lumen-hero': 'A primeira dobra inteira: shader, título e botões se movem juntos no scroll.',
  'lumen-marquee': 'A faixa de texto que corre na horizontal.',
  'lumen-numbers': 'Os quatro contadores (páginas, técnicas, imagens, chunks).',
  'lumen-worlds': 'A grade de cartões, um por página.',
  'lumen-stack': 'Os cartões que grudam e se empilham ao rolar.',
  'lumen-page': 'A página Lumen por inteiro — esta técnica vive no CSS, não num bloco só.',

  'prisma-page': 'A página Prisma por inteiro — a técnica está no CSS global da página.',
  'prisma-progress': 'A barra fininha no topo: ela cresce com o scroll, sem JavaScript.',
  'prisma-head': 'O cabeçalho. Role a página: a aparência muda quando ele gruda.',
  'prisma-theme': 'O botão sol/lua que troca o tema.',
  'prisma-hero': 'O hero: blobs, título e os três cartões que sobem em velocidades diferentes.',
  'prisma-reveal': 'A grade de cartões que entram conforme chegam na tela.',
  'prisma-cq': 'A caixa com alça de redimensionar. Arraste o canto e o cartão muda de layout.',
  'prisma-has': 'Os planos, a grade e o formulário — o pai reage ao que o filho faz.',
  'prisma-anchor': 'Os botões de tooltip, o menu e o acordeão.',
  'prisma-cube': 'A cena do cubo, do anel e das legendas, conduzida pelo scroll.',
  'prisma-carousel': 'O carrossel horizontal, com os slides e os marcadores.',

  'tipo-prox': 'A palavra “Letra”. Passe o cursor: cada caractere muda de eixo.',
  'tipo-page': 'A revista por inteiro — o grão e o cleanup valem para a página toda.',
  'tipo-progress': 'A linha de leitura no topo, que enche conforme você rola.',
  'tipo-badge': 'O selo circular ao lado do texto do hero.',
  'tipo-manifesto': 'O parágrafo do manifesto, com as marcas de texto.',
  'tipo-hscroll': 'A faixa “Cinco vozes”: o scroll vertical vira movimento lateral.',
  'tipo-quote': 'A citação e o traço vermelho com a caneta.',
  'tipo-index': 'A lista de matérias, os filtros e o botão grade/lista.',
  'tipo-poster': 'O cartaz “ESCREVA COM FORMA”. Mova o mouse para abrir a lente.',
  'tipo-foot': 'A faixa do rodapé que corre e reage à velocidade do scroll.',

  'pulse-page': 'O dashboard por inteiro. O esqueleto aparece aqui enquanto os dados não chegam.',
  'pulse-header': 'O topo: nome Pulse, status ao vivo e o título da aba.',
  'pulse-cmd': 'O campo “Buscar comandos…”. Ctrl+K abre a paleta.',
  'pulse-kpis': 'Os quatro cartões de métrica, com número e sparkline.',
  'pulse-chart': 'O gráfico de tráfego ao vivo.',
  'pulse-donut': 'O donut de status HTTP.',
  'pulse-heatmap': 'O mapa de calor por dia e hora.',
  'pulse-incidents': 'A lista de incidentes: dá para arrastar e criar um novo.',
  'pulse-table': 'A tabela de eventos. Só algumas linhas existem no DOM.',

  'gravity-page': 'A página Gravity por inteiro — o visual neo-brutalista está nas classes.',
  'gravity-play': 'O playground do hero. Arraste as palavras e clique no vazio.',
  'gravity-scope': 'O osciloscópio branco, acima dos pads.',
  'gravity-pads': 'Os oito pads coloridos. Toque ou use Q W E R / A S D F.',
  'gravity-stickers': 'Os adesivos no quadro rosa. Arraste e solte para ver a inércia.',
  'gravity-holo': 'A carta escura. Mova o mouse em cima dela.',

  'orbit-page': 'A coluna de capítulos que rola por cima da cena 3D.',
  'orbit-canvas': 'A cena 3D fixa no fundo — joia, partículas e câmera.',
  'orbit-hud': 'A lista de capítulos na lateral esquerda.',
  'orbit-readout': 'Os números à direita: scroll, uMorph e pontos.',
  'orbit-card': 'O cartão de vidro do primeiro capítulo, por cima do canvas.',

  'nebula-page': 'A página Nebula por inteiro — o CSS usa @scope para não vazar.',
  'nebula-canvas': 'O canvas fixo no fundo, onde as partículas são desenhadas.',
  'nebula-hero': 'O texto e os controles por cima da simulação.',
  'nebula-pipe': 'Os quatro passos “semear → simular → desenhar → apresentar”.',
  'nebula-code': 'O visualizador dos arquivos .wgsl.',
  'nebula-gpu': 'A ficha com o nome da GPU, limites e features.',

  'mundi-page': 'A página Mundi por inteiro, com a textura de papel no fundo.',
  'mundi-globe': 'O globo. Arraste para girar e clique numa cidade.',
  'mundi-clock': 'O cartão ao lado do globo, com o horário da cidade.',
  'mundi-lab': 'O mapa plano: projeções, Tissot, cor e zoom.',
  'mundi-rank': 'As barras das doze maiores metrópoles.',

  'term-page': 'A página do terminal por inteiro.',
  'term-crt': 'A moldura do monitor — vidro, scanlines e o botão de ligar.',
  'term-out': 'O texto verde dentro da tela.',
  'term-form': 'A linha de comando, onde o cursor pisca.',
  'term-chips': 'Os atalhos abaixo do texto: help, ls, donut…',

  'nat-page': 'A ficha técnica por inteiro.',
  'nat-matrix': 'A matriz de suporte no topo, com um ponto por API.',
  'nat-grid': 'A grade de laboratórios. Os cartões alinham título e corpo entre si.',
  'nat-fig-01': 'O laboratório FIG. 01 — contagem de caracteres.',
  'nat-fig-02': 'O laboratório FIG. 02 — nomes de países e moedas.',
  'nat-fig-03': 'O laboratório FIG. 03 — datas relativas, listas e ordenação.',
  'nat-fig-04': 'O laboratório FIG. 04 — datas com fuso.',
  'nat-fig-05': 'O laboratório FIG. 05 — hash e criptografia.',
  'nat-fig-06': 'O laboratório FIG. 06 — compressão.',
  'nat-fig-07': 'O laboratório FIG. 07 — padrão de URL.',
  'nat-fig-08': 'O laboratório FIG. 08 — conta-gotas e área de transferência.',
  'nat-fig-09': 'O laboratório FIG. 09 — conversa entre abas. Abra outra aba para ver.',
  'nat-fig-10': 'O laboratório FIG. 10 — tarefa pesada fatiada.',
  'nat-fig-11': 'O laboratório FIG. 11 — tela acesa, vibração e compartilhar.',
  'nat-fig-12': 'O laboratório FIG. 12 — arquivo privado no navegador.',
  'nat-fig-13': 'O laboratório FIG. 13 — Core Web Vitals desta página.',
  'nat-fig-14': 'O laboratório FIG. 14 — preferências do sistema e a caixa redimensionável.',
}

/** Frase “o que está contornado”, em português. */
export function spotLook(spot: string): string {
  return LOOK[spot] ?? 'O bloco contornado nesta página.'
}
