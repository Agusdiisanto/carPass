import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { shortAddress } from '../hooks/useWallet'
import { isValidVin } from '../domain/carpass/validators'
import { OperativeShell } from '../components/OperativeShell'

const RESULTADO_OPTIONS = [
  { value: 0, label: 'Aprobado' },
  { value: 1, label: 'Aprobado con observaciones' },
  { value: 2, label: 'Rechazado' },
]

function defaultExpiryDate() {
  const next = new Date()
  next.setFullYear(next.getFullYear() + 1)
  return next.toISOString().split('T')[0]
}

export function InspectorVTVView({
  address,
  wrongNetwork = false,
  embedded = false,
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
}) {
  const { busy, message, agregarVTV } = useCarPass()
  const lookup = useVehicleLookup()

  const [resultado, setResultado] = useState(0)
  const [vencimiento, setVencimiento] = useState(defaultExpiryDate())

  async function handleVTV() {
    if (!lookup.tokenId) return
    const vencTs = Math.floor(new Date(vencimiento).getTime() / 1000)
    const ok = await agregarVTV(lookup.tokenId, resultado, vencTs)
    if (ok) {
      setResultado(0)
      setVencimiento(defaultExpiryDate())
    }
  }

  const panels = (
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
                onKeyDown={(e) => e.key === 'Enter' && lookup.search()}
              />
            </label>
            <button
              className="btn-secondary search-btn"
              disabled={!isValidVin(lookup.vin) || lookup.loading}
              onClick={() => lookup.search()}
            >
              {lookup.loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {lookup.error && <p className="error-msg">{lookup.error}</p>}
          {lookup.found && <div className="km-info-banner">Vehiculo encontrado. Completa el resultado de la inspeccion.</div>}
        </section>

        {lookup.found && (
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
      role="inspector"
      title="Registro de revisión VTV"
      description="Certificá el resultado de la inspección técnica vehicular."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={message ? <div className="status-bar">{message}</div> : null}
    >
      {panels}
    </OperativeShell>
  )
}
