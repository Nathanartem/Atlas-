/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  crt-element.ts — Web Component <atlas-crt>: a "moldura de TV de tubo"
 * ═══════════════════════════════════════════════════════════════════════════
 *  Um Custom Element de verdade (não um componente React):
 *   • Shadow DOM (open) encapsula o visual: moldura, vidro, scanlines, vinheta, brilho
 *   • `<slot>` recebe o conteúdo do terminal, que continua no DOM "normal" (estilizado pelo CSS da página)
 *   • Estilos via Constructable Stylesheet (`adoptedStyleSheets`): a folha é criada UMA vez e
 *     compartilhada por todas as instâncias
 *   • API pública = atributos HTML: `power="on|off"` (animação de ligar/desligar a TV)
 *   • `part="screen"` expõe o miolo para a página estilizar com `atlas-crt::part(screen)`
 *   • A cor do fósforo vem da custom property `--crt-tint` — custom properties ATRAVESSAM o Shadow DOM
 * ═══════════════════════════════════════════════════════════════════════════
 */

// @tech Constructable Stylesheets (adoptedStyleSheets)
// `new CSSStyleSheet()` + `replaceSync()` cria uma folha fora do DOM; cada shadow root a "adota".
// Vantagem sobre <style> em cada instância: parse uma vez só e memória compartilhada.
const sheet = new CSSStyleSheet()
sheet.replaceSync(/* css */ `
  :host {
    display: block;
    position: relative;
    --tint: var(--crt-tint, #39ff88);
    contain: layout paint;
  }
  /* moldura plástica */
  .bezel {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(10px, 1.8vw, 22px);
    border-radius: 28px;
    background: linear-gradient(145deg, #2c2d33, #121317 60%, #1c1d22);
    box-shadow:
      0 40px 90px -24px #000,
      inset 0 2px 0 rgb(255 255 255 / 0.1),
      inset 0 -3px 10px #000;
  }
  /* "vidro" do tubo: cantos arredondados + brilho interno na cor do fósforo */
  .glass {
    position: relative;
    height: 100%;
    overflow: hidden;
    border-radius: 18px / 24px;
    background: radial-gradient(120% 120% at 50% 40%, #031208 0%, #010503 80%);
    box-shadow:
      inset 0 0 70px rgb(0 0 0 / 0.9),
      inset 0 0 10px color-mix(in oklab, var(--tint) 30%, transparent);
    transform-origin: center;
    transition:
      transform 0.7s cubic-bezier(0.7, 0, 0.2, 1),
      filter 0.7s;
  }
  /* TV desligada: o quadro colapsa numa linha branca (e religa ao remover o atributo) */
  :host([power='off']) .glass {
    transform: scaleY(0.004) scaleX(0.5);
    filter: brightness(5);
  }
  .content {
    position: relative;
    height: 100%;
    animation: flicker 0.14s steps(2) infinite;
  }
  .layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  /* @tech Efeito CRT em CSS (scanlines, vinheta, flicker, power-on)
     Camadas absolutas sobrepostas ao conteúdo: .scan (repeating-linear-gradient + multiply),
     .roll (barra de varredura animada), .vig (vinheta radial), .glare (reflexo no vidro);
     o flicker oscila a opacidade; o power-on é uma transição de scaleY no :host([power]). */
  /* scanlines: linhas escuras de 1px a cada 3px, multiplicadas sobre a imagem */
  .scan {
    background: repeating-linear-gradient(to bottom, rgb(0 0 0 / 0.3) 0 1px, transparent 1px 3px);
    mix-blend-mode: multiply;
  }
  /* barra de varredura que sobe devagar */
  .roll {
    height: 24%;
    background: linear-gradient(to bottom, transparent, rgb(255 255 255 / 0.05) 50%, transparent);
    animation: roll 8s linear infinite;
  }
  .vig {
    background: radial-gradient(ellipse at center, transparent 52%, rgb(0 0 0 / 0.7) 100%);
  }
  .glare {
    background: linear-gradient(118deg, rgb(255 255 255 / 0.08), transparent 32%);
  }
  @keyframes flicker {
    0% { opacity: 1; }
    50% { opacity: 0.985; }
  }
  @keyframes roll {
    from { translate: 0 -120%; }
    to { translate: 0 520%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .content, .roll { animation: none; }
    .glass { transition: none; }
  }
`)

// @tech Web Component (Custom Element + Shadow DOM)
// Classe que estende HTMLElement + `customElements.define`. O Shadow DOM isola o CSS interno (nada vaza
// para a página nem o contrário) e `observedAttributes` + `attributeChangedCallback` fazem do atributo
// `power` a API pública do componente.
class AtlasCrt extends HTMLElement {
  static observedAttributes = ['power']

  constructor() {
    super()
    const root = this.attachShadow({ mode: 'open' })
    root.adoptedStyleSheets = [sheet]
    root.innerHTML = /* html */ `
      <div class="bezel" part="bezel">
        <div class="glass" part="glass">
          <div class="content" part="screen"><slot></slot></div>
          <div class="layer scan"></div>
          <div class="layer roll"></div>
          <div class="layer vig"></div>
          <div class="layer glare"></div>
        </div>
      </div>`
  }

  /** Reage a mudanças do atributo `power` emitindo um evento (a página pode ouvir `crt-power`). */
  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'power') this.dispatchEvent(new CustomEvent('crt-power', { detail: value ?? 'on' }))
  }
}

/** Registra o elemento uma única vez (customElements.define lança se o nome já existir — ex.: HMR). */
export function defineCrt() {
  if (!customElements.get('atlas-crt')) customElements.define('atlas-crt', AtlasCrt)
}

/**
 * Tipagem do elemento no JSX. O React 19 passa strings como ATRIBUTOS em elementos customizados,
 * então `power="on"` chega ao `attributeChangedCallback` acima.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'atlas-crt': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { power?: 'on' | 'off' }
    }
  }
}
