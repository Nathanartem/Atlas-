/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  donut.ts — um toro 3D renderizado em ASCII (matemática pura, sem canvas)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Ideia (clássico "donut.c" de Andy Sloane, reescrito e comentado):
 *   1. Um toro é um círculo (raio R1) girado em torno de um eixo à distância R2.
 *      Pontos: ângulo `theta` percorre o círculo pequeno, `phi` percorre o anel.
 *   2. Cada ponto é rotacionado nos eixos X (ângulo A) e Z (ângulo B).
 *   3. Projeção em perspectiva: x' = x·K/(K+z). Guardamos 1/z ("ooz") num z-buffer:
 *      só o ponto MAIS PERTO de cada célula da tela sobrevive.
 *   4. Luminância = produto escalar da NORMAL da superfície com uma luz fixa. Ela escolhe
 *      o caractere da rampa `.,-~:;=!*#$@` (do mais escuro ao mais claro).
 * ═══════════════════════════════════════════════════════════════════════════
 */
const RAMP = '.,-~:;=!*#$@'
const R1 = 1 // raio do "tubo"
const R2 = 2 // distância do centro do donut ao centro do tubo
const K2 = 5 // distância da câmera

/**
 * Devolve o quadro como array de linhas de texto (`cols × rows` caracteres).
 * @tech Toro 3D em ASCII (z-buffer + iluminação)
 * Pontos do toro → rotação (A em X, B em Z) → perspectiva → z-buffer por célula → rampa de caracteres.
 */
export function renderDonut(A: number, B: number, cols = 64, rows = 26): string[] {
  const buf = new Array<string>(cols * rows).fill(' ')
  const zbuf = new Float32Array(cols * rows) // guarda 1/z; 0 = vazio

  // Escala para o toro preencher ~70% da altura (caracteres são ~2× mais altos que largos)
  const K1 = (rows * K2 * 3) / (8 * (R1 + R2))
  const cosA = Math.cos(A)
  const sinA = Math.sin(A)
  const cosB = Math.cos(B)
  const sinB = Math.sin(B)

  for (let theta = 0; theta < 6.283; theta += 0.07) {
    const cosT = Math.cos(theta)
    const sinT = Math.sin(theta)
    for (let phi = 0; phi < 6.283; phi += 0.02) {
      const cosP = Math.cos(phi)
      const sinP = Math.sin(phi)

      // ponto no círculo do tubo, antes de girar em torno do eixo do donut
      const cx = R2 + R1 * cosT
      const cy = R1 * sinT

      // rotações em X (A) e Z (B) combinadas
      const x = cx * (cosB * cosP + sinA * sinB * sinP) - cy * cosA * sinB
      const y = cx * (sinB * cosP - sinA * cosB * sinP) + cy * cosA * cosB
      const z = K2 + cosA * cx * sinP + cy * sinA
      const ooz = 1 / z

      // projeção em perspectiva → coordenadas da grade (x dobrado: células são "altas")
      const xp = Math.trunc(cols / 2 + K1 * ooz * x * 2)
      const yp = Math.trunc(rows / 2 - K1 * ooz * y)
      if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue

      // luminância: normal · luz (luz vinda de cima e de trás, normalizada na constante 8)
      const L = cosP * cosT * sinB - cosA * cosT * sinP - sinA * sinT + cosB * (cosA * sinT - cosT * sinA * sinP)
      if (L <= 0) continue

      const idx = xp + yp * cols
      if (ooz > zbuf[idx]) {
        zbuf[idx] = ooz
        buf[idx] = RAMP[Math.min(RAMP.length - 1, Math.trunc(L * 8))]
      }
    }
  }

  const out: string[] = []
  for (let r = 0; r < rows; r++) out.push(buf.slice(r * cols, (r + 1) * cols).join(''))
  return out
}
