/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  09 · NATIVO — a plataforma web, sem bibliotecas
 * ═══════════════════════════════════════════════════════════════════════════
 *  Uma "ficha técnica" (datasheet) com laboratórios vivos de APIs que o navegador já traz.
 *  Nenhum laboratório usa biblioteca: cada um chama direto a API, com detecção de recurso e
 *  tratamento de erro/recusa.
 *
 *  Mapa
 *   • Nativo (default) ... hero + MATRIZ DE SUPORTE (support.ts) + grade de laboratórios
 *   • IntlLab.tsx ........ Segmenter, DisplayNames, Relative/List/Collator, Temporal
 *   • CryptoLab.tsx ...... Web Crypto + CompressionStream
 *   • PatternLab.tsx ..... URLPattern
 *   • TabsLab.tsx ........ BroadcastChannel + Web Locks (abra em duas abas!)
 *   • SchedulerLab.tsx ... scheduler.yield() medido com requestAnimationFrame
 *   • DeviceLab.tsx ...... EyeDropper, Clipboard, Wake Lock, Vibration, Share, OPFS, storage.estimate
 *   • VitalsLab.tsx ...... PerformanceObserver, matchMedia, ResizeObserver
 *   • Spec.tsx ........... o cartão "FIG. NN" reutilizado por todos
 * ═══════════════════════════════════════════════════════════════════════════
 */
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import { useState } from 'react'
import { CompressLab, HashLab } from './CryptoLab.tsx'
import { ColorLab, HardwareLab, StorageLab } from './DeviceLab.tsx'
import { DisplayNamesLab, FormatLab, SegmenterLab, TemporalLab } from './IntlLab.tsx'
import './nativo.css'
import { PatternLab } from './PatternLab.tsx'
import { SchedulerLab } from './SchedulerLab.tsx'
import { detectAll, features, groups } from './support.ts'
import { TabsLab } from './TabsLab.tsx'
import { MediaLab, VitalsLab } from './VitalsLab.tsx'

/** Matriz: um chip por recurso, agrupado, verde = suportado neste navegador. */
function SupportMatrix() {
  // Inicializador preguiçoso: os 42 testes rodam UMA vez, no primeiro render
  const [support] = useState(detectAll)
  const ok = features.filter((f) => support[f.id]).length

  return (
    <section className="nat-matrix" data-spot="nat-matrix" aria-labelledby="matriz">
      <div className="nat-matrix__head">
        <h2 id="matriz">Matriz de suporte</h2>
        <p className="nat-matrix__score">
          <b>{ok}</b>
          <span>/ {features.length}</span>
          <small>recursos neste navegador</small>
        </p>
      </div>
      <div className="nat-matrix__groups">
        {groups.map((g) => (
          <div key={g}>
            <h3>{g}</h3>
            <ul>
              {features
                .filter((f) => f.group === g)
                .map((f) => (
                  <li key={f.id} data-ok={support[f.id] || undefined}>
                    <i aria-hidden="true" />
                    {f.name}
                    <span className="sr-only">{support[f.id] ? ' suportado' : ' não suportado'}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Nativo() {
  return (
    <main className="nat" data-spot-page data-spot="nat-page">
      <title>Atlas — Nativo</title>

      <header className="nat-hero">
        <p className="nat-eyebrow">09 — Plataforma web · sem bibliotecas</p>
        <h1>
          <span className="nat-hero__n">09</span>
          Nativo
        </h1>
        <p className="nat-lede">
          O navegador moderno já traz criptografia, compressão, internacionalização, comunicação entre abas, sistema de arquivos privado e
          muito mais. Esta página usa <b>zero bibliotecas</b> nos laboratórios — só APIs da plataforma, cada uma com detecção de recurso.
        </p>
      </header>

      <SupportMatrix />

      <section className="nat-labs" aria-label="Laboratórios">
        {/* Os cartões alinham título/corpo entre colunas com `subgrid` — veja .nat-spec em nativo.css */}
        <div className="nat-grid" data-spot="nat-grid">
          <SegmenterLab />
          <DisplayNamesLab />
          <FormatLab />
          <TemporalLab />
          <HashLab />
          <CompressLab />
          <PatternLab />
          <ColorLab />
          <TabsLab />
          <SchedulerLab />
          <HardwareLab />
          <StorageLab />
          <VitalsLab />
          <MediaLab />
        </div>
      </section>
    </main>
  )
}
