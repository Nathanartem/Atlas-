import { Environment, Lightformer, MeshTransmissionMaterial, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { buildTargets, COUNT, particleFragment, particleVertex } from './morph.ts'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Scene.tsx — a cena 3D da página Orbit (React Three Fiber)
 * ═══════════════════════════════════════════════════════════════════════════
 * @tech React Three Fiber (cena declarativa)
 * R3F expõe o Three.js como componentes React: `<mesh>`, `<group>`, `<instancedMesh>`… são objetos do Three, e `args`
 * são os parâmetros do construtor. `useFrame((state, dt) => …)` é o loop de animação (60×/s) — dentro dele
 * mutamos objetos DIRETAMENTE (rotation, uniforms), sem setState, para não re-renderizar o React.
 *
 * Hierarquia
 *   OrbitCanvas ─ <Canvas> + PerformanceMonitor
 *     └─ World ─ fundo, névoa, Environment (luz) + CameraRig, Particles, Gem, Shards + EffectComposer (pós-proc.)
 *
 * Comunicação com o scroll: `progress` (0→1) é um RefObject escrito por Orbit.tsx; `smooth` é a versão suavizada
 * calculada no CameraRig e lida por todos os objetos. Nenhum dos dois é state.
 * ═══════════════════════════════════════════════════════════════════════════
 */
type Num = RefObject<number>

/* ───────── Partículas: 26k pontos, morph inteiro no vertex shader ─────────
   @tech Partículas com ShaderMaterial custom
   Um `THREE.Points` com `ShaderMaterial` próprio (shaders em morph.ts). A geometria carrega 4 posições por vértice
   (`position`, `aP1`, `aP2`, `aP3`) + `aRand`; blending ADITIVO + `depthWrite: false` fazem as partículas somarem
   luz sem brigar por profundidade. Uniforms mudam por frame (`uMorph`, `uTime`, `uPR` = pixel ratio). A criação fica
   em useMemo e o cleanup chama `dispose()` (libera a memória da GPU). */
function Particles({ smooth }: { smooth: Num }) {
  const points = useRef<THREE.Points>(null)

  const { geometry, material } = useMemo(() => {
    const t = buildTargets()
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(t.sphere, 3))
    g.setAttribute('aP1', new THREE.BufferAttribute(t.torus, 3))
    g.setAttribute('aP2', new THREE.BufferAttribute(t.cube, 3))
    g.setAttribute('aP3', new THREE.BufferAttribute(t.galaxy, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(t.rand, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uMorph: { value: 0 }, uTime: { value: 0 }, uSize: { value: 5.5 }, uPR: { value: 1 } },
    })
    return { geometry: g, material: m }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uMorph.value = smooth.current * 3
    material.uniforms.uPR.value = state.gl.getPixelRatio()
    if (points.current) points.current.rotation.y = state.clock.elapsedTime * 0.04 + smooth.current * 1.2
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}

/* ───────── Joia de vidro (refração + aberração cromática) ─────────
   @tech MeshTransmissionMaterial (vidro)
   Material do drei que simula vidro de verdade: renderiza a cena ATRÁS do objeto num buffer (`resolution`, `samples`)
   e a refrata com `ior` 1,45, `thickness`, `chromaticAberration` (cores separadas nas bordas), `distortion`
   (ondulação) e `temporalDistortion` (a ondulação evolui no tempo). `backside={false}` poupa uma passada extra.
   A geometria é um `torusKnotGeometry` de 240×40 segmentos. */
function Gem({ smooth }: { smooth: Num }) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const glow = useMemo(() => new THREE.Color(3.2, 1.9, 0.55), [])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const p = smooth.current
    g.rotation.y = t * 0.18 + p * Math.PI * 2.4
    g.rotation.x = Math.sin(t * 0.3) * 0.2 + p * 1.2
    const s = THREE.MathUtils.lerp(1.25, 0.82, Math.sin(p * Math.PI))
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 4, dt))
    // @tech Parallax do ponteiro na joia
    // `state.pointer` (x,y em [-1,1], fornecido pelo R3F) vira o ALVO de posição da joia (±0,35 / ±0,25) e `damp` o
    // persegue suavemente — a joia "olha" para o cursor sem nunca saltar.
    // parallax suave com o ponteiro
    g.position.x = THREE.MathUtils.damp(g.position.x, state.pointer.x * 0.35, 3, dt)
    g.position.y = THREE.MathUtils.damp(g.position.y, state.pointer.y * 0.25, 3, dt)
    if (core.current) {
      core.current.rotation.x = t * 0.8
      core.current.rotation.y = t * 0.6
    }
  })

  return (
    <group ref={group}>
      <mesh>
        <torusKnotGeometry args={[1, 0.34, 240, 40, 2, 3]} />
        <MeshTransmissionMaterial
          samples={6}
          resolution={512}
          transmission={1}
          thickness={0.7}
          roughness={0.04}
          ior={1.45}
          chromaticAberration={0.07}
          anisotropicBlur={0.08}
          distortion={0.25}
          distortionScale={0.35}
          temporalDistortion={0.08}
          color="#dff6ff"
          backside={false}
        />
      </mesh>
      {/* @tech Emissivo > 1 com toneMapped=false
          `new THREE.Color(3.2, 1.9, 0.55)` tem canais acima de 1 (HDR). Com `toneMapped={false}` o material não é
          "comprimido" para [0,1], então o `luminanceThreshold` do Bloom (0,22) só pega ESTE objeto e o faz irradiar
          — o vidro e as partículas não borram junto.
          núcleo emissivo: cor > 1 + toneMapped=false → o Bloom o faz brilhar */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshBasicMaterial color={glow} toneMapped={false} wireframe />
      </mesh>
    </group>
  )
}

