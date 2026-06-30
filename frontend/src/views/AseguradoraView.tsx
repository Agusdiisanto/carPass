import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { shortAddress } from '../hooks/useWallet'
import { isValidVin } from '../domain/carpass/validators'
import { OperativeShell } from '../components/OperativeShell'

const GRAVEDAD_OPTIONS = [
  { value: 0, label: 'Leve' },
  { value: 1, label: 'Moderado' },
  { value: 2, label: 'Grave' },
]

export function AseguradoraView({
  address,
  wrongNetwork = false,
  embedded = false,
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
}) {
  const { busy, message, agregarSiniestro } = useCarPass()
  const lookup = useVehicleLookup()

  const [gravedad, setGravedad] = useState(0)
  const [desc, setDesc] = useState('')
  const [reparado, setReparado] = useState(false)
  const [costo, setCosto] = useState(0)

  async function handleSiniestro() {
    if (!lookup.tokenId) return
    const ok = await agregarSiniestro(lookup.tokenId, gravedad, desc, reparado, costo)
    if (ok) {
      setDesc('')
      setCosto(0)
      setReparado(false)
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
          {lookup.found && <div className="km-info-banner">Vehiculo encontrado. Completa los datos del siniestro.</div>}
        </section>

        {lookup.found && (
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
                placeholder="Describi el siniestro en detalle..."
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
              El vehiculo ya fue reparado
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
      role="aseguradora"
      title="Registro de siniestros"
      description="Declaratoria de accidentes y daños sobre vehículos asegurados."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={message ? <div className="status-bar">{message}</div> : null}
    >
      {panels}
    </OperativeShell>
  )
}
