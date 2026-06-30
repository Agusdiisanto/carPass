import type { MiVehiculo } from '../hooks/useMisVehiculos'
import { safeUpperCase } from '../domain/carpass/formatters'
import { useVehicleMedia } from '../hooks/useVehicleMedia'
import { VehicleMediaHero } from './VehicleMediaHero'

type MisAutoCardProps = {
  vehicle: MiVehiculo
  selected?: boolean
  wrongNetwork?: boolean
  onViewPassport: (vin: string) => void
  onTransfer: (vin: string) => void
}

export function MisAutoCard({
  vehicle,
  selected = false,
  wrongNetwork = false,
  onViewPassport,
  onTransfer,
}: MisAutoCardProps) {
  const { info } = vehicle
  const media = useVehicleMedia({
    vin: info.vin,
    marca: info.marca,
    modelo: info.modelo,
    anio: info.anio,
  })

  return (
    <article className={`mis-auto-card ${selected ? 'mis-auto-card--selected' : ''}`}>
      <VehicleMediaHero
        marca={info.marca}
        modelo={info.modelo}
        anio={info.anio}
        imageUrl={media.imageUrl}
        loading={media.loading}
        sealLabel="NFT"
        sealClassName="seal-ok"
        compact
      />

      <div className="mis-auto-card__body">
        <div className="mis-auto-card__title-row">
          <div>
            <p className="mis-auto-card__brand">{safeUpperCase(info.marca)}</p>
            <h3 className="mis-auto-card__model">{info.modelo}</h3>
          </div>
          <span className="mis-auto-card__year">{String(info.anio)}</span>
        </div>

        <div className="mis-auto-card__chips">
          <span className="mis-auto-card__chip">{info.color}</span>
          <span className="mis-auto-card__chip">Token #{String(vehicle.tokenId)}</span>
        </div>

        <code className="mis-auto-card__vin">{info.vin}</code>

        <div className="mis-auto-card__actions">
          <button
            type="button"
            className="mis-auto-card__btn mis-auto-card__btn--primary"
            disabled={wrongNetwork}
            title={wrongNetwork ? 'Cambiá a Sepolia para transferir' : 'Transferir dominio CarPass'}
            onClick={() => onTransfer(info.vin)}
          >
            Transferir
          </button>
          <button
            type="button"
            className="mis-auto-card__btn mis-auto-card__btn--ghost"
            onClick={() => onViewPassport(info.vin)}
          >
            Ver pasaporte
          </button>
        </div>
      </div>
    </article>
  )
}
