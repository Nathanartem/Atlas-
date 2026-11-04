/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  geo.ts — dados e matemática geográfica da página Mundi (sem React)
 * ═══════════════════════════════════════════════════════════════════════════
 *  Conteúdo
 *   1. Dados do mundo (TopoJSON → GeoJSON)
 *   2. Projeções "cruas" + interpolação entre elas (morph)
 *   3. Indicadores do mapa coroplético
 *   4. Sol: posição subsolar para o terminador dia/noite
 *   5. Utilidades de canvas (DPR + tamanho)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import {
  geoArea,
  geoCentroid,
  geoCircle,
  geoEqualEarthRaw,
  geoEquirectangularRaw,
  geoMercatorRaw,
  geoNaturalEarth1Raw,
  geoProjection,
  type ExtendedFeatureCollection,
  type GeoPermissibleObjects,
  type GeoProjection,
  type GeoRawProjection,
} from 'd3-geo'
import { interpolateRdYlBu, interpolateTurbo, interpolateViridis } from 'd3-scale-chromatic'
import type { Feature, Geometry, MultiLineString } from 'geojson'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
// @tech Dados do mundo em TopoJSON (importado como módulo JSON)
// `world-atlas` publica o Natural Earth já em TopoJSON (arcos compartilhados → ~100 KB para 177 países).
// O Vite importa .json como módulo ES; `resolveJsonModule` (tsconfig.app.json) dá o tipo.
import worldJson from 'world-atlas/countries-110m.json'

/* ───────────────────────── 1. DADOS DO MUNDO ───────────────────────── */
type CountryProps = { name: string }
const topo = worldJson as unknown as Topology<{ countries: GeometryCollection<CountryProps> }>

export type CountryFeature = Feature<Geometry, CountryProps>

/** `feature()` converte os arcos do TopoJSON em polígonos GeoJSON (um por país). */
const allCountries = feature(topo, topo.objects.countries).features as CountryFeature[]

/** Antártida (id "010") some nos mapas planos: em Mercator ela vira uma faixa infinita. */
export const countries: CountryFeature[] = allCountries.filter((f) => f.id !== '010')

/** Todas as fronteiras como UMA linha: `mesh` com filtro `a !== b` omite as bordas costeiras (só fronteiras entre países). */
export const borders: MultiLineString = mesh(topo, topo.objects.countries, (a, b) => a !== b)
/** Contorno de todos os países, usado para "encaixar" (fit) cada projeção na tela. */
export const worldFC: ExtendedFeatureCollection = { type: 'FeatureCollection', features: countries }
/** Versão COM Antártida — o globo precisa dela (no mapa plano ela distorce demais). */
export const worldFull: ExtendedFeatureCollection = { type: 'FeatureCollection', features: allCountries }

export const SPHERE: GeoPermissibleObjects = { type: 'Sphere' }

/**
 * Círculos de Tissot: círculos IGUAIS (4°) espalhados pelo globo. A deformação deles revela o erro da projeção.
 * @tech Círculos de Tissot (indicatrizes de deformação)
 * `geoCircle().center([lon, lat]).radius(4)` gera um polígono geodésico; ao ser projetado, círculos viram
 * elipses onde há distorção (ângulos) e mudam de tamanho onde há distorção de área.
 */
export const tissot: GeoPermissibleObjects[] = (() => {
  const out: GeoPermissibleObjects[] = []
  for (let lat = -75; lat <= 75; lat += 30) {
    for (let lon = -165; lon <= 165; lon += 30) {
      out.push(geoCircle().center([lon, lat]).radius(4).precision(2)())
    }
  }
  return out
})()

/* ───────────────────────── 2. PROJEÇÕES + MORPH ───────────────────────── */
/** Mercator vai ao infinito nos polos; limitar a ±85° mantém todos os números finitos. */
const mercatorClamped: GeoRawProjection = (lambda, phi) => geoMercatorRaw(lambda, Math.max(-1.4835, Math.min(1.4835, phi)))

export interface ProjectionDef {
  id: string
  label: string
  raw: GeoRawProjection
  note: string
}

export const PROJECTIONS: ProjectionDef[] = [
  { id: 'equirect', label: 'Equiretangular', raw: geoEquirectangularRaw, note: 'Lat/lon como x/y: simples, mas infla as áreas perto dos polos.' },
  { id: 'mercator', label: 'Mercator', raw: mercatorClamped, note: 'Preserva ângulos (navegação), porém a Groenlândia parece do tamanho da África.' },
  { id: 'equalearth', label: 'Equal Earth', raw: geoEqualEarthRaw, note: 'Preserva ÁREAS: bom para comparar países.' },
  { id: 'natural', label: 'Natural Earth', raw: geoNaturalEarth1Raw, note: 'Compromisso visual: nada é exato, tudo é agradável.' },
]

/**
 * @tech Morph entre projeções (interpolação de projeções cruas)
 * Uma projeção "crua" é só uma função (λ, φ) → [x, y]. Misturar duas delas ponto a ponto com
 * `(1−t)·A + t·B` gera uma projeção NOVA e válida para qualquer t em [0,1]; d3.geoProjection()
 * embrulha essa função com escala/translação/rotação. Animando t, o mapa "derrete" de uma projeção na outra.
 */
