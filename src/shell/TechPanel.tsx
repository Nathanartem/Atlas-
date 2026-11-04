import { useRef } from 'react'
import { useLocation } from 'react-router'
import { pageByPath } from '../data/pages.ts'
import { shellTechniques, techniques, type Technique } from '../data/techniques.ts'
import { showSpotlight } from './spotlight.ts'
import './techpanel.css'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TechPanel.tsx — botão "{ } Técnicas" + painel lateral com o catálogo da página atual
 * ═══════════════════════════════════════════════════════════════════════════
 *  • Descobre a página atual por `useLocation()` + `pageByPath()` e lista `techniques[page.id]`
 *    (fonte: src/data/techniques.ts — a MESMA que gera TECHNIQUES.md)
 *  • Usa <dialog> nativo: `showModal()` abre (top layer, foco preso, Esc fecha); clicar no backdrop
 *    fecha porque o alvo do clique é o próprio <dialog> quando se clica fora do conteúdo
 *  • A animação de entrada/saída é puro CSS (techpanel.css → `allow-discrete` + `@starting-style`)
 *  • Clicar numa técnica fecha o diálogo e dispara o holofote (`Spotlight.tsx`) no trecho `data-spot`
 *  • O botão tem `view-transition-name` (classe `vt-persist-tech`) para não "piscar" na troca de página
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function TechPanel() {
  const { pathname } = useLocation()
  const page = pageByPath(pathname)
  const list = techniques[page.id] ?? []
  const dialog = useRef<HTMLDialogElement>(null)

  const pick = (t: Technique, n: string, kind: 'page' | 'shell') => {
    const d = dialog.current
    const go = () => showSpotlight({ technique: t, accent: page.accent, n, kind })
    if (!d || !d.open) {
      go()
      return
    }
    d.addEventListener('close', go, { once: true })
    d.close()
  }

  return (
    <>
      <button
        type="button"
        className="tech-btn vt-persist-tech"
        data-spot="shell-tech"
        onClick={() => dialog.current?.showModal()}
        style={{ '--accent': page.accent } as React.CSSProperties}
      >
        <span className="tech-btn__icon">{'{ }'}</span>
        Técnicas
        <span className="tech-btn__count">{list.length}</span>
      </button>

      <dialog
        ref={dialog}
        className="tech-dialog"
        data-lenis-prevent
        style={{ '--accent': page.accent } as React.CSSProperties}
        // Clique no backdrop fecha (o próprio <dialog> é o alvo quando clicam fora do conteúdo)
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <header>
          <div>
            <p className="tech-dialog__eyebrow">
              {page.number} · {page.name}
            </p>
            <h2>Técnicas usadas nesta página</h2>
            <p className="tech-dialog__sub">
              Clique numa técnica para vê-la iluminada na página — o holofote mostra exatamente onde ela vive.
            </p>
          </div>
          <button type="button" className="tech-dialog__close" onClick={() => dialog.current?.close()}>
            Esc
          </button>
        </header>

        <ol>
          {list.map((t, i) => {
            const n = String(i + 1).padStart(2, '0')
            return (
              <li key={t.name}>
                <button type="button" className="tech-dialog__pick" onClick={() => pick(t, n, 'page')}>
                  <span className="tech-dialog__n">{n}</span>
                  <div>
                    <h3>{t.name}</h3>
                    <p>{t.what}</p>
                    <code>{t.where}</code>
                  </div>
                </button>
              </li>
            )
          })}
        </ol>

        <details className="tech-dialog__shell">
          <summary>Casca compartilhada · {shellTechniques.length} técnicas em todas as páginas</summary>
          <ol>
            {shellTechniques.map((t, i) => {
              const n = `S${i + 1}`
              return (
                <li key={t.name}>
                  <button type="button" className="tech-dialog__pick" onClick={() => pick(t, n, 'shell')}>
                    <span className="tech-dialog__n">{n}</span>
                    <div>
                      <h3>{t.name}</h3>
                      <p>{t.what}</p>
                      <code>{t.where}</code>
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        </details>
      </dialog>
    </>
  )
}
