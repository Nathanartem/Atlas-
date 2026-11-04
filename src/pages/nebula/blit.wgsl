// ═══════════════════════════════════════════════════════════════════════════
//  blit.wgsl — copia a textura de acumulação (HDR) para o canvas
// ═══════════════════════════════════════════════════════════════════════════
//  A textura rgba16float guarda valores > 1.0 (várias partículas somadas). Aqui eles
//  são comprimidos para [0,1] com tone mapping e ganham uma vinheta leve.
// ───────────────────────────────────────────────────────────────────────────

@group(0) @binding(0) var accum : texture_2d<f32>;
@group(0) @binding(1) var samp  : sampler;

struct BlitOut {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
}

@vertex
fn vs_blit(@builtin(vertex_index) vi : u32) -> BlitOut {
  var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let p = pos[vi];
  var o : BlitOut;
  o.position = vec4f(p, 0.0, 1.0);
  o.uv = vec2f(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);   // y invertido: textura cresce para baixo
  return o;
}

// @tech Tone mapping de Reinhard + vinheta no blit
@fragment
fn fs_blit(i : BlitOut) -> @location(0) vec4f {
  var c = textureSample(accum, samp, i.uv).rgb;
  c = c / (1.0 + c);                                   // Reinhard: x / (1 + x)
  c = pow(c, vec3f(0.8));                              // levanta um pouco os meios-tons
  let v = smoothstep(1.25, 0.35, length(i.uv - vec2f(0.5)) * 1.6);
  return vec4f(c * v, 1.0);
}
