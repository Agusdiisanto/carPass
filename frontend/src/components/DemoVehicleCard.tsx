import type { DemoVehicle } from '../domain/carpass/demoVehicles'
import { formatNumber } from '../domain/carpass/formatters'
import { getSealChipLabel, getSealUi } from '../domain/carpass/seal'
import { useVehicleMedia } from '../hooks/useVehicleMedia'
import { VehicleMediaHero } from './VehicleMediaHero'

type DemoVehicleCardProps = {
  vehicle: DemoVehicle
  active?: boolean
  loading?: boolean
  onSelect: (vin: string) => void
}

export function DemoVehicleCard({ vehicle, active, loading, onSelect }: DemoVehicleCardProps) {
  const seal = getSealUi(vehicle.seal)
  const media = useVehicleMedia({
    vin: vehicle.vin,
    marca: vehicle.marca,
    modelo: vehicle.modelo,
    anio: vehicle.anio,
  })

  return (
    <button
      type="button"
      className={`vehicle-card ${seal.cls} ${active ? 'vehicle-card--active' : ''} ${loading ? 'vehicle-card--loading' : ''}`}
      onClick={() => onSelect(vehicle.vin)}
      disabled={loading}
    >
      <VehicleMediaHero
        marca={vehicle.marca}
        modelo={vehicle.modelo}
        anio={vehicle.anio}
        imageUrl={media.imageUrl}
        loading={media.loading}
        sealLabel={getSealChipLabel(vehicle.seal)}
        sealClassName={seal.cls}
        compact
      />

      <div className="vehicle-card__body">
        <div className="vehicle-card__title-row">
          <div>
            <p className="vehicle-card__brand">{vehicle.marca}</p>
            <h3 className="vehicle-card__model">{vehicle.modelo}</h3>
          </div>
          <span className="vehicle-card__year">{vehicle.anio}</span>
        </div>

        <div className="vehicle-card__chips">
          <span className="vehicle-card__chip">{vehicle.color}</span>
          <span className="vehicle-card__chip">{formatNumber(vehicle.km)} km</span>
        </div>

        <p className="vehicle-card__reason">{vehicle.reason}</p>

        <div className="vehicle-card__stats">
          <span>{vehicle.services} services</span>
          <span>{vehicle.vtv} VTV</span>
          <span>{vehicle.siniestros} siniestros</span>
        </div>

        <code className="vehicle-card__vin">{vehicle.vin}</code>
      </div>
    </button>
  )
}
