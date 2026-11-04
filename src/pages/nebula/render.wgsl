// ═══════════════════════════════════════════════════════════════════════════
//  render.wgsl — desenha as partículas e aplica o "fade" dos rastros
// ═══════════════════════════════════════════════════════════════════════════
//  Dois pipelines usam este módulo (cada um com um entry point de vértice e de fragmento):
//    • vs_particle + fs_particle → um quadrado por partícula (instancing), blend ADITIVO
//    • vs_fade     + fs_fade     → um triângulo gigante preto semi-transparente que
//                                  escurece o frame anterior (cria os rastros)
//  Tudo é desenhado numa textura intermediária (rgba16float); blit.wgsl a apresenta.
// ───────────────────────────────────────────────────────────────────────────

struct Particle {
  pos : vec2f,
  vel : vec2f,
}

struct RenderParams {
  aspect : f32,   // largura/altura
  size   : f32,   // meia-aresta do quadrado, em unidades de clip space (eixo y)
  fade   : f32,   // opacidade do preto aplicado a cada frame (0.02 = rastro longo)
  gain   : f32,   // brilho de cada partícula (compensa tamanho e rastro)
}

// Storage buffer em modo "read": o vertex shader só LÊ o que o compute escreveu.
@group(0) @binding(0) var<storage, read> particles : array<Particle>;
@group(0) @binding(1) var<uniform> rp : RenderParams;

struct ParticleOut {
  @builtin(position) position : vec4f,
  @location(0) uv    : vec2f,    // [-1,1] dentro do quadrado — para desenhar o disco suave
  @location(1) speed : f32,      // |velocidade| → cor
}

// @tech Instancing sem vertex buffer
// Não existe vertex buffer: cada INSTÂNCIA é uma partícula (instance_index lê o
// storage buffer) e cada VÉRTICE é um canto do quadrado (vertex_index 0..3 num
// triangle-strip). `draw(4, count)` em engine.ts dispara tudo de uma vez.
@vertex
fn vs_particle(@builtin(vertex_index) vi : u32,
               @builtin(instance_index) ii : u32) -> ParticleOut {
  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(1.0, 1.0));
  let c = corners[vi];
  let p = particles[ii];

  var o : ParticleOut;
  o.position = vec4f(p.pos + c * vec2f(rp.size / rp.aspect, rp.size), 0.0, 1.0);
  o.uv = c;
  o.speed = length(p.vel);
  return o;
}

@fragment
fn fs_particle(i : ParticleOut) -> @location(0) vec4f {
  let d = length(i.uv);
  if (d > 1.0) { discard; }                 // recorta o quadrado num disco
  let a = pow(1.0 - d, 2.0);                // borda suave (queda quadrática)

  // Cor pela velocidade: azul frio (lento) → laranja quente (rápido) + brilho branco
  let t = clamp(i.speed * 1.6, 0.0, 1.0);
  let cold = vec3f(0.25, 0.45, 1.0);
  let hot  = vec3f(1.00, 0.45, 0.20);
  let col  = mix(cold, hot, t) + vec3f(0.35 * t);
  return vec4f(col * a * rp.gain, a * rp.gain);
}

// ── Passo de "fade": um triângulo que cobre a tela inteira ───────────────────
// Truque do triângulo gigante: 3 vértices em (-1,-1), (3,-1), (-1,3) cobrem o
// retângulo [-1,1]² inteiro sem a diagonal de um quad (e sem buffers).
@vertex
fn vs_fade(@builtin(vertex_index) vi : u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(pos[vi], 0.0, 1.0);
}

@fragment
fn fs_fade() -> @location(0) vec4f {
  // Com blend "src-alpha / one-minus-src-alpha" isto vira: novo = antigo × (1 − fade)
  return vec4f(0.0, 0.0, 0.0, rp.fade);
}
