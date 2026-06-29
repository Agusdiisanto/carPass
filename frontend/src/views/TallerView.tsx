import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { shortAddress } from '../hooks/useWallet'
import { formatKm } from '../domain/carpass/formatters'
import { isValidMileage, isValidVin } from '../domain/carpass/validators'

export function TallerView({ address }: { address: string }) {
  const { busy, message, agregarService } = useCarPass()
  const lookup = useVehicleLookup({ loadMileage: true })

  const [km, setKm] = useState(0)
  const [tipo, setTipo] = useState('Service oficial')
  const [desc, setDesc] = useState('')

  const kmValido = isValidMileage(km, lookup.lastKm)

  async function buscarVehiculo() {
    const result = await lookup.search()
    if (result) setKm(result.lastKm + 1000)
  }

  async function handleService() {
    if (!lookup.tokenId) return
    const ok = await agregarService(lookup.tokenId, km, tipo, desc || 'Service registrado')
    if (ok) {
      lookup.setLastKm(km)
      setKm(km + 1000)
      setDesc('')
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="role-badge taller">Taller</div>
        <h2>Carga de service</h2>
        <p className="view-desc">Registra el mantenimiento de un vehiculo. El kilometraje debe ser mayor al ultimo registrado.</p>
      </div>

      <div className="panels-grid single">
        <section className="panel">
          <h3>Identificar vehiculo</h3>

          <div className="search-inline">
            <label className="field" style={{ flex: 1 }}>
              VIN del vehiculo
              <input
                maxLength={17}
                placeholder="17 caracteres"
                value={lookup.vin}
                onChange={(e) => lookup.setVin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarVehiculo()}
              />
            </label>
            <button
              className="btn-secondary search-btn"
              disabled={!isValidVin(lookup.vin) || lookup.loading}
              onClick={buscarVehiculo}
            >
              {lookup.loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {lookup.error && <p className="error-msg">{lookup.error}</p>}

          {lookup.found && (
            <div className="km-info-banner">
              Ultimo kilometraje registrado: <strong>{formatKm(lookup.lastKm)}</strong>
            </div>
          )}
        </section>

        {lookup.found && (
          <section className="panel">
            <h3>Datos del service</h3>

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
                  ? `${formatKm(km)} - valido`
                  : `${formatKm(km)} - debe superar ${formatKm(lookup.lastKm)}`}
              </span>
            </div>

            <label className="field">
              Descripcion <span className="field-hint">opcional</span>
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
        )}
      </div>

      {message && <div className="status-bar">{message}</div>}
    </div>
  )
}
