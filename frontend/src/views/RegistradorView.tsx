import { useState } from 'react'
import { useCarPass } from '../hooks/useCarPass'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { tienePartesRegistradas, useVehicleParts } from '../hooks/useVehicleParts'
import { generateNumerosGrabado, generateVin, vehicleTokenIdFromVin } from '../domain/carpass/idGenerators'
import { normalizeVin } from '../domain/carpass/formatters'
import {
  isTransferWalletAddress,
  isValidVehicleInfo,
  isValidVin,
  normalizeWalletAddress,
} from '../domain/carpass/validators'
import { OperativeShell } from '../components/OperativeShell'
import { VehiclePassportQr } from '../components/VehiclePassportQr'
import { CarPassOperationNotice } from '../components/CarPassOperationNotice'
import { VehiclePartsOperationNotice } from '../components/VehiclePartsOperationNotice'
import { PendingPartsResult, PendingPartsRetry } from '../components/PendingPartsRecovery'
import { formatVehicleLookupError } from '../lib/vehicleLookup'

type WizardStatus = 'complete' | 'active' | 'pending' | 'blocked'

type WizardStep = {
  label: string
  detail: string
  status: WizardStatus
}

function statusText(status: WizardStatus) {
  if (status === 'complete') return 'Listo'
  if (status === 'active') return 'En curso'
  if (status === 'blocked') return 'Revisar'
  return 'Pendiente'
}

function RegistrationWizard({ steps }: { steps: WizardStep[] }) {
  return (
    <section className="registration-wizard" aria-label="Flujo de alta on-chain">
      <div className="registration-wizard__header">
        <div>
          <p className="registration-wizard__eyebrow">Emision blockchain guiada</p>
          <h3>Alta completa: NFT + autopartes + pasaporte</h3>
        </div>
        <span className="registration-wizard__badge">Sepolia</span>
      </div>
      <ol className="registration-wizard__steps">
        {steps.map((step, index) => (
          <li className={`registration-wizard__step registration-wizard__step--${step.status}`} key={step.label}>
            <span className="registration-wizard__index">{index + 1}</span>
            <span className="registration-wizard__copy">
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </span>
            <span className="registration-wizard__state">{statusText(step.status)}</span>
          </li>
        ))}
      </ol>
      <div className="registration-wizard__metrics" aria-label="Optimizaciones del flujo">
        <span>2 transacciones maximas</span>
        <span>TokenId local post-mint</span>
        <span>Preflight on-chain antes de firmar</span>
      </div>
    </section>
  )
}

