import { useState } from 'react'
import { VehicleIdentifyPanel } from '../components/VehicleIdentifyPanel'
import { OperativeShell } from '../components/OperativeShell'
import { CarPassOperationNotice } from '../components/CarPassOperationNotice'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { shortAddress } from '../hooks/useWallet'

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
  const { busy, message, lastOp, agregarVTV } = useCarPass()
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
    <div className="operative-flow operative-flow--inspector">
      <VehicleIdentifyPanel lookup={lookup} accent="inspector" />

      {lookup.found ? (
        <section className="panel panel--operative">
          <div className="panel-step">
            <span className="panel-step__num">2</span>
            <div>
              <h3>Resultado de la inspección</h3>
              <p className="panel-desc">Registrá el outcome y la fecha de vencimiento de la VTV.</p>
            </div>
          </div>

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
            {busy === 'Registrando VTV' ? 'Registrando...' : 'Registrar revisión VTV'}
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
      role="inspector"
      title="Registro de revisión VTV"
      description="Escaneá el QR en la línea de inspección y certificá sin escribir el VIN."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={<CarPassOperationNotice busy={busy} message={message} lastOp={lastOp} />}
    >
      {panels}
    </OperativeShell>
  )
}
