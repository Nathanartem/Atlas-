/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  engine.ts — motor WebGPU da página Nebula (TypeScript puro, sem React)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Fluxo de cada frame (função `frame`):
 *
 *    ┌─ compute pass ────────────────┐   ┌─ render pass → textura "accum" ──────┐   ┌─ blit pass → canvas ─┐
 *    │ compute.wgsl                  │   │ 1. fade (escurece o frame anterior)   │   │ blit.wgsl            │
 *    │ lê/escreve `particleBuf`      │ → │ 2. partículas (instanced, aditivo)    │ → │ tone mapping+vinheta │
 *    └───────────────────────────────┘   └───────────────────────────────────────┘   └──────────────────────┘
 *
 *  O que vive onde:
 *   • `createWebGPUEngine()`  → pede adapter/device, compila shaders, monta pipelines e o loop
 *   • `NebulaEngine`          → contrato usado pela UI (React) — igual para WebGPU e para o fallback 2D
 *   • `shaderSources`         → os mesmos textos .wgsl que a página exibe no visualizador de código
 * ═══════════════════════════════════════════════════════════════════════════
 */
// @tech Shaders importados com ?raw (Vite)
// O sufixo `?raw` faz o Vite entregar o arquivo como string. Assim os shaders são arquivos
// .wgsl de verdade (com realce no editor) e o MESMO texto alimenta a GPU e o visualizador de código.
import blitSrc from './blit.wgsl?raw'
import computeSrc from './compute.wgsl?raw'
import renderSrc from './render.wgsl?raw'

export const shaderSources = { compute: computeSrc, render: renderSrc, blit: blitSrc } as const

/** Parâmetros ajustáveis pela UI (lidos a cada frame, então mudar não recria nada). */
export interface NebulaParams {
  attract: number
  curl: number
  drag: number
  fade: number
}

/** Estado do ponteiro — escrito pelos listeners do motor, lido pelo autopilot/sim. */
export interface PointerState {
  x: number
  y: number
  down: boolean
  lastMove: number
}

export interface GpuInfo {
  description: string
  features: string[]
  limits: Record<string, number>
}

export interface NebulaEngine {
  kind: 'webgpu' | 'canvas2d'
  params: NebulaParams
  stats: { fps: number; count: number }
  gpu: GpuInfo | null
  setCount(n: number): void
  dispose(): void
  /** Chamado se o device for perdido (driver reset, GPU removida…) → a UI troca para o fallback. */
  onLost?: (reason: string) => void
}

const WORKGROUP = 64 // precisa bater com @workgroup_size(64) em compute.wgsl
const ACCUM_FORMAT: GPUTextureFormat = 'rgba16float' // HDR: aguenta somas > 1.0 sem "banding" no fade

/** Limites que vale mostrar na UI (os demais são ruído para o leitor). */
const SHOWN_LIMITS = [
  'maxComputeWorkgroupSizeX',
  'maxComputeInvocationsPerWorkgroup',
  'maxStorageBufferBindingSize',
  'maxBufferSize',
  'maxTextureDimension2D',
] as const

