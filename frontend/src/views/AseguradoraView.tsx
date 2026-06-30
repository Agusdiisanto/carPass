import { useState } from 'react'
import { VehicleIdentifyPanel } from '../components/VehicleIdentifyPanel'
import { OperativeShell } from '../components/OperativeShell'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { shortAddress } from '../hooks/useWallet'

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
    <div className="operative-flow operative-flow--aseguradora">
      <VehicleIdentifyPanel lookup={lookup} accent="aseguradora" />

      {lookup.found ? (
        <section className="panel panel--operative">
          <div className="panel-step">
            <span className="panel-step__num">2</span>
            <div>
              <h3>Datos del siniestro</h3>
              <p className="panel-desc">Completá la declaración para dejar constancia on-chain.</p>
            </div>
          </div>

          <label className="field">
            Gravedad
            <select className="select-input" value={gravedad} onChange={(e) => setGravedad(Number(e.target.value))}>
              {GRAVEDAD_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            Descripción
            <textarea
              className="textarea-input"
              placeholder="Describí el siniestro en detalle..."
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>

          <label className="field">
            Costo estimado de reparación (en wei)
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
      role="aseguradora"
      title="Registro de siniestros"
      description="Escaneá el QR del pasaporte y declará el siniestro en segundos."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={message ? <div className="status-bar">{message}</div> : null}
    >
      {panels}
    </OperativeShell>
  )
}
