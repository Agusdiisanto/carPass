import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { useVehicleParts } from '../hooks/useVehicleParts'
import { generateNumerosGrabado, generateVin } from '../domain/carpass/idGenerators'
import { isValidVehicleInfo, isValidWalletAddress } from '../domain/carpass/validators'
import { OperativeShell } from '../components/OperativeShell'
import { VehiclePassportQr } from '../components/VehiclePassportQr'
import { CarPassOperationNotice } from '../components/CarPassOperationNotice'

export function RegistradorView({
  address,
  wrongNetwork = false,
  embedded = false,
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
}) {
  const { busy, message, lastOp, registrarVehiculo, getVehiculoPorVin } = useCarPass()
  const { busy: partesBusy, message: partesMessage, registrarPartes } = useVehicleParts()

  const [vin, setVin] = useState(generateVin)
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)
  const [pasaporteEmitido, setPasaporteEmitido] = useState<VehiculoInfo | null>(null)
  const [autopartesEmitidas, setAutopartesEmitidas] = useState<string[] | null>(null)
  const propietarioValido = !propietario || isValidWalletAddress(propietario)
  const info: VehiculoInfo = { vin, marca, modelo, anio, color }
  const formularioValido = isValidVehicleInfo(info) && propietarioValido
  const registrando = Boolean(busy) || Boolean(partesBusy)

  async function handleRegistrar() {
    const infoARegistrar = { ...info }
    const ok = await registrarVehiculo(infoARegistrar, propietario || address)
    if (!ok) return

    setPasaporteEmitido(infoARegistrar)
    setAutopartesEmitidas(null)
    setVin(generateVin())

    // El vehiculo sale de la concesionaria con sus 6 autopartes ya grabadas, sin pasos manuales.
    const { tokenId } = await getVehiculoPorVin(infoARegistrar.vin)
    const numeros = generateNumerosGrabado()
    const partesOk = await registrarPartes(tokenId, numeros)
    if (partesOk) setAutopartesEmitidas(numeros)
  }

  const panels = (
      <div className="panels-grid single">
        <section className="panel">
          <h3>Registrar vehiculo</h3>
          <p className="panel-desc">
            Alta del pasaporte digital en la blockchain. El vehículo sale de la concesionaria con
            sus 6 autopartes grabadas ya asociadas (motor, caja de cambios, puertas delanteras,
            capot y baúl), generadas automáticamente. El primer service deberá superar 0 km.
          </p>

          <label className="field">
            VIN <span className="field-hint">generado automáticamente, 17 caracteres</span>
            <input readOnly value={vin} />
          </label>
          <button className="btn-secondary full-width" disabled={registrando} onClick={() => setVin(generateVin())}>
            Generar nuevo VIN
          </button>

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
            disabled={!formularioValido || registrando}
            onClick={handleRegistrar}
          >
            {busy === 'Registrando vehiculo'
              ? 'Registrando vehículo...'
              : partesBusy === 'Registrando autopartes'
                ? 'Grabando autopartes...'
                : 'Registrar vehiculo'}
          </button>

          {partesMessage ? <p className="panel-desc">{partesMessage}</p> : null}

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
              {autopartesEmitidas ? (
                <p className="panel-desc">
                  6 autopartes grabadas asociadas: {autopartesEmitidas.join(', ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
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
      role="registrador"
      title="Panel de concesionaria"
      description="Registrá vehículos nuevos. Cada pasaporte se emite con kilometraje inicial 0 km."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={<CarPassOperationNotice busy={busy} message={message} lastOp={lastOp} />}
    >
      {panels}
    </OperativeShell>
  )
}