export async function createWebGPUEngine(
  host: HTMLElement,
  initialCount: number,
  params: NebulaParams,
): Promise<NebulaEngine | null> {
  // ── 1. Existe WebGPU? ────────────────────────────────────────────────────
  // @tech WebGPU: adapter, device e contexto de canvas
  // `navigator.gpu` só existe em navegadores com WebGPU. O adapter representa a GPU física
  // (pode vir null em máquinas sem driver compatível); o device é a conexão lógica que cria recursos.
  if (!('gpu' in navigator)) return null
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
  if (!adapter) return null
  const device = await adapter.requestDevice()

  const canvas = document.createElement('canvas')
  canvas.className = 'nebula-canvas'
  const context = canvas.getContext('webgpu')
  if (!context) {
    device.destroy()
    return null
  }
  host.append(canvas)

  // Tudo abaixo pode falhar (shader inválido, limite excedido). Se falhar, limpamos e deixamos
  // o erro subir: a UI mostra o motivo e usa o fallback Canvas 2D.
  const cleanupOnError = (err: unknown): never => {
    canvas.remove()
    device.destroy()
    throw err
  }

  try {
    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({ device, format, alphaMode: 'opaque' })

    device.addEventListener('uncapturederror', (e) => {
      console.warn('[Nebula/WebGPU]', (e as GPUUncapturedErrorEvent).error.message)
    })

    // ── 2. Shaders: compila e VALIDA ───────────────────────────────────────
    // @tech Validação de shader com getCompilationInfo + fallback
    // createShaderModule nunca lança: erros de WGSL aparecem em getCompilationInfo(). Conferimos
    // antes de montar pipelines para dar uma mensagem útil (linha:coluna) e cair no fallback 2D.
    const compile = async (code: string, label: string) => {
      const module = device.createShaderModule({ code, label })
      const info = await module.getCompilationInfo()
      const err = info.messages.find((m) => m.type === 'error')
      if (err) throw new Error(`${label}.wgsl ${err.lineNum}:${err.linePos} — ${err.message}`)
      return module
    }
    const [computeModule, renderModule, blitModule] = await Promise.all([
      compile(computeSrc, 'compute'),
      compile(renderSrc, 'render'),
      compile(blitSrc, 'blit'),
    ])

    // ── 3. Buffers de uniforms ─────────────────────────────────────────────
    const paramsBuf = device.createBuffer({
      label: 'sim params',
      size: 48, // 12 × 4 bytes — ver struct Params em compute.wgsl
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    const rpBuf = device.createBuffer({
      label: 'render params',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    // Float32Array e Uint32Array compartilham o MESMO ArrayBuffer: o campo `count` é u32 no WGSL.
    const paramsF32 = new Float32Array(12)
    const paramsU32 = new Uint32Array(paramsF32.buffer)
    const rpF32 = new Float32Array(4)

    // ── 4. Pipelines ───────────────────────────────────────────────────────
    // `layout: 'auto'` deixa o WebGPU deduzir os bind group layouts a partir do WGSL; depois
    // pegamos cada layout com pipeline.getBindGroupLayout(0).
    const computePipeline = device.createComputePipeline({
      label: 'sim',
      layout: 'auto',
      compute: { module: computeModule, entryPoint: 'main' },
    })

    // @tech Blending aditivo
    // Fator "one + one": a cor da partícula é SOMADA ao que já está na textura. Onde há muitas
    // partículas sobrepostas a soma passa de 1.0 (por isso a textura é HDR e há tone mapping).
    const additive: GPUBlendState = {
      color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
    }
    const particlePipeline = device.createRenderPipeline({
      label: 'particles',
      layout: 'auto',
      vertex: { module: renderModule, entryPoint: 'vs_particle' },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_particle',
        targets: [{ format: ACCUM_FORMAT, blend: additive }],
      },
      primitive: { topology: 'triangle-strip' }, // 4 vértices = 1 quadrado
    })
    const fadePipeline = device.createRenderPipeline({
      label: 'fade',
      layout: 'auto',
      vertex: { module: renderModule, entryPoint: 'vs_fade' },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_fade',
        targets: [
          {
            format: ACCUM_FORMAT,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            },
          },
        ],
      },
    })
    const blitPipeline = device.createRenderPipeline({
      label: 'blit',
      layout: 'auto',
      vertex: { module: blitModule, entryPoint: 'vs_blit' },
      fragment: { module: blitModule, entryPoint: 'fs_blit', targets: [{ format }] },
    })
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' })

    // O fade só usa o binding 1 (uniform) — o layout "auto" reflete isso, então o bind group também.
    const fadeBG = device.createBindGroup({
      layout: fadePipeline.getBindGroupLayout(0),
      entries: [{ binding: 1, resource: { buffer: rpBuf } }],
    })

    // ── 5. Recursos que mudam: partículas (setCount) e textura (resize) ────
    let count = 0
    let particleBuf: GPUBuffer | null = null
    let computeBG!: GPUBindGroup
    let particleBG!: GPUBindGroup

    // @tech Storage buffer compartilhado entre compute e render
    // UM buffer (STORAGE) é escrito pelo compute shader e lido pelo vertex shader no mesmo frame.
    // A CPU só o preenche uma vez (posições aleatórias); depois a simulação vive na GPU.
    const buildParticles = (n: number) => {
      particleBuf?.destroy()
      count = n
      const data = new Float32Array(n * 4) // [x, y, vx, vy] × n — velocidades começam em 0
      for (let i = 0; i < n; i++) {
        data[i * 4] = Math.random() * 2 - 1
        data[i * 4 + 1] = Math.random() * 2 - 1
      }
      particleBuf = device.createBuffer({
        label: `particles ×${n}`,
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })
      device.queue.writeBuffer(particleBuf, 0, data)
      computeBG = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: particleBuf } },
          { binding: 1, resource: { buffer: paramsBuf } },
        ],
      })
      particleBG = device.createBindGroup({
        layout: particlePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: particleBuf } },
          { binding: 1, resource: { buffer: rpBuf } },
        ],
      })
      engine.stats.count = n
    }

    let accum: GPUTexture | null = null
    let accumView!: GPUTextureView
    let blitBG!: GPUBindGroup

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2)
      let w = Math.max(2, Math.round(canvas.clientWidth * dpr))
      let h = Math.max(2, Math.round(canvas.clientHeight * dpr))
      // Limite de ~4 megapixels: em telas 4K o custo de fill-rate das partículas dobraria à toa.
      const maxPx = 4_200_000
      if (w * h > maxPx) {
        const k = Math.sqrt(maxPx / (w * h))
        w = Math.round(w * k)
        h = Math.round(h * k)
      }
      if (accum && w === canvas.width && h === canvas.height) return
      canvas.width = w
      canvas.height = h
      accum?.destroy()
      accum = device.createTexture({
        label: 'accum',
        size: [w, h],
        format: ACCUM_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      })
      accumView = accum.createView()
      blitBG = device.createBindGroup({
        layout: blitPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: accumView },
          { binding: 1, resource: sampler },
        ],
      })
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // ── 6. Ponteiro + autopilot ────────────────────────────────────────────
    const pointer: PointerState = { x: 0, y: 0, down: false, lastMove: -1e9 }
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = -((e.clientY / innerHeight) * 2 - 1)
      pointer.lastMove = performance.now()
    }
    const onDown = (e: PointerEvent) => {
      // Cliques em controles (botões, sliders, código) não devem "repelir" as partículas.
      if ((e.target as Element | null)?.closest('button,input,select,a,pre,label,summary')) return
      pointer.down = true
    }
    const onUp = () => (pointer.down = false)
    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerdown', onDown, { passive: true })
    addEventListener('pointerup', onUp, { passive: true })
    addEventListener('pointercancel', onUp, { passive: true })

    // ── 7. Objeto público ──────────────────────────────────────────────────
    const gpuInfo: GpuInfo = {
      description: adapter.info?.description || adapter.info?.vendor || 'GPU desconhecida',
      features: [...adapter.features].sort(),
      limits: Object.fromEntries(
        SHOWN_LIMITS.map((k) => [k, (adapter.limits as unknown as Record<string, number>)[k]]),
      ),
    }
    const engine: NebulaEngine = {
      kind: 'webgpu',
      params,
      stats: { fps: 0, count: 0 },
      gpu: gpuInfo,
      setCount: (n) => buildParticles(n),
      dispose: () => {
        disposed = true
        cancelAnimationFrame(raf)
        ro.disconnect()
        removeEventListener('pointermove', onMove)
        removeEventListener('pointerdown', onDown)
        removeEventListener('pointerup', onUp)
        removeEventListener('pointercancel', onUp)
        document.removeEventListener('visibilitychange', onVisibility)
        particleBuf?.destroy()
        accum?.destroy()
        context.unconfigure()
        device.destroy()
        canvas.remove()
      },
    }

    // @tech Ciclo de vida seguro (StrictMode, dispose, device.lost)
    // `device.lost` resolve quando o device morre; reason === 'destroyed' é o nosso próprio dispose().
    // Qualquer outro motivo (reset de driver…) avisa a UI para trocar para o fallback.
    let disposed = false
    void device.lost.then((info) => {
      if (!disposed && info.reason !== 'destroyed') engine.onLost?.(info.message)
    })

    resize()
    buildParticles(initialCount)

    // ── 8. Loop ────────────────────────────────────────────────────────────
    let raf = 0
    let last = performance.now()
    let time = 0
    let fpsEma = 60
    const mouse = { x: 0, y: 0 } // atrator suavizado (segue pointer ou autopilot)

    const frame = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(frame)
      const rawDt = (now - last) / 1000
      last = now
      const dt = Math.min(rawDt, 1 / 20) // tab em segundo plano não pode "teleportar" a simulação
      time += dt
      fpsEma += (1 / Math.max(rawDt, 1e-4) - fpsEma) * 0.05
      engine.stats.fps = fpsEma

      // @tech Autopilot do atrator (Lissajous quando ocioso)
      // Sem movimento do mouse há 2,5 s, o atrator percorre uma curva de Lissajous — a página
      // continua viva em telas de toque e quando o usuário está lendo.
      const idle = now - pointer.lastMove > 2500
      const tx = idle ? Math.sin(time * 0.37) * 0.62 : pointer.x
      const ty = idle ? Math.sin(time * 0.53 + 1.3) * 0.5 : pointer.y
      mouse.x += (tx - mouse.x) * Math.min(1, dt * 6)
      mouse.y += (ty - mouse.y) * Math.min(1, dt * 6)

      const aspect = canvas.width / canvas.height
      writeParams(dt, time, aspect)
      writeRenderParams(aspect)

      const encoder = device.createCommandEncoder()

      // Passo 1 — COMPUTE: atualiza todas as partículas
      const cpass = encoder.beginComputePass()
      cpass.setPipeline(computePipeline)
      cpass.setBindGroup(0, computeBG)
      cpass.dispatchWorkgroups(Math.ceil(count / WORKGROUP))
      cpass.end()

      // Passo 2 — RENDER na textura de acumulação (loadOp 'load' preserva o frame anterior)
      // @tech Rastros por acumulação em textura HDR
      // Em vez de limpar a tela, desenhamos um preto translúcido por cima do frame anterior
      // (fade) e SÓ DEPOIS as partículas. O que não é redesenhado esmaece → cauda de cometa.
      const rpass = encoder.beginRenderPass({
        colorAttachments: [{ view: accumView, loadOp: 'load', storeOp: 'store' }],
      })
      rpass.setPipeline(fadePipeline)
      rpass.setBindGroup(0, fadeBG)
      rpass.draw(3)
      rpass.setPipeline(particlePipeline)
      rpass.setBindGroup(0, particleBG)
      rpass.draw(4, count) // 4 vértices × `count` instâncias
      rpass.end()

      // Passo 3 — BLIT: textura HDR → canvas (tone mapping)
      const bpass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      })
      bpass.setPipeline(blitPipeline)
      bpass.setBindGroup(0, blitBG)
      bpass.draw(3)
      bpass.end()

      device.queue.submit([encoder.finish()])
    }

    // @tech Uniforms escritos por frame com layout explícito
    // A ordem dos índices abaixo espelha o struct Params de compute.wgsl (mouse.xy, dt, time, …).
    const writeParams = (dt: number, time: number, aspect: number) => {
      paramsF32[0] = mouse.x
      paramsF32[1] = mouse.y
      paramsF32[2] = dt
      paramsF32[3] = time
      paramsF32[4] = engine.params.attract
      paramsF32[5] = engine.params.curl
      paramsF32[6] = engine.params.drag
      paramsF32[7] = aspect
      paramsU32[8] = count // u32 — escrito pela view Uint32 do mesmo buffer
      paramsF32[9] = pointer.down ? 1 : 0
      paramsF32[10] = 0.6 // swirl: fração tangencial da força de atração
      device.queue.writeBuffer(paramsBuf, 0, paramsF32)
    }

    // @tech Tamanho e brilho adaptativos à contagem de partículas
    // Mais partículas → cada uma menor (size ∝ 1/√n). Abaixo de ~1px o disco "pisca" (aliasing), então
    // há um piso de tamanho. Com o piso, a imagem passaria a somar luz demais; por isso medimos a COBERTURA
    // média por pixel (C = n · área_da_partícula / pixels_da_tela) e reduzimos o ganho para que C·ganho
    // fique constante — 60 mil e 2 milhões de partículas têm exposição parecida.
    const writeRenderParams = (aspect: number) => {
      const size0 = 0.9 / Math.sqrt(count)
      const floor = 2.2 / canvas.height
      const size = Math.max(size0, floor)
      const coverage = (count * (size * canvas.height) ** 2) / (canvas.width * canvas.height)
      const fade = engine.params.fade
      rpF32[0] = aspect
      rpF32[1] = size
      rpF32[2] = fade
      // 3 = cobertura de referência que "parece certa" (250 mil partículas); o fator de fade mantém o brilho
      // estável quando o rastro fica mais curto/longo (equilíbrio ∝ emissão / fade)
      rpF32[3] = 0.55 * Math.min(1, 3 / coverage) * Math.min(2.5, Math.max(0.4, fade / 0.06))
      device.queue.writeBuffer(rpBuf, 0, rpF32)
    }

    // Aba oculta: o rAF já pausa sozinho, mas zerar `last` evita um dt gigante ao voltar.
    const onVisibility = () => {
      last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)

    raf = requestAnimationFrame(frame)
    return engine
  } catch (err) {
    return cleanupOnError(err)
  }
}
