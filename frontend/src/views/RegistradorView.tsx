import { useState } from 'react'
import { isAddress } from 'ethers'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'

export function RegistradorView({ address }: { address: string }) {
  const { busy, message, registrarVehiculo } = useCarPass()

  const [vin, setVin] = useState('8AJBA3CD4E1234567')
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)
  const propietarioValido = !propietario || isAddress(propietario)

  async function handleRegistrar() {
    const info: VehiculoInfo = { vin, marca, modelo, anio, color }
    await registrarVehiculo(info, propietario || address)
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="role-badge registrador">Concesionaria</div>
        <h2>Panel de concesionaria</h2>
        <p className="view-desc">Registrá vehículos nuevos. Cada pasaporte se emite con kilometraje inicial 0 km.</p>
      </div>

      <div className="panels-grid single">
        <section className="panel">
          <h3>Registrar vehiculo</h3>
          <p className="panel-desc">Alta del pasaporte digital en la blockchain. El primer service deberá superar 0 km.</p>

          <label className="field">
            VIN <span className="field-hint">17 caracteres</span>
            <input maxLength={17} value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} />
            {vin.length > 0 && (
              <span className={`vin-count ${vin.length === 17 ? 'ok' : 'warn'}`}>{vin.length}/17</span>
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
            disabled={vin.length !== 17 || !propietarioValido || Boolean(busy)}
            onClick={handleRegistrar}
          >
            {busy === 'Registrando vehiculo' ? 'Registrando...' : 'Registrar vehiculo'}
          </button>
        </section>
      </div>

      {message && <div className="status-bar">{message}</div>}
    </div>
  )
}
