import { useState } from 'react'
import { VehiclePassportQr } from './VehiclePassportQr'
import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVehicleInfo, isValidVin, isValidWalletAddress } from '../domain/carpass/validators'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'

type AdminManageVehiclesPanelProps = {
  address: string
}

export function AdminManageVehiclesPanel({ address }: AdminManageVehiclesPanelProps) {
  const { busy, message, registrarVehiculo } = useCarPass()

  const [vin, setVin] = useState('8AJBA3CD4E1234567')
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)
  const [pasaporteEmitido, setPasaporteEmitido] = useState<VehiculoInfo | null>(null)

  const propietarioValido = !propietario || isValidWalletAddress(propietario)
  const vehicleInfo: VehiculoInfo = { vin, marca, modelo, anio, color }
  const vehicleFormValido = isValidVehicleInfo(vehicleInfo) && propietarioValido

  async function handleRegistrar() {
    const ok = await registrarVehiculo(vehicleInfo, propietario || address)
    if (ok) setPasaporteEmitido({ ...vehicleInfo })
  }

  return (
    <>
      <div className="panels-grid single">
        <section className="panel panel--admin-form">
          <div className="panel-step">
            <span className="panel-step__num">1</span>
            <div>
              <h3>Registrar vehículo</h3>
              <p className="panel-desc">Emití el pasaporte digital vinculado al VIN en Sepolia con 0 km iniciales.</p>
            </div>
          </div>

          <label className="field">
            VIN <span className="field-hint">17 caracteres</span>
            <input maxLength={17} value={vin} onChange={(e) => setVin(normalizeVin(e.target.value))} />
            {vin.length > 0 ? (
              <span className={`vin-count ${isValidVin(vin) ? 'ok' : 'warn'}`}>{vin.length}/17</span>
            ) : null}
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
          {!propietarioValido ? <p className="error-msg">Dirección inválida</p> : null}

          <button
            className="btn-primary full-width"
            disabled={!vehicleFormValido || Boolean(busy)}
            onClick={handleRegistrar}
          >
            {busy === 'Registrando vehiculo' ? 'Registrando...' : 'Registrar vehículo'}
          </button>

          {pasaporteEmitido ? (
            <div className="registration-passport">
              <VehiclePassportQr
                vin={pasaporteEmitido.vin}
                marca={pasaporteEmitido.marca}
                modelo={pasaporteEmitido.modelo}
                anio={pasaporteEmitido.anio}
                color={pasaporteEmitido.color}
                connected
                role="registrador"
              />
            </div>
          ) : null}
        </section>
      </div>
      {message ? <div className="status-bar">{message}</div> : null}
    </>
  )
}
