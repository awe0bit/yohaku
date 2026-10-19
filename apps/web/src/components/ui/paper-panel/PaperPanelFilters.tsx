export const PaperPanelFilters = () => (
  <svg
    aria-hidden
    className="pointer-events-none absolute"
    height="0"
    width="0"
  >
    <filter height="115%" id="paper-panel-deckle" width="110%" x="-5%" y="-5%">
      <feTurbulence
        baseFrequency="0.06"
        numOctaves={3}
        result="t"
        seed={9}
        type="fractalNoise"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="t"
        scale={5}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
)
