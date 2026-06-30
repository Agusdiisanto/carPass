import { useState } from 'react'
import { VehicleIdentifyPanel } from '../components/VehicleIdentifyPanel'
import { OperativeShell } from '../components/OperativeShell'
import { formatKm } from '../domain/carpass/formatters'
import { isValidMileage } from '../domain/carpass/validators'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { shortAddress } from '../hooks/useWallet'

export function TallerView({
  address,
  wrongNetwork = false,
  embedded = false,
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
}) {
  const { busy, message, agregarService } = useCarPass()
  const lookup = useVehicleLookup({ loadMileage: true })

  const [km, setKm] = useState(0)
  const [tipo, setTipo] = useState('Service oficial')
  const [desc, setDesc] = useState('')

  const kmValido = isValidMileage(km, lookup.lastKm)

  async function handleService() {
    if (!lookup.tokenId) return
    const ok = await agregarService(lookup.tokenId, km, tipo, desc || 'Service registrado')
    if (ok) {
      lookup.setLastKm(km)
      setKm(km + 1000)
      setDesc('')
    }
  }

  const panels = (
    <div className="operative-flow operative-flow--taller">
      <VehicleIdentifyPanel
        lookup={lookup}
        accent="taller"
        showMileage
        onIdentified={(result) => setKm(result.lastKm + 1000)}
      />

      {lookup.found ? (
        <section className="panel panel--operative">
          <div className="panel-step">
            <span className="panel-step__num">2</span>
            <div>
              <h3>Datos del service</h3>
              <p className="panel-desc">El kilometraje debe superar el último registrado on-chain.</p>
            </div>
          </div>

          <label className="field">
            Tipo de service
            <input value={tipo} onChange={(e) => setTipo(e.target.value)} />
          </label>

          <label className="field">
            Kilometraje actual
            <input
              min="0"
              step="500"
              type="number"
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
            />
          </label>

          <input
            aria-label="Kilometraje"
            className="km-slider"
            max="300000"
            min="0"
            step="500"
            type="range"
            value={km}
            onChange={(e) => setKm(Number(e.target.value))}
          />

          <div className={`km-validation ${kmValido ? 'valid' : 'invalid'}`}>
            <span className="km-icon">{kmValido ? 'OK' : 'X'}</span>
            <span>
              {kmValido
                ? `${formatKm(km)} - válido`
                : `${formatKm(km)} - debe superar ${formatKm(lookup.lastKm)}`}
            </span>
          </div>

          <label className="field">
            Descripción <span className="field-hint">opcional</span>
            <textarea
              className="textarea-input"
              placeholder="Trabajos realizados..."
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>

          <div className="wallet-info">
            <span>Firmando como</span>
            <code>{shortAddress(address)}</code>
          </div>

          <button
            className="btn-primary full-width"
            disabled={!kmValido || Boolean(busy)}
            onClick={handleService}
          >
            {busy === 'Cargando service' ? 'Registrando...' : 'Registrar service'}
          </button>
        </section>
      ) : null}
    </div>
  )

  if (embedded) {
    return (
      <>
        {panels}
        {message ? <div className="status-bar">{message}</div> : null}
      </>
    )
  }

  return (
    <OperativeShell
      role="mecanico"
      title="Carga de service"
      description="Escaneá el QR del vehículo y registrá el mantenimiento sin tipear el VIN."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={message ? <div className="status-bar">{message}</div> : null}
    >
      {panels}
    </OperativeShell>
  )
}
