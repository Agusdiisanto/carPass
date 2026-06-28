import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'

export function TallerView({ address }: { address: string }) {
  const { busy, message, agregarService, getVehiculoPorVin, getUltimoKm } = useCarPass()

  const [vin, setVin] = useState('')
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [lastKm, setLastKm] = useState(0)
  const [vinOk, setVinOk] = useState(false)
  const [vinError, setVinError] = useState('')

  const [km, setKm] = useState(0)
  const [tipo, setTipo] = useState('Service oficial')
  const [desc, setDesc] = useState('')

  const kmValido = km > lastKm

  async function buscarVehiculo() {
    if (vin.length !== 17) return
    setVinError('')
    setVinOk(false)
    try {
      const { tokenId: tid, info } = await getVehiculoPorVin(vin)
      if (!info.vin) {
        setVinError('Vehiculo no encontrado')
        return
      }
      const ultimo = await getUltimoKm(tid)
      setTokenId(tid)
      setLastKm(ultimo)
      setKm(ultimo + 1000)
      setVinOk(true)
    } catch {
      setVinError('No se pudo consultar el contrato')
    }
  }

  async function handleService() {
    if (!tokenId) return
    const ok = await agregarService(tokenId, km, tipo, desc || 'Service registrado')
    if (ok) {
      setLastKm(km)
      setKm(km + 1000)
      setDesc('')
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="role-badge taller">Taller</div>
        <h2>Carga de service</h2>
        <p className="view-desc">Registrá el mantenimiento de un vehículo. El kilometraje debe ser mayor al último registrado.</p>
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
                value={vin}
                onChange={(e) => { setVin(e.target.value.toUpperCase()); setVinOk(false) }}
                onKeyDown={(e) => e.key === 'Enter' && buscarVehiculo()}
              />
            </label>
            <button
              className="btn-secondary search-btn"
              disabled={vin.length !== 17}
              onClick={buscarVehiculo}
            >
              Buscar
            </button>
          </div>

          {vinError && <p className="error-msg">{vinError}</p>}

          {vinOk && (
            <div className="km-info-banner">
              Ultimo kilometraje registrado: <strong>{lastKm.toLocaleString('es-AR')} km</strong>
            </div>
          )}
        </section>

        {vinOk && (
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
              <span className="km-icon">{kmValido ? '✓' : '✗'}</span>
              <span>
                {kmValido
                  ? `${km.toLocaleString('es-AR')} km — valido`
                  : `${km.toLocaleString('es-AR')} km — debe superar ${lastKm.toLocaleString('es-AR')} km`}
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
