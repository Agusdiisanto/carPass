type CarPassLogoMarkProps = {
  size?: number
  className?: string
}

/** Escudo CarPass — viewBox 20×30 (más alto que ancho). */
const VIEW_W = 20
const VIEW_H = 30
const VIEW_BOX = `6 2 ${VIEW_W} ${VIEW_H}`

export function CarPassLogoMark({ size, className }: CarPassLogoMarkProps) {
  const sized = size != null
  const width = sized ? size : undefined
  const height = sized ? Math.round((size * VIEW_H) / VIEW_W) : undefined

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={VIEW_BOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M16 2 L6 6.5 v9.5 c0 7.8 5.3 13.6 10 16 4.7-2.4 10-8.2 10-16 V6.5 Z"
        fill="#2dd4bf"
      />
      <path
        d="M11 16 l3.5 3.5 7-7.5"
        stroke="#0a0e12"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type CarPassLogoProps = {
  compact?: boolean
}

export function CarPassLogo({ compact = false }: CarPassLogoProps) {
  return (
    <div className={`brand-logo ${compact ? 'brand-logo--compact' : ''}`}>
      <CarPassLogoMark size={compact ? 26 : 32} />
      <span className="brand-logo-text">
        Car<span className="brand-logo-accent">Pass</span>
      </span>
    </div>
  )
}