export function RegistradorView({
  address,
  wrongNetwork = false,
  embedded = false,
  onViewPassport,
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
  onViewPassport?: (vin: string) => void
}) {
  const { busy, message, lastOp, registrarVehiculo, getVehiculoPorVin } = useCarPass()
  const {
    busy: partesBusy,
    message: partesMessage,
    lastOp: partesLastOp,
    registrarPartes,
  } = useVehicleParts()

  const [vin, setVin] = useState(generateVin)
  const [marca, setMarca] = useState('Toyota')
  const [modelo, setModelo] = useState('Corolla')
  const [anio, setAnio] = useState(2024)
  const [color, setColor] = useState('Blanco')
  const [propietario, setPropietario] = useState(address)
  const [pasaporteEmitido, setPasaporteEmitido] = useState<VehiculoInfo | null>(null)
  const [autopartesEmitidas, setAutopartesEmitidas] = useState<string[] | null>(null)
  const [partesPendientes, setPartesPendientes] = useState(false)

  const [vinPendiente, setVinPendiente] = useState('')
  const [buscandoPendiente, setBuscandoPendiente] = useState(false)
  const [pendienteError, setPendienteError] = useState('')
  const [pendienteInfo, setPendienteInfo] = useState<VehiculoInfo | null>(null)
  const [pendienteTokenId, setPendienteTokenId] = useState<bigint | null>(null)
  const [pendienteTienePartes, setPendienteTienePartes] = useState<boolean | null>(null)
  const [pendienteNumeros, setPendienteNumeros] = useState<string[] | null>(null)

  const partesRegistrando = partesBusy === 'Registrando autopartes'
  const partesStatusFailed = partesLastOp.failed

  const propietarioValido = !propietario.trim() || isTransferWalletAddress(propietario.trim())
  const info: VehiculoInfo = { vin, marca, modelo, anio, color }
  const formularioValido = isValidVehicleInfo(info) && propietarioValido
  const registrando = Boolean(busy) || Boolean(partesBusy)
  const vinPendienteValido = isValidVin(normalizeVin(vinPendiente))
  const ownerFinal = normalizeWalletAddress(propietario) ?? address
  const ownerPreview = propietario.trim() && !propietarioValido ? propietario.trim() : ownerFinal
  const ownerUsaWalletConectada = propietarioValido && ownerFinal.toLowerCase() === address.toLowerCase()

  const wizardSteps: WizardStep[] = [
    {
      label: 'Datos del vehiculo',
      detail: formularioValido ? 'VIN y dominio listos' : 'Completa marca, modelo, anio, color y owner',
      status: formularioValido ? 'complete' : 'blocked',
    },
    {
      label: 'Owner inicial',
      detail: ownerUsaWalletConectada ? 'Sale a tu wallet conectada' : 'Sale a wallet destino validada',
      status: propietarioValido ? 'complete' : 'blocked',
    },
    {
      label: 'NFT CarPass',
      detail: pasaporteEmitido ? 'Pasaporte minteado' : busy === 'Registrando vehiculo' ? 'Esperando confirmacion' : 'Listo para firmar',
      status: pasaporteEmitido ? 'complete' : busy === 'Registrando vehiculo' ? 'active' : 'pending',
    },
    {
      label: '6 autopartes',
      detail: autopartesEmitidas ? 'Grabado completo' : partesPendientes ? 'Reintento disponible' : partesBusy ? 'Registrando piezas' : 'Se encadena despues del mint',
      status: autopartesEmitidas ? 'complete' : partesPendientes ? 'blocked' : partesBusy ? 'active' : 'pending',
    },
    {
      label: 'Pasaporte publico',
      detail: autopartesEmitidas ? 'Disponible para consulta y QR' : 'Se habilita al cerrar autopartes',
      status: autopartesEmitidas ? 'complete' : 'pending',
    },
  ]

  async function grabarAutopartes(tokenId: bigint, vinDestino: string): Promise<string[] | null> {
    const numeros = generateNumerosGrabado(vinDestino)
    const partesOk = await registrarPartes(tokenId, numeros)
    if (!partesOk) return null

    if (pasaporteEmitido?.vin === vinDestino) {
      setAutopartesEmitidas(numeros)
      setPartesPendientes(false)
    }
    if (pendienteInfo?.vin === vinDestino) {
      setPendienteTienePartes(true)
      setPendienteNumeros(numeros)
    }

    return numeros
  }

  async function handleRegistrar() {
    const infoARegistrar = { ...info }
    const ok = await registrarVehiculo(infoARegistrar, ownerFinal)
    if (!ok) return

    setPasaporteEmitido(infoARegistrar)
    setAutopartesEmitidas(null)
    setPartesPendientes(false)

    const tokenId = vehicleTokenIdFromVin(infoARegistrar.vin)
    const numeros = await grabarAutopartes(tokenId, infoARegistrar.vin)
    if (numeros) {
      setVin(generateVin())
    } else {
      setPartesPendientes(true)
    }
  }

  async function handleReintentarPartes() {
    if (!pasaporteEmitido) return
    const tokenId = vehicleTokenIdFromVin(pasaporteEmitido.vin)
    const yaTiene = await tienePartesRegistradas(tokenId)
    if (yaTiene) {
      setPartesPendientes(false)
      setAutopartesEmitidas(generateNumerosGrabado(pasaporteEmitido.vin))
      return
    }
    const numeros = await grabarAutopartes(tokenId, pasaporteEmitido.vin)
    if (!numeros) setPartesPendientes(true)
  }

  async function handleBuscarPendiente() {
    const vinNorm = normalizeVin(vinPendiente)
    if (!isValidVin(vinNorm)) {
      setPendienteError('El VIN debe tener 17 caracteres')
      return
    }

    setBuscandoPendiente(true)
    setPendienteError('')
    setPendienteInfo(null)
    setPendienteTokenId(null)
    setPendienteTienePartes(null)
    setPendienteNumeros(null)

    try {
      const { tokenId, info: vehiculoInfo } = await getVehiculoPorVin(vinNorm)
      const tienePartes = await tienePartesRegistradas(tokenId)
      setPendienteInfo(vehiculoInfo)
      setPendienteTokenId(tokenId)
      setPendienteTienePartes(tienePartes)
    } catch (error) {
      setPendienteError(formatVehicleLookupError(vinNorm, error))
    } finally {
      setBuscandoPendiente(false)
    }
  }

  async function handleRegistrarPendiente() {
    if (!pendienteTokenId || !pendienteInfo || pendienteTienePartes) return
    const numeros = await grabarAutopartes(pendienteTokenId, pendienteInfo.vin)
    if (numeros) setPendienteTienePartes(true)
  }

  const panels = (
    <div className="registration-flow">
      <RegistrationWizard steps={wizardSteps} />

      <div className="panels-grid registration-layout">
        <section className="panel">
          <div className="panel-step">
            <span className="panel-step__num panel-step__num--registrador">1</span>
            <div>
              <h3>Registrar vehiculo</h3>
              <p className="panel-desc">
                Alta del pasaporte digital en la blockchain. El vehículo sale de la concesionaria con
                sus 6 autopartes grabadas ya asociadas (motor, caja de cambios, puertas delanteras,
                capot y baúl), generadas automáticamente. El primer service deberá superar 0 km.
              </p>
            </div>
          </div>

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
            <input placeholder={address} value={propietario} onChange={(e) => setPropietario(e.target.value.trim())} />
          </label>
          {!propietarioValido && <p className="error-msg">Direccion invalida</p>}
          <div className="registration-owner-strip">
            <span>{ownerUsaWalletConectada ? 'Owner: wallet conectada' : 'Owner: wallet destino'}</span>
            <code>{ownerPreview}</code>
          </div>

          <button
            className="btn-primary full-width"
            disabled={!formularioValido || registrando || wrongNetwork}
            onClick={() => void handleRegistrar()}
          >
            {busy === 'Registrando vehiculo'
              ? 'Registrando vehículo...'
              : partesBusy === 'Registrando autopartes'
                ? 'Grabando autopartes…'
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
                <>
                  <p className="panel-desc">
                    6 autopartes grabadas asociadas: {autopartesEmitidas.join(', ')}
                  </p>
                  {onViewPassport ? (
                    <button
                      type="button"
                      className="btn-secondary full-width"
                      onClick={() => onViewPassport(pasaporteEmitido.vin)}
                    >
                      Ver pasaporte público
                    </button>
                  ) : null}
                </>
              ) : partesPendientes ? (
                <PendingPartsRetry
                  info={pasaporteEmitido}
                  busy={partesRegistrando}
                  wrongNetwork={wrongNetwork}
                  statusMessage={partesMessage}
                  statusFailed={partesStatusFailed}
                  onRetry={() => void handleReintentarPartes()}
                />
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="panel panel--parts-recovery">
          <div className="panel-step">
            <span className="panel-step__num panel-step__num--registrador">2</span>
            <div>
              <h3>Completar autopartes pendientes</h3>
              <p className="panel-desc">
                Si un vehículo quedó registrado sin sus 6 autopartes (tx cancelada o falta de gas),
                buscalo por VIN y completá el grabado acá.
              </p>
            </div>
          </div>

          <label className="field">
            VIN del vehículo
            <div className="parts-recovery-search__row">
              <input
                className="parts-recovery-search__input"
                value={vinPendiente}
                onChange={(e) => {
                  setVinPendiente(e.target.value.toUpperCase())
                  setPendienteError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && void handleBuscarPendiente()}
                placeholder="17 caracteres"
                maxLength={17}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                className="parts-recovery-search__btn"
                disabled={!vinPendienteValido || buscandoPendiente || registrando}
                onClick={() => void handleBuscarPendiente()}
              >
                {buscandoPendiente ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </label>

          {pendienteError ? <p className="error-msg">{pendienteError}</p> : null}

          {pendienteInfo && pendienteTienePartes !== null ? (
            <PendingPartsResult
              info={pendienteInfo}
              tienePartes={pendienteTienePartes}
              busy={partesRegistrando}
              wrongNetwork={wrongNetwork}
              statusMessage={partesMessage}
              statusFailed={partesStatusFailed}
              registeredNumeros={pendienteNumeros}
              onRegister={() => void handleRegistrarPendiente()}
              onViewPassport={onViewPassport}
            />
          ) : null}
        </section>
      </div>
    </div>
  )

  const operationFooter = (
    <>
      <CarPassOperationNotice busy={busy} message={message} lastOp={lastOp} />
      <VehiclePartsOperationNotice busy={partesBusy} message={partesMessage} lastOp={partesLastOp} />
    </>
  )

  if (embedded) {
    return (
      <>
        {panels}
        {operationFooter}
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
      footer={operationFooter}
    >
      {panels}
    </OperativeShell>
  )
}
