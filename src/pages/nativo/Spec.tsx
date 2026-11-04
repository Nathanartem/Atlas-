import type { ReactNode } from 'react'

/**
 * Cartão "ficha técnica" usado por todos os laboratórios da página Nativo.
 *  • `fig`       → número da figura (FIG. 03)
 *  • `api`       → nome(s) da API em destaque, em monoespaçada
 *  • `supported` → undefined = sem selo; true/false = selo "disponível"/"indisponível"
 *  • `wide`      → ocupa a linha inteira da grade
 * O conteúdo do laboratório entra em `children`.
 */
export function Spec({
  fig,
  title,
  api,
  supported,
  wide,
  spot,
  children,
}: {
  fig: number
  title: string
  api: string
  supported?: boolean
  wide?: boolean
  spot?: string
  children: ReactNode
}) {
  return (
    <article className={`nat-spec${wide ? ' nat-spec--wide' : ''}`} data-spot={spot}>
      <header>
        <span className="nat-spec__fig">FIG. {String(fig).padStart(2, '0')}</span>
        {supported !== undefined && (
          <span className={`nat-badge ${supported ? 'nat-badge--ok' : 'nat-badge--no'}`}>{supported ? 'disponível' : 'indisponível'}</span>
        )}
      </header>
      <h3>{title}</h3>
      <p className="nat-spec__api">{api}</p>
      <div className="nat-spec__body">{children}</div>
    </article>
  )
}

/** Linha "rótulo → valor" usada nos resultados dos laboratórios. */
export function Out({ label, children, mono = true }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="nat-out">
      <dt>{label}</dt>
      <dd className={mono ? 'nat-mono' : undefined}>{children}</dd>
    </div>
  )
}
