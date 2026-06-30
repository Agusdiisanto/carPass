import { useState } from 'react'
import type { Role } from '../hooks/useCarPass'
import { VehicleMediaHero } from './VehicleMediaHero'
import { VehiclePassportQr } from './VehiclePassportQr'

type VehiclePassportFlipHeroProps = {
  marca: string
  modelo: string
  anio?: number
  imageUrl?: string
  loading?: boolean
  sealLabel?: string
  sealClassName?: string
  vin: string
  color?: string
  connected?: boolean
  role?: Role | null
  onGoToPanel?: () => void
}

function QrChipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  )
}

function PhotoChipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

export function VehiclePassportFlipHero({
  marca,
  modelo,
  anio,
  imageUrl,
  loading = false,
  sealLabel,
  sealClassName,
  vin,
  color,
  connected = false,
  role = null,
  onGoToPanel,
}: VehiclePassportFlipHeroProps) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className={`vh-flip${flipped ? ' vh-flip--revealed' : ''}`}>
      <div className="vh-flip__inner">
        <div className="vh-flip__face vh-flip__face--front">
          <button
            type="button"
            className="vh-flip__activator"
            aria-expanded={flipped}
            aria-label={`Ver QR del pasaporte de ${marca} ${modelo}`}
            onClick={() => setFlipped(true)}
          >
            <VehicleMediaHero
              marca={marca}
              modelo={modelo}
              anio={anio}
              imageUrl={imageUrl}
              loading={loading}
              sealLabel={sealLabel}
              sealClassName={sealClassName}
            />
            <span className="vh-flip__chip vh-flip__chip--front">
              <QrChipIcon />
              Ver QR
            </span>
          </button>
        </div>

        <div className="vh-flip__face vh-flip__face--back">
          <VehiclePassportQr
            vin={vin}
            marca={marca}
            modelo={modelo}
            anio={anio}
            color={color}
            connected={connected}
            role={role}
            onGoToPanel={onGoToPanel}
            variant="flip"
          />
          <button
            type="button"
            className="vh-flip__chip vh-flip__chip--back"
            aria-label={`Volver a la foto de ${marca} ${modelo}`}
            onClick={() => setFlipped(false)}
          >
            <PhotoChipIcon />
            Ver auto
          </button>
        </div>
      </div>
    </div>
  )
}
