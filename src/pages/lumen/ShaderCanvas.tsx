import { useEffect, useRef } from 'react'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ShaderCanvas.tsx — WebGL2 "pelado" (sem Three.js) para o fundo do hero
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech WebGL2 puro (sem biblioteca)
 * Em ~100 linhas de JS: compila vertex + fragment shader, linka o programa, pega as localizações dos
 * uniforms e desenha UM triângulo por frame. Nada de Three.js, buffers ou atributos.
 *
 * Mapa do arquivo
 *   VERT ............ vertex shader (gera o triângulo que cobre a tela)
 *   FRAG ............ fragment shader (domain warping de FBM + lente do mouse + vinheta + grão)
 *   ShaderCanvas() .. componente React: cria o canvas, compila, anima, pausa e limpa
 *
 *  • Resolução dinâmica: mede o tempo de frame e ajusta a escala do canvas para manter ~60fps
 *  • Pausa quando fora da tela ou aba oculta (IntersectionObserver + visibilitychange)
 *  • `uTime`, `uMouse`, `uVel`, `uRes` são os únicos dados enviados à GPU por frame
 * ═══════════════════════════════════════════════════════════════════════════
 */

// @tech Triângulo full-screen via gl_VertexID
// Truque clássico: em vez de um quad (2 triângulos + buffer), um ÚNICO triângulo maior que a tela.
// `gl_VertexID` vale 0,1,2 → (x,y) = (0,0), (2,0), (0,2) após `(id<<1)&2` e `id&2`; ×2−1 leva a (-1,-1),(3,-1),(-1,3).
// A parte visível [-1,1]² é coberta inteira e não há diagonal (sem desperdício). `drawArrays(TRIANGLES,0,3)`
// não precisa de nenhum buffer nem atributo.
const VERT = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