/* ───────── Estilhaços: 140 instâncias num único draw call ─────────
   @tech InstancedMesh
   Um `InstancedMesh` desenha N cópias da MESMA geometria/material em UMA chamada de desenho (draw call). Cada instância
   tem sua matriz 4×4: por frame atualizamos posição/rotação/escala num `Object3D` auxiliar (`dummy`), copiamos
   `dummy.matrix` com `setMatrixAt(i, …)` e avisamos `instanceMatrix.needsUpdate = true`. As "sementes" (raio, ângulo,
   altura, tamanho, velocidade) são determinísticas (números primos) — sem Math.random, o layout é estável. */
function Shards({ smooth }: { smooth: Num }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const N = 140
  const seeds = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        r: 4.6 + ((i * 7919) % 100) / 100 * 5.5,
        a: (i / N) * Math.PI * 2 * 5,
        y: (((i * 104729) % 100) / 100 - 0.5) * 6,
        s: 0.4 + (((i * 15485863) % 100) / 100) * 1.1,
        sp: 0.08 + (((i * 32452843) % 100) / 100) * 0.22,
      })),
    [],
  )

  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    const spread = 1 + smooth.current * 0.5
    for (let i = 0; i < N; i++) {
      const s = seeds[i]
      const ang = s.a + t * s.sp
      dummy.position.set(Math.cos(ang) * s.r * spread, s.y + Math.sin(t * 0.5 + i) * 0.25, Math.sin(ang) * s.r * spread)
      dummy.rotation.set(t * s.sp * 3 + i, t * s.sp * 2, i)
      dummy.scale.setScalar(s.s)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <octahedronGeometry args={[0.14, 0]} />
      <meshStandardMaterial color="#9fb4ff" metalness={1} roughness={0.18} envMapIntensity={1.4} />
    </instancedMesh>
  )
}

/* ───────── Câmera guiada pelo scroll ─────────
   @tech Câmera guiada pelo scroll
   A câmera percorre uma trajetória PARAMÉTRICA em função de p ∈ [0,1]: ângulo `theta = p·1,7π` (quase uma volta e
   meia), `radius` que encolhe no meio e cresce no fim, e `y` oscilando. Posição = (sin θ·r, y, cos θ·r) e `lookAt`
   no centro. Zero keyframes: o scroll É a timeline. */
function CameraRig({ progress, smooth }: { progress: Num; smooth: Num }) {
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame((state, dt) => {
    // @tech Damping independente de FPS
    // `MathUtils.damp(atual, alvo, lambda, dt)` = lerp exponencial: `atual + (alvo−atual)·(1−e^(−λ·dt))`. Como usa o
    // dt do frame, a sensação é a mesma em 30, 60 ou 144 fps (um lerp fixo de 0,1 por frame seria 4× mais rápido a
    // 144 fps). Mesma função suaviza a escala e o parallax da joia.
    // suaviza o progresso (damping exponencial independente de FPS)
    smooth.current = THREE.MathUtils.damp(smooth.current, progress.current, 2.6, dt)
    const p = smooth.current
    const theta = p * Math.PI * 1.7
    const radius = 8.6 - Math.sin(p * Math.PI) * 2.2 + p * 4
    const y = 0.5 + Math.sin(p * Math.PI * 2) * 2.2
    state.camera.position.set(Math.sin(theta) * radius, y, Math.cos(theta) * radius)
    look.set(0, Math.sin(p * Math.PI) * 0.4, 0)
    state.camera.lookAt(look)
  })
  return null
}