export function blendRaw(a: GeoRawProjection, b: GeoRawProjection, t: number): GeoRawProjection {
  return (lambda, phi) => {
    const [ax, ay] = a(lambda, phi)
    const [bx, by] = b(lambda, phi)
    return [ax + (bx - ax) * t, ay + (by - ay) * t]
  }
}

/** Cria a projeção mesclada e a ENCAIXA no retângulo (`fitExtent` mede o contorno dos países projetados). */
export function fittedProjection(raw: GeoRawProjection, width: number, height: number, pad = 14): GeoProjection {
  return geoProjection(raw).fitExtent(
    [
      [pad, pad],
      [width - pad, height - pad],
    ],
    worldFC,
  )
}

/* ───────────────────────── 3. INDICADORES ───────────────────────── */
export interface Indicator {
  id: string
  label: string
  unit: string
  /** `synthetic` = modelo simplificado para demonstração (não são dados medidos) */
  kind: 'computed' | 'synthetic'
  note: string
  interpolator: (t: number) => string
  log: boolean
  values: Map<string, number>
}

/** Hash determinístico 0..1 a partir do nome do país — dá variação "natural" sem aleatoriedade entre execuções. */
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

const EARTH_KM2 = 4 * Math.PI * 6371 ** 2

function buildIndicators(): Indicator[] {
  const area = new Map<string, number>()
  const temp = new Map<string, number>()
  const rain = new Map<string, number>()

  for (const f of countries) {
    const [lon, lat] = geoCentroid(f)
    // ÁREA REAL: geoArea devolve esterorradianos (fração da esfera); × 4πR² dá km²
    area.set(f.properties.name, (geoArea(f) / (4 * Math.PI)) * EARTH_KM2)

    const n = hash01(f.properties.name)
    // Temperatura: decai com a latitude; −0,62 °C por grau; ±3 °C de variação por país
    temp.set(f.properties.name, 28 - 0.62 * Math.abs(lat) + (n - 0.5) * 6 + 2 * Math.sin((lon * Math.PI) / 90))
    // Chuva: faixa equatorial úmida + faixa temperada; subtrópicos secos
    const eq = 1800 * Math.exp(-((lat / 12) ** 2))
    const temperate = 900 * Math.exp(-(((Math.abs(lat) - 50) / 14) ** 2))
    rain.set(f.properties.name, 220 + eq + temperate + (n - 0.5) * 500)
  }

  return [
    { id: 'area', label: 'Área', unit: 'km²', kind: 'computed', note: 'Calculada a partir dos polígonos com d3.geoArea (escala logarítmica).', interpolator: interpolateViridis, log: true, values: area },
    { id: 'temp', label: 'Temperatura média', unit: '°C', kind: 'synthetic', note: 'Modelo sintético: cai com a latitude. Ilustrativo, não medido.', interpolator: interpolateTurbo, log: false, values: temp },
    { id: 'rain', label: 'Chuva anual', unit: 'mm', kind: 'synthetic', note: 'Modelo sintético: faixas úmidas e secas por latitude. Ilustrativo, não medido.', interpolator: (t) => interpolateRdYlBu(1 - t), log: false, values: rain },
  ]
}

export const indicators = buildIndicators()

/* ───────────────────────── 4. SOL (terminador dia/noite) ───────────────────────── */
/**
 * @tech Terminador dia/noite em tempo real
 * Ponto subsolar = onde o Sol está a pino agora. Latitude = declinação solar (aproximação de
 * Cooper: −23,44°·cos(2π/365·(N+10))). Longitude = (12h − hora UTC − equação do tempo) × 15°/h.
 * O hemisfério NOITE é o círculo de raio 90° centrado no ponto ANTI-solar (geoCircle).
 */
export function subsolarPoint(date: Date): [number, number] {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const dayOfYear = (date.getTime() - start) / 864e5
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10))
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  // Equação do tempo (minutos), fórmula aproximada de Spencer
  const b = ((2 * Math.PI) / 364) * (dayOfYear - 81)
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  let lon = -(hours - 12 + eot / 60) * 15
  lon = ((((lon + 180) % 360) + 360) % 360) - 180
  return [lon, decl]
}

export function antiSolar([lon, lat]: [number, number]): [number, number] {
  return [lon > 0 ? lon - 180 : lon + 180, -lat]
}

/* ───────────────────────── 5. CANVAS ───────────────────────── */
/** Ajusta width/height reais do canvas ao tamanho CSS × DPR e devolve as dimensões em px CSS. */
export function sizeCanvas(canvas: HTMLCanvasElement, maxDpr = 2) {
  const dpr = Math.min(devicePixelRatio || 1, maxDpr)
  const w = Math.max(2, canvas.clientWidth)
  const h = Math.max(2, canvas.clientHeight)
  const pw = Math.round(w * dpr)
  const ph = Math.round(h * dpr)
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw
    canvas.height = ph
  }
  return { w, h, dpr }
}
