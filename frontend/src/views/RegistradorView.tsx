import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVehicleInfo, isValidVin, isValidWalletAddress } from '../domain/carpass/validators'
import { OperativeShell } from '../components/OperativeShell'

export function RegistradorView({
  address,
  wrongNetwork = false,
  embedded = false,
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
}) {
  const { busy, message, registrarVehiculo } = useCarPass()

  const [vin, setVin] = useState('8AJBA3CD4E1234567')
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)
  const propietarioValido = !propietario || isValidWalletAddress(propietario)
  const info: VehiculoInfo = { vin, marca, modelo, anio, color }
  const formularioValido = isValidVehicleInfo(info) && propietarioValido

  async function handleRegistrar() {
    await registrarVehiculo(info, propietario || address)
  }

  const panels = (
      <div className="panels-grid single">
        <section className="panel">
          <h3>Registrar vehiculo</h3>
          <p className="panel-desc">Alta del pasaporte digital en la blockchain. El primer service deberá superar 0 km.</p>

          <label className="field">
            VIN <span className="field-hint">17 caracteres</span>
            <input maxLength={17} value={vin} onChange={(e) => setVin(normalizeVin(e.target.value))} />
            {vin.length > 0 && (
              <span className={`vin-count ${isValidVin(vin) ? 'ok' : 'warn'}`}>{vin.length}/17</span>
            )}
          </label>

          <div className="two-col">
            <label className="field">Marca<input value={marca} onChange={(e) => setMarca(e.target.value)} /></label>
            <label className="field">Modelo<input value={modelo} onChange={(e) => setModelo(e.target.value)} /></label>
          </div>

          <div className="two-col">
            <label className="field">
              Año
              <input max="2099" min="1900" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            </label>
            <label className="field">Color<input value={color} onChange={(e) => setColor(e.target.value)} /></label>
          </div>

          <label className="field">
            Propietario
            <input placeholder={address} value={propietario} onChange={(e) => setPropietario(e.target.value)} />
          </label>
          {!propietarioValido && <p className="error-msg">Direccion invalida</p>}

          <button
            className="btn-primary full-width"
            disabled={!formularioValido || Boolean(busy)}
            onClick={handleRegistrar}
          >
            {busy === 'Registrando vehiculo' ? 'Registrando...' : 'Registrar vehiculo'}
          </button>
        </section>
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
      role="registrador"
      title="Panel de concesionaria"
      description="Registrá vehículos nuevos. Cada pasaporte se emite con kilometraje inicial 0 km."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={message ? <div className="status-bar">{message}</div> : null}
    >
      {panels}
    </OperativeShell>
  )
}
