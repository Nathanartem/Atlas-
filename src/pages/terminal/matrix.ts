/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  matrix.ts — chuva de caracteres em <canvas> (efeito "matrix")
 * ═══════════════════════════════════════════════════════════════════════════
 *  Cada coluna tem uma "cabeça" que cai. A cada frame:
 *   1. pinta um retângulo preto translúcido por cima (os caracteres antigos esmaecem = rastro)
 *   2. desenha o caractere novo na cabeça (branco) e o anterior em verde
 *   3. quando a cabeça passa do fundo, reinicia aleatoriamente (assim as colunas dessincronizam)
 *  Retorna `stop()` para cancelar o rAF e remover o listener de resize.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉ0123456789ABCDEF<>/{}[]=+-*'

// @tech Chuva de caracteres em canvas com rastro por fade
export function startMatrix(canvas: HTMLCanvasElement, color: string): () => void {
  const g = canvas.getContext('2d')!
  const size = 16
  let cols = 0
  let heads: number[] = []
  let raf = 0
  let last = 0

  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 1.5)
    canvas.width = Math.round(canvas.clientWidth * dpr)
    canvas.height = Math.round(canvas.clientHeight * dpr)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    cols = Math.ceil(canvas.clientWidth / size)
    heads = Array.from({ length: cols }, () => Math.random() * -40)
    g.fillStyle = '#000'
    g.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
  }
  resize()
  addEventListener('resize', resize)

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    if (now - last < 55) return // ~18 passos/s: ritmo clássico, e barato
    last = now
    const h = canvas.clientHeight
    g.fillStyle = 'rgba(0,0,0,0.09)'
    g.fillRect(0, 0, canvas.clientWidth, h)
    g.font = `${size}px "JetBrains Mono Variable", monospace`
    for (let i = 0; i < cols; i++) {
      const y = heads[i] * size
      const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0]
      g.fillStyle = '#e8fff0'
      g.fillText(ch, i * size, y)
      g.fillStyle = color
      g.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * size, y - size)
      heads[i] = y > h && Math.random() > 0.975 ? 0 : heads[i] + 1
    }
  }
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    removeEventListener('resize', resize)
  }
}
