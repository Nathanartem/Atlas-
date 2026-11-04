// ═══════════════════════════════════════════════════════════════════════════
//  compute.wgsl — a SIMULAÇÃO roda inteira na GPU (compute shader)
// ═══════════════════════════════════════════════════════════════════════════
//  Cada "invocação" atualiza UMA partícula. O dispatch (engine.ts → frame()) cria
//  ceil(count / 64) grupos de 64 invocações; por isso o `if (i >= count) return`.
//  As partículas vivem num storage buffer que o render shader lê no mesmo frame:
//  nada volta para a CPU. É isso que permite milhões de partículas a 60 fps.
// ───────────────────────────────────────────────────────────────────────────

struct Particle {
  pos : vec2f,   // posição em "clip space": x e y em [-1, 1]
  vel : vec2f,   // velocidade em unidades de clip space por segundo
}

// @tech Uniform buffer com layout explícito
// Regras de alinhamento WGSL: vec2f alinha em 8 bytes, escalares em 4.
// Este struct tem 12 campos de 4 bytes = 48 bytes (múltiplo de 16, exigido pelo uniform).
// A ORDEM dos campos aqui precisa bater com engine.ts → writeParams().
struct Params {
  mouse   : vec2f,  // [0..1]  atrator (ponteiro ou autopilot), em clip space
  dt      : f32,    // [2]     delta de tempo do frame (s)
  time    : f32,    // [3]     tempo total (s) — desloca o campo de ruído
  attract : f32,    // [4]     força de atração ao ponteiro
  curl    : f32,    // [5]     intensidade do campo de fluxo (turbulência)
  drag    : f32,    // [6]     atrito (amortecimento exponencial)
  aspect  : f32,    // [7]     largura/altura — evita que o "círculo" vire elipse
  count   : u32,    // [8]     quantidade de partículas ativas
  pointer : f32,    // [9]     0 = atrai, 1 = ponteiro pressionado (repele)
  swirl   : f32,    // [10]    componente tangencial → faz o vórtice girar
  pad     : f32,    // [11]    preenchimento até 48 bytes
}

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> params : Params;

// ── Ruído de valor 2D (hash + interpolação suave) ──────────────────────────
fn hash21(p : vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

fn vnoise(p : vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);          // smoothstep → derivada contínua
  return mix(
    mix(hash21(i),                    hash21(i + vec2f(1.0, 0.0)), u.x),
    mix(hash21(i + vec2f(0.0, 1.0)),  hash21(i + vec2f(1.0, 1.0)), u.x),
    u.y);
}

// @tech Curl noise (fluxo incompressível)
// O curl de um campo escalar N é v = (∂N/∂y, −∂N/∂x). Esse campo vetorial tem
// divergência zero: as partículas escoam como um fluido e não se aglomeram em
// "poças". As derivadas são estimadas por diferenças finitas (e = 0,01).
fn curl(p : vec2f) -> vec2f {
  let e = 0.01;
  let n1 = vnoise(p + vec2f(0.0,  e));
  let n2 = vnoise(p - vec2f(0.0,  e));
  let n3 = vnoise(p + vec2f(e,  0.0));
  let n4 = vnoise(p - vec2f(e,  0.0));
  return vec2f(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

// @tech Compute shader em WGSL (simulação na GPU)
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let i = gid.x;
  if (i >= params.count) { return; }   // sobra do arredondamento do dispatch

  var p = particles[i];

  // 1) Campo de fluxo: duas oitavas de curl noise que derivam lentamente no tempo
  let t = params.time;
  let flow = curl(p.pos * 1.4 + vec2f(t * 0.04, -t * 0.03))
           + 0.5 * curl(p.pos * 3.1 - vec2f(t * 0.06, 0.0));
  p.vel += flow * params.curl * params.dt;

  // 2) Atração (ou repulsão) pelo ponteiro, com queda 1/r² suavizada por um
  //    epsilon (0.015) para não explodir quando a partícula passa por cima dele.
  let d    = (params.mouse - p.pos) * vec2f(params.aspect, 1.0);
  let r2   = dot(d, d) + 0.015;
  let dir  = d / sqrt(r2);
  let polarity = mix(1.0, -2.5, params.pointer);          // pressionado → repele forte
  let pull = params.attract * polarity * 0.03 / r2;
  p.vel += (dir * pull + vec2f(-dir.y, dir.x) * pull * params.swirl) * params.dt;

  // 3) Integração (Euler semi-implícito) + atrito exponencial independente de FPS
  p.vel *= exp(-params.drag * params.dt);
  p.pos += p.vel * params.dt;

  // 4) Mundo toroidal: sair por um lado = entrar pelo oposto
  p.pos = fract(p.pos * 0.5 + 0.5) * 2.0 - 1.0;

  particles[i] = p;
}
