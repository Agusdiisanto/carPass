import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'

const GRAVEDAD_OPTIONS = [
  { value: 0, label: 'Leve' },
  { value: 1, label: 'Moderado' },
  { value: 2, label: 'Grave' },
]

export function AseguradoraView({ address }: { address: string }) {
  const { busy, message, agregarSiniestro, getVehiculoPorVin } = useCarPass()

  const [vin, setVin] = useState('')
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [vinOk, setVinOk] = useState(false)
  const [vinError, setVinError] = useState('')

  const [gravedad, setGravedad] = useState(0)
  const [desc, setDesc] = useState('')
  const [reparado, setReparado] = useState(false)
  const [costo, setCosto] = useState(0)

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
      setTokenId(tid)
      setVinOk(true)
    } catch {
      setVinError('No se pudo consultar el contrato')
    }
  }

  async function handleSiniestro() {
    if (!tokenId) return
    const ok = await agregarSiniestro(tokenId, gravedad, desc, reparado, costo)
    if (ok) {
      setDesc('')
      setCosto(0)
      setReparado(false)
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="role-badge aseguradora">Aseguradora</div>
        <h2>Registro de siniestros</h2>
        <p className="view-desc">Declaratoria de accidentes y daños sobre vehículos asegurados.</p>
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
          {vinOk && <div className="km-info-banner">Vehiculo encontrado. Completá los datos del siniestro.</div>}
        </section>

        {vinOk && (
          <section className="panel">
            <h3>Datos del siniestro</h3>

            <label className="field">
              Gravedad
              <select className="select-input" value={gravedad} onChange={(e) => setGravedad(Number(e.target.value))}>
                {GRAVEDAD_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Descripcion
              <textarea
                className="textarea-input"
                placeholder="Describí el siniestro en detalle..."
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </label>

            <label className="field">
              Costo estimado de reparacion (en wei)
              <input min="0" type="number" value={costo} onChange={(e) => setCosto(Number(e.target.value))} />
            </label>

            <label className="field checkbox-field">
              <input checked={reparado} type="checkbox" onChange={(e) => setReparado(e.target.checked)} />
              El vehículo ya fue reparado
            </label>

            <div className="wallet-info">
              <span>Firmando como</span>
              <code>{shortAddress(address)}</code>
            </div>

            <button
              className="btn-primary full-width"
              disabled={!desc || Boolean(busy)}
              onClick={handleSiniestro}
            >
              {busy === 'Registrando siniestro' ? 'Registrando...' : 'Declarar siniestro'}
            </button>
          </section>
        )}
      </div>

      {message && <div className="status-bar">{message}</div>}
    </div>
  )
}