// @tech Domain warping com FBM
// FBM = soma de várias oitavas de ruído (cada uma com metade da amplitude e frequência girada/maior).
// "Domain warping" = usar o FBM para DEFORMAR as coordenadas do próprio FBM: q = fbm(p), r = fbm(p + 4q),
// f = fbm(p + 4r). As dobras de fluido orgânico nascem dessa composição. As cores (c0..c3) são misturadas
// por `smoothstep` sobre f, |q| e |r|. Custo: ~15 chamadas de fbm por pixel — por isso a resolução é dinâmica.
const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // 0..1
uniform float uVel;     // velocidade suavizada do mouse
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p  = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 m  = (uMouse * uRes - 0.5 * uRes) / uRes.y;

  // @tech Lente que segue o mouse
  // lente: o espaço "estufa" perto do cursor, mais forte quanto mais rápido o mouse
  float d = length(p - m);
  p += (p - m) * exp(-d * 5.0) * (0.12 + uVel * 0.6);

  float t = uTime * 0.07;
  vec2 q = vec2(fbm(p * 2.0 + t), fbm(p * 2.0 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 2.0 + 4.0 * q + vec2(1.7, 9.2) + t * 1.5),
                fbm(p * 2.0 + 4.0 * q + vec2(8.3, 2.8) - t * 1.2));
  float f = fbm(p * 2.0 + 4.0 * r);

  vec3 c0 = vec3(0.020, 0.018, 0.050);
  vec3 c1 = vec3(0.340, 0.110, 0.920);
  vec3 c2 = vec3(0.000, 0.820, 0.780);
  vec3 c3 = vec3(1.000, 0.300, 0.560);

  vec3 col = mix(c0, c1, smoothstep(0.15, 0.75, f));
  col = mix(col, c2, smoothstep(0.55, 1.00, length(q)) * 0.75);
  col = mix(col, c3, smoothstep(0.70, 1.20, length(r)) * 0.60);
  col += pow(max(0.0, 1.0 - d * 2.2), 3.0) * vec3(0.45, 0.65, 1.0) * 0.35;

  // vinheta + grão fixo. Sem uTime aqui: grão novo a cada frame faz a página inteira piscar,
  // sobretudo com mix-blend-mode: difference no título.
  col *= smoothstep(1.45, 0.25, length(uv - 0.5) * 1.5);
  col += (hash(gl_FragCoord.xy) - 0.5) * 0.018;
  outColor = vec4(col, 1.0);
}`

export function ShaderCanvas({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = host.current
    if (!container) return
    let cleanup = () => {}
    // O StrictMode dispara o efeito e o cleanup antes do próximo frame. Criar o canvas só no rAF
    // faz a primeira passagem ser cancelada: um único canvas, sem piscar ao entrar na página.
    const id = requestAnimationFrame(() => {
      cleanup = mount(container)
    })
    return () => {
      cancelAnimationFrame(id)
      cleanup()
    }

    function mount(container: HTMLDivElement) {
    // @tech Canvas criado no efeito (StrictMode-safe)
    // O <canvas> é criado aqui (e não no JSX) porque o StrictMode monta/desmonta/monta o efeito:
    // reaproveitar o mesmo elemento devolveria um contexto WebGL já "perdido" por loseContext().
    // Cada montagem cria um canvas NOVO e o cleanup o remove — nenhum contexto fica órfão.
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%'
    container.append(canvas)

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    if (!gl) {
      container.dataset.fallback = 'true'
      return () => canvas.remove()
    }

    let program: WebGLProgram
    try {
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error')
        return s
      }
      program = gl.createProgram()!
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link error')
    } catch (err) {
      console.warn('[ShaderCanvas]', err)
      container.dataset.fallback = 'true'
      return () => canvas.remove()
    }
    gl.useProgram(program)

    const uRes = gl.getUniformLocation(program, 'uRes')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uMouse = gl.getUniformLocation(program, 'uMouse')
    const uVel = gl.getUniformLocation(program, 'uVel')

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const maxScale = Math.min(devicePixelRatio, 1.5)
    let scale = Math.min(maxScale, 0.8)
    let cssW = 1
    let cssH = 1

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      cssW = r.width
      cssH = r.height
      canvas.width = Math.max(2, Math.round(cssW * scale))
      canvas.height = Math.max(2, Math.round(cssH * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    // mouse (alvo) → suavizado
    const target = { x: 0.5, y: 0.5 }
    const mouse = { x: 0.5, y: 0.5 }
    let vel = 0
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      target.x = (e.clientX - r.left) / r.width
      target.y = 1 - (e.clientY - r.top) / r.height
    }
    addEventListener('pointermove', onMove, { passive: true })

    let raf = 0
    let running = false
    let visible = true
    let last = performance.now()
    let acc = 0
    let frames = 0
    let time = 0

    const frame = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      if (!reduced) time += dt / 1000

      const px = mouse.x
      const py = mouse.y
      mouse.x += (target.x - mouse.x) * 0.08
      mouse.y += (target.y - mouse.y) * 0.08
      vel += (Math.min(Math.hypot(mouse.x - px, mouse.y - py) * 30, 1.5) - vel) * 0.1

      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.uniform1f(uVel, vel)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // @tech Resolução dinâmica
      // resolução dinâmica: a cada 30 frames avalia o custo médio. Frame médio > 22 ms → reduz a escala do canvas
      // em 15%; < 15 ms → sobe 6% (até 1,5× ou o DPR). O CSS estica o canvas para a tela, então o usuário só
      // percebe um pouco menos de nitidez — nunca engasgos.
      acc += dt
      if (++frames === 30) {
        const avg = acc / frames
        const next = avg > 22 ? scale * 0.85 : avg < 15 ? scale * 1.06 : scale
        const clamped = Math.min(maxScale, Math.max(0.35, next))
        if (Math.abs(clamped - scale) > 0.02) {
          scale = clamped
          resize()
        }
        acc = 0
        frames = 0
      }
      if (running) raf = requestAnimationFrame(frame)
    }

    // @tech Pausa inteligente do render loop
    // O loop só roda se o canvas está VISÍVEL (IntersectionObserver) E a aba está ativa (`document.hidden`).
    // `start`/`stop` são idempotentes e `sync` decide; com `prefers-reduced-motion` desenha um único quadro.
    const start = () => {
      if (running || reduced) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    const sync = () => (visible && !document.hidden ? start() : stop())

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(canvas)
    document.addEventListener('visibilitychange', sync)

    if (reduced) frame(performance.now())
    else start()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
      removeEventListener('pointermove', onMove)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
    }
  }, [])

  return <div ref={host} className={className} aria-hidden="true" />
}
