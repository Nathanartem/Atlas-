/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  morph.ts — formas-alvo das partículas + shaders do morph (página Orbit)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Divisão de trabalho CPU × GPU
 *   • CPU (UMA vez, `buildTargets`): calcula 4 posições por partícula (esfera, toro, cubo, galáxia) em Float32Arrays
 *   • GPU (todo frame, `particleVertex`): escolhe o par de formas pelo `uMorph` (0–3), interpola com atraso individual
 *     e colore — a CPU só envia UM número (o progresso do scroll)
 *
 * @tech Geração procedural de formas
 * Gera 4 "formas-alvo" para N partículas (esfera → toro → cubo → galáxia).
 * Isso roda UMA vez na CPU; depois toda a animação (interpolação entre formas) acontece no vertex shader.
 *  • esfera: ESPIRAL DE FIBONACCI (ângulo áureo) — distribuição uniforme sem "polos" amontoados; raio com ±7% de espessura
 *  • toro: parametrização (u, v) com raio do tubo variável
 *  • cubo: só a CASCA — escolhe uma das 6 faces e sorteia (a, b) no quadrado
 *  • galáxia: 3 braços em espiral logarítmica; `Math.pow(rnd, 0.65)` concentra partículas no centro; espessura decai com o raio
 * Um PRNG determinístico (mulberry32, semente fixa) garante que a cena seja idêntica a cada carregamento.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const COUNT = 26000

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildTargets(count = COUNT) {
  const rnd = mulberry32(2026)
  const sphere = new Float32Array(count * 3)
  const torus = new Float32Array(count * 3)
  const cube = new Float32Array(count * 3)
  const galaxy = new Float32Array(count * 3)
  const rand = new Float32Array(count)
  const golden = Math.PI * (1 + Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    rand[i] = rnd()

    // 1) esfera (espiral de Fibonacci → distribuição uniforme) com espessura
    const k = i + 0.5
    const phi = Math.acos(1 - (2 * k) / count)
    const theta = golden * k
    const r = 3.1 * (0.93 + rnd() * 0.14)
    sphere[i3] = r * Math.sin(phi) * Math.cos(theta)
    sphere[i3 + 1] = r * Math.cos(phi)
    sphere[i3 + 2] = r * Math.sin(phi) * Math.sin(theta)

    // 2) toro
    const u = rnd() * Math.PI * 2
    const v = rnd() * Math.PI * 2
    const R = 3.4
    const rr = 1.05 * (0.75 + rnd() * 0.5)
    torus[i3] = (R + rr * Math.cos(v)) * Math.cos(u)
    torus[i3 + 1] = rr * Math.sin(v)
    torus[i3 + 2] = (R + rr * Math.cos(v)) * Math.sin(u)

    // 3) casca de um cubo
    const face = Math.floor(rnd() * 6)
    const a = (rnd() * 2 - 1) * 2.8
    const b = (rnd() * 2 - 1) * 2.8
    const s = face % 2 === 0 ? 2.8 : -2.8
    const axis = Math.floor(face / 2)
    cube[i3] = axis === 0 ? s : a
    cube[i3 + 1] = axis === 1 ? s : axis === 0 ? a : b
    cube[i3 + 2] = axis === 2 ? s : b

    // 4) galáxia espiral de 3 braços
    const arm = i % 3
    const rad = Math.pow(rnd(), 0.65) * 7 + 0.4
    const ang = rad * 1.15 + arm * ((Math.PI * 2) / 3) + (rnd() - 0.5) * (1.1 / (rad * 0.35 + 0.6))
    galaxy[i3] = Math.cos(ang) * rad
    galaxy[i3 + 1] = (rnd() - 0.5) * 0.9 * Math.exp(-rad * 0.22)
    galaxy[i3 + 2] = Math.sin(ang) * rad
  }
  return { sphere, torus, cube, galaxy, rand }
}

// @tech Morph entre 4 formas na GPU
// `uMorph` ∈ [0,3]: a parte inteira (`seg`) escolhe o PAR de formas (0: esfera→toro, 1: toro→cubo, 2: cubo→galáxia) e
// a fracionária (`f`) é o progresso dentro do par. Cada partícula tem `aRand` ∈ [0,1] que ATRASA o início da própria
// transição (`smoothstep(aRand·0,42, aRand·0,42 + 0,58, f)`) — por isso o morph vira um enxame fluido e não uma
// interpolação rígida. No meio do caminho (`mid = sin(t·π)`) a partícula "respira" para fora e gira; um ruído senoidal
// leve mantém tudo vivo. Resultado: 26 mil partículas animadas sem a CPU tocar em nenhuma.
export const particleVertex = /* glsl */ `
  uniform float uMorph;
  uniform float uTime;
  uniform float uSize;
  uniform float uPR;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute float aRand;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float m   = clamp(uMorph, 0.0, 2.9999);
    float seg = floor(m);
    float f   = m - seg;

    // cada partícula começa a transição num instante diferente → "enxame" fluido
    float t = smoothstep(aRand * 0.42, aRand * 0.42 + 0.58, f);

    vec3 a = seg < 0.5 ? position : (seg < 1.5 ? aP1 : aP2);
    vec3 b = seg < 0.5 ? aP1      : (seg < 1.5 ? aP2 : aP3);
    vec3 p = mix(a, b, t);

    // durante a viagem as partículas "respiram" para fora e giram
    float mid = sin(t * 3.14159265);
    float ang = mid * (aRand - 0.5) * 3.0;
    p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
    p += normalize(p + 1e-4) * mid * (0.6 + aRand * 1.4);

    // ruído orgânico contínuo
    p += vec3(
      sin(uTime * 0.6 + aRand * 31.0),
      cos(uTime * 0.5 + aRand * 17.0),
      sin(uTime * 0.4 + aRand * 11.0)
    ) * 0.06;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPR * (0.55 + aRand * 0.9) * (6.0 / -mv.z);

    // paleta: ciano → violeta → âmbar, deslocada por posição, sorteio e progresso
    vec3 c1 = vec3(0.25, 0.85, 1.0);
    vec3 c2 = vec3(0.55, 0.32, 1.0);
    vec3 c3 = vec3(1.0, 0.68, 0.30);
    float k = fract(aRand * 0.6 + length(p) * 0.05 + uMorph * 0.18);
    vColor = k < 0.5 ? mix(c1, c2, k * 2.0) : mix(c2, c3, (k - 0.5) * 2.0);
    vAlpha = 0.35 + 0.65 * (1.0 - mid * 0.4);
  }
`

export const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * (0.6 + core * 1.6), core * core * vAlpha);
  }
`
