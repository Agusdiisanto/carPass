import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'

const RESULTADO_OPTIONS = [
  { value: 0, label: 'Aprobado' },
  { value: 1, label: 'Aprobado con observaciones' },
  { value: 2, label: 'Rechazado' },
]

export function InspectorVTVView({ address }: { address: string }) {
  const { busy, message, agregarVTV, getVehiculoPorVin } = useCarPass()

  const [vin, setVin] = useState('')
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [vinOk, setVinOk] = useState(false)
  const [vinError, setVinError] = useState('')

  const [resultado, setResultado] = useState(0)

  const today = new Date()
  const oneYearLater = new Date(today)
  oneYearLater.setFullYear(today.getFullYear() + 1)
  const [vencimiento, setVencimiento] = useState(oneYearLater.toISOString().split('T')[0])

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

  async function handleVTV() {
    if (!tokenId) return
    const vencTs = Math.floor(new Date(vencimiento).getTime() / 1000)
    const ok = await agregarVTV(tokenId, resultado, vencTs)
    if (ok) {
      setResultado(0)
      const next = new Date()
      next.setFullYear(next.getFullYear() + 1)
      setVencimiento(next.toISOString().split('T')[0])
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="role-badge inspector">Inspector VTV</div>
        <h2>Registro de revision VTV</h2>
        <p className="view-desc">Certificá el resultado de la inspección técnica vehicular.</p>
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
          {vinOk && <div className="km-info-banner">Vehiculo encontrado. Completá el resultado de la inspeccion.</div>}
        </section>

        {vinOk && (
          <section className="panel">
            <h3>Resultado de la inspeccion</h3>

            <label className="field">
              Resultado
              <select className="select-input" value={resultado} onChange={(e) => setResultado(Number(e.target.value))}>
                {RESULTADO_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              Fecha de vencimiento
              <input
                min={new Date().toISOString().split('T')[0]}
                type="date"
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value)}
              />
            </label>

            <div className="wallet-info">
              <span>Firmando como</span>
              <code>{shortAddress(address)}</code>
            </div>

            <button
              className="btn-primary full-width"
              disabled={Boolean(busy)}
              onClick={handleVTV}
            >
              {busy === 'Registrando VTV' ? 'Registrando...' : 'Registrar revision VTV'}
            </button>
          </section>
        )}
      </div>

      {message && <div className="status-bar">{message}</div>}
    </div>
  )
}