/* ───────── Cena ───────── */
function World({ progress }: { progress: Num }) {
  const smooth = useRef(0)
  return (
    <>
      <color attach="background" args={['#04060c']} />
      {/* @tech Fog para profundidade
          `<fog args={[cor, perto, longe]}>` mistura a cor do fundo com objetos entre 11 e 30 unidades de distância:
          partículas e estilhaços distantes esmaecem, dando sensação de profundidade e escondendo o "corte" da cena. */}
      <fog attach="fog" args={['#04060c', 11, 30]} />

      {/* @tech Ambiente procedural com Lightformers
          `<Environment>` gera um mapa de ambiente (reflexos + luz) a partir dos filhos: cada `Lightformer` é um
          retângulo/anel/círculo EMISSIVO. Resultado: reflexos nítidos no vidro e nos estilhaços sem baixar nenhum
          HDRI (.hdr de vários MB) e com cores sob nosso controle.
          Luz sem baixar nada: Lightformers desenham um "estúdio" procedural como mapa de ambiente */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="rect" intensity={4} position={[0, 5, -9]} scale={[12, 12, 1]} color="#6ee7ff" />
          <Lightformer form="ring" intensity={3.2} position={[-5, 1, -1]} scale={4} color="#8b5cf6" />
          <Lightformer form="rect" intensity={3} position={[6, -2, 2]} scale={[6, 3, 1]} color="#ffb85c" />
          <Lightformer form="circle" intensity={2} position={[0, -6, 3]} scale={5} color="#ffffff" />
        </group>
      </Environment>

      <CameraRig progress={progress} smooth={smooth} />
      <Particles smooth={smooth} />
      <Gem smooth={smooth} />
      <Shards smooth={smooth} />

      {/* @tech Pós-processamento
          `EffectComposer` (postprocessing) funde os efeitos em UMA passada: Bloom (brilho nas áreas claras, `mipmapBlur`
          = desfoque barato e suave), ChromaticAberration (franjas de cor), Noise (grão em SOFT_LIGHT) e Vignette
          (cantos escuros). O MSAA 4× do composer substitui o antialias do canvas (desligado em OrbitCanvas). */}
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.22} luminanceSmoothing={0.25} radius={0.8} />
        <ChromaticAberration offset={new THREE.Vector2(0.0009, 0.0009)} radialModulation={false} modulationOffset={0} />
        <Noise opacity={0.045} blendFunction={BlendFunction.SOFT_LIGHT} />
        <Vignette offset={0.25} darkness={0.85} />
      </EffectComposer>
    </>
  )
}

export function OrbitCanvas({ progress }: { progress: Num }) {
  // @tech PerformanceMonitor → DPR adaptativo
  // `PerformanceMonitor` (drei) mede o FPS ao longo do tempo e chama `onChange({ factor })` com um fator 0–1 (1 = sobra
  // de desempenho). Mapeamos para `dpr = 0,8 + factor` (máx. 1,75): se o PC sofre, a resolução cai e o FPS volta;
  // se sobra, nitidez sobe. `flipflops` limita as oscilações para não ficar alternando sem parar.
  // qualidade adaptativa: PerformanceMonitor mede FPS e ajusta a resolução (dpr)
  const [dpr, setDpr] = useState(1.5)

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.5, 8.6], fov: 38, near: 0.1, far: 60 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      // @tech eventSource no documento
      // Por padrão o R3F só recebe ponteiro quando o mouse está sobre o <canvas>; aqui o texto (HTML) fica POR CIMA dele.
      // `eventSource={document.documentElement}` + `eventPrefix="client"` escutam a página inteira, então o parallax
      // do `state.pointer` funciona mesmo com os cartões de texto na frente.
      eventSource={document.documentElement}
      eventPrefix="client"
      aria-label={`Cena 3D com ${COUNT.toLocaleString('pt-BR')} partículas`}
    >
      <PerformanceMonitor onChange={({ factor }) => setDpr(Math.min(1.75, 0.8 + factor * 1.0))} flipflops={3} />
      <World progress={progress} />
    </Canvas>
  )
}
