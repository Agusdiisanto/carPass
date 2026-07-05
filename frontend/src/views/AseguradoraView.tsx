import { useState } from 'react'
import { VehicleIdentifyPanel } from '../components/VehicleIdentifyPanel'
import { OperativeShell } from '../components/OperativeShell'
import { CarPassOperationNotice } from '../components/CarPassOperationNotice'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { shortAddress } from '../hooks/useWallet'
import { TIPOS_PARTE, tipoParteLabel } from '../domain/carpass/vehicleParts'

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
  const { busy, message, lastOp, agregarSiniestro } = useCarPass()
  const lookup = useVehicleLookup()

  const [gravedad, setGravedad] = useState(0)
  const [desc, setDesc] = useState('')
  const [autoparteAfectada, setAutoparteAfectada] = useState(false)
  const [tipoParteAfectada, setTipoParteAfectada] = useState(0)
  const [costo, setCosto] = useState(0)

  async function handleSiniestro() {
    if (!lookup.tokenId) return
    const descripcion = autoparteAfectada
      ? `Autoparte afectada: ${tipoParteLabel(tipoParteAfectada)}. ${desc}`.trim()
      : desc
    // La reparacion la confirma el taller (VehicleParts.reemplazarParte), no la aseguradora al declarar.
    const ok = await agregarSiniestro(lookup.tokenId, gravedad, descripcion, false, costo)
    if (ok) {
      setDesc('')
      setCosto(0)
      setAutoparteAfectada(false)
      setTipoParteAfectada(0)
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
            <input
              checked={autoparteAfectada}
              type="checkbox"
              onChange={(e) => setAutoparteAfectada(e.target.checked)}
            />
            Se vio afectada una autoparte grabada
          </label>

          {autoparteAfectada ? (
            <label className="field">
              Autoparte afectada
              <select
                className="select-input"
                value={tipoParteAfectada}
                onChange={(e) => setTipoParteAfectada(Number(e.target.value))}
              >
                {TIPOS_PARTE.map((parteTipo) => (
                  <option key={parteTipo.value} value={parteTipo.value}>
                    {parteTipo.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="panel-desc">
            La reparación y el reemplazo de autopartes los confirma el taller en su propio registro.
          </p>

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
        <CarPassOperationNotice busy={busy} message={message} lastOp={lastOp} />
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
      footer={<CarPassOperationNotice busy={busy} message={message} lastOp={lastOp} />}
    >
      {panels}
    </OperativeShell>
  )
}
