import { useEffect, useState } from 'react'
import { VehicleIdentifyPanel } from '../components/VehicleIdentifyPanel'
import { OperativeShell } from '../components/OperativeShell'
import { CarPassOperationNotice } from '../components/CarPassOperationNotice'
import { VehiclePartsOperationNotice } from '../components/VehiclePartsOperationNotice'
import { StepPipeline, type PipelineStep, type PipelineStepStatus } from '../components/StepPipeline'
import { formatKm } from '../domain/carpass/formatters'
import { generateNumeroGrabado } from '../domain/carpass/idGenerators'
import { isValidMileage } from '../domain/carpass/validators'
import { TIPOS_PARTE, tipoParteLabel } from '../domain/carpass/vehicleParts'
import { useCarPass } from '../hooks/useCarPass'
import { useVehicleLookup } from '../hooks/useVehicleLookup'
import { tienePartesRegistradas, useVehicleParts } from '../hooks/useVehicleParts'
import { shortAddress } from '../hooks/useWallet'

export function TallerView({
  address,
  wrongNetwork = false,
  embedded = false,
  receivedVin = '',
}: {
  address: string
  wrongNetwork?: boolean
  embedded?: boolean
  receivedVin?: string
}) {
  const { busy, message, lastOp, agregarService } = useCarPass()
  const lookup = useVehicleLookup({ loadMileage: true })
  const { busy: parteBusy, message: parteMessage, lastOp: parteLastOp, reemplazarParte } = useVehicleParts()

  const [km, setKm] = useState(0)
  const [tipo, setTipo] = useState('Service oficial')
  const [desc, setDesc] = useState('')
  const [cambioAutoparte, setCambioAutoparte] = useState(false)
  const [tipoParte, setTipoParte] = useState(0)
  const [nuevoNumeroGrabado, setNuevoNumeroGrabado] = useState(() => generateNumeroGrabado(0))
  const [partesInstaladas, setPartesInstaladas] = useState<boolean | null>(null)
  const [chequeandoPartes, setChequeandoPartes] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<PipelineStepStatus>('pending')
  const [parteStatus, setParteStatus] = useState<PipelineStepStatus>('pending')

  useEffect(() => {
    if (!lookup.tokenId || !lookup.found) {
      setPartesInstaladas(null)
      setServiceStatus('pending')
      setParteStatus('pending')
      return
    }

    let cancelled = false
    setChequeandoPartes(true)
    tienePartesRegistradas(lookup.tokenId)
      .then((ok) => { if (!cancelled) setPartesInstaladas(ok) })
      .catch(() => { if (!cancelled) setPartesInstaladas(false) })
      .finally(() => { if (!cancelled) setChequeandoPartes(false) })

    return () => { cancelled = true }
  }, [lookup.tokenId, lookup.found, parteMessage])

  useEffect(() => {
    if (partesInstaladas !== true) setCambioAutoparte(false)
  }, [partesInstaladas])

  const kmValido = isValidMileage(km, lookup.lastKm)
  const numeroGrabadoValido = nuevoNumeroGrabado.trim().length > 0
  const puedeCambiarAutoparte = partesInstaladas === true
  const cambioAutoparteListo = !cambioAutoparte || numeroGrabadoValido
  const incluyeParteEnPipeline = cambioAutoparte || parteStatus !== 'pending'

  const pipelineSteps: PipelineStep[] = [
    {
      label: 'Registrar service',
      description: 'Se guarda el kilometraje y el detalle del mantenimiento en la blockchain.',
      status: serviceStatus,
    },
    ...(incluyeParteEnPipeline
      ? [
          {
            label: 'Reemplazar autoparte',
            description: 'Se graba el nuevo número de la pieza cambiada.',
            status: parteStatus,
          },
        ]
      : []),
  ]

  function handleTipoParteChange(nuevoTipo: number) {
    setTipoParte(nuevoTipo)
    setNuevoNumeroGrabado(generateNumeroGrabado(nuevoTipo))
  }

  async function handleService() {
    if (!lookup.tokenId) return

    const conCambioAutoparte = cambioAutoparte
    setServiceStatus('active')
    setParteStatus('pending')

    const descripcion = conCambioAutoparte
      ? `${desc || 'Service registrado'} Autoparte reemplazada: ${tipoParteLabel(tipoParte)} (${nuevoNumeroGrabado}).`
      : desc || 'Service registrado'

    const ok = await agregarService(lookup.tokenId, km, tipo, descripcion)
    if (!ok) {
      setServiceStatus('error')
      return
    }
    setServiceStatus('done')

    lookup.setLastKm(km)
    setKm(km + 1000)
    setDesc('')

    if (conCambioAutoparte) {
      setParteStatus('active')
      const parteOk = await reemplazarParte(lookup.tokenId, tipoParte, nuevoNumeroGrabado)
      if (parteOk) {
        setParteStatus('done')
        setNuevoNumeroGrabado(generateNumeroGrabado(tipoParte))
        setCambioAutoparte(false)
      } else {
        setParteStatus('error')
      }
    }
  }

  const panels = (
    <div className="operative-flow operative-flow--taller">
      <VehicleIdentifyPanel
        lookup={lookup}
        accent="taller"
        showMileage
        receivedVin={receivedVin}
        onIdentified={(result) => setKm(result.lastKm + 1000)}
      />

      {lookup.found ? (
        <section className="panel panel--operative">
          <div className="panel-step">
            <span className="panel-step__num">2</span>
            <div>
              <h3>Datos del service</h3>
              <p className="panel-desc">El kilometraje debe superar el último registrado on-chain.</p>
            </div>
          </div>

          <StepPipeline steps={pipelineSteps} />

          <label className="field">
            Tipo de service
            <input value={tipo} onChange={(e) => setTipo(e.target.value)} />
          </label>

          <label className="field">
            Kilometraje actual
            <input
              min="0"
              step="500"
              type="number"
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
            />
          </label>

          <input
            aria-label="Kilometraje"
            className="km-slider"
            max="300000"
            min="0"
            step="500"
            type="range"
            value={km}
            onChange={(e) => setKm(Number(e.target.value))}
          />

          <div className={`km-validation ${kmValido ? 'valid' : 'invalid'}`}>
            <span className="km-icon">{kmValido ? 'OK' : 'X'}</span>
            <span>
              {kmValido
                ? `${formatKm(km)} - válido`
                : `${formatKm(km)} - debe superar ${formatKm(lookup.lastKm)}`}
            </span>
          </div>

          <label className="field">
            Descripción <span className="field-hint">opcional</span>
            <textarea
              className="textarea-input"
              placeholder="Trabajos realizados..."
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>

          <label className="field checkbox-field">
            <input
              checked={cambioAutoparte}
              disabled={!puedeCambiarAutoparte}
              type="checkbox"
              onChange={(e) => setCambioAutoparte(e.target.checked)}
            />
            Se cambió una autoparte grabada en este service
          </label>

          {chequeandoPartes ? (
            <p className="panel-desc">Verificando autopartes del vehículo...</p>
          ) : !puedeCambiarAutoparte ? (
            <p className="error-msg">
              Este vehículo aún no tiene las 6 autopartes registradas. Pedile a la concesionaria que
              complete el grabado antes de reemplazar piezas.
            </p>
          ) : cambioAutoparte ? (
            <>
              <label className="field">
                Autoparte
                <select
                  className="select-input"
                  value={tipoParte}
                  onChange={(e) => handleTipoParteChange(Number(e.target.value))}
                >
                  {TIPOS_PARTE.map((parteTipo) => (
                    <option key={parteTipo.value} value={parteTipo.value}>
                      {parteTipo.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Nuevo número de grabado <span className="field-hint">generado automáticamente</span>
                <input readOnly value={nuevoNumeroGrabado} />
              </label>
              <button
                type="button"
                className="btn-secondary full-width"
                onClick={() => setNuevoNumeroGrabado(generateNumeroGrabado(tipoParte))}
              >
                Regenerar número
              </button>
            </>
          ) : null}

          <div className="wallet-info">
            <span>Firmando como</span>
            <code>{shortAddress(address)}</code>
          </div>

          <button
            className="btn-primary full-width"
            disabled={!kmValido || !cambioAutoparteListo || Boolean(busy) || Boolean(parteBusy)}
            onClick={() => void handleService()}
          >
            {busy === 'Cargando service'
              ? 'Registrando...'
              : parteBusy === 'Reemplazando autoparte'
                ? 'Reemplazando autoparte...'
                : 'Registrar service'}
          </button>
        </section>
      ) : null}
    </div>
  )

  const operationFooter = (
    <>
      <CarPassOperationNotice busy={busy} message={message} lastOp={lastOp} />
      <VehiclePartsOperationNotice busy={parteBusy} message={parteMessage} lastOp={parteLastOp} />
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
      role="mecanico"
      title="Carga de service"
      description="Escaneá el QR del vehículo y registrá el mantenimiento sin tipear el VIN."
      address={address}
      wrongNetwork={wrongNetwork}
      footer={operationFooter}
    >
      {panels}
    </OperativeShell>
  )
}
