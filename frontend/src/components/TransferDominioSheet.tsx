import { useCallback, useEffect, useState } from 'react'
import { normalizeVin, safeUpperCase } from '../domain/carpass/formatters'
import { isTransferWalletAddress, normalizeWalletAddress } from '../domain/carpass/validators'
import type { MiVehiculo } from '../hooks/useMisVehiculos'
import type { TransferenciaVehiculo } from '../hooks/useCarPass'
import { CONTRACT_ADDRESS, useCarPass } from '../hooks/useCarPass'
import { getPartesFleetStatus, type PartesFleetStatus } from '../hooks/useVehiclePartsStatus'
import { shortAddress } from '../hooks/useWallet'
import { BrandLogo } from './BrandLogo'
import { CarPassOperationNotice } from './CarPassOperationNotice'
import { useVehicleMedia } from '../hooks/useVehicleMedia'
import { subscribeFleetTransferUpdates } from '../lib/fleetRead'
import { subscribeVehicleChainUpdates } from '../lib/vehicleChainRefresh'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

type TransferStep = 'form' | 'confirm' | 'done'

type TransferDominioSheetProps = {
  vehicle: MiVehiculo
  walletAddress: string
  wrongNetwork?: boolean
  onClose: () => void
  onTransferred?: () => void
  onViewPassport?: (vin: string) => void
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function partesStatusLabel(status: PartesFleetStatus): string {
  if (status === 'complete') return '6 autopartes grabadas incluidas'
  if (status === 'pending') return 'Autopartes pendientes — el historial técnico queda incompleto'
  if (status === 'loading') return 'Verificando autopartes...'
  return 'Estado de autopartes no disponible'
}

export function TransferDominioSheet({
  vehicle,
  walletAddress,
  wrongNetwork = false,
  onClose,
  onTransferred,
  onViewPassport,
}: TransferDominioSheetProps) {
  const { busy, message, lastOp, getPropietario, getTransferenciasVehiculo, transferirVehiculo } = useCarPass()
  const [owner, setOwner] = useState<string | null>(null)
  const [loadingOwner, setLoadingOwner] = useState(true)
  const [ownerError, setOwnerError] = useState('')
  const [transferencias, setTransferencias] = useState<TransferenciaVehiculo[]>([])
  const [destinatario, setDestinatario] = useState('')
  const [destinatarioConfirmado, setDestinatarioConfirmado] = useState('')
  const [partesStatus, setPartesStatus] = useState<PartesFleetStatus>('loading')
  const [step, setStep] = useState<TransferStep>('form')
  const [showHistory, setShowHistory] = useState(false)

  const { info } = vehicle
  const media = useVehicleMedia({
    vin: info.vin,
    marca: info.marca,
    modelo: info.modelo,
    anio: info.anio,
  })

  const destinatarioValido = isTransferWalletAddress(destinatario)
  const destinatarioNormalizado = destinatarioValido ? normalizeWalletAddress(destinatario) : null
  const destinatarioPropio = destinatario.toLowerCase() === walletAddress.toLowerCase()
  const walletEsPropietaria = owner?.toLowerCase() === walletAddress.toLowerCase()
  const puedeContinuar = Boolean(
    walletEsPropietaria &&
      destinatarioValido &&
      !destinatarioPropio &&
      !wrongNetwork &&
      !busy &&
      !loadingOwner,
  )

  const loadPartesStatus = useCallback(async () => {
    setPartesStatus('loading')
    const status = await getPartesFleetStatus(vehicle.tokenId)
    setPartesStatus(status)
  }, [vehicle.tokenId])

  const loadOwner = useCallback(async () => {
    setLoadingOwner(true)
    setOwnerError('')
    try {
      const [currentOwner, historial] = await Promise.all([
        getPropietario(vehicle.tokenId),
        getTransferenciasVehiculo(vehicle.tokenId).catch(() => []),
      ])
      setOwner(currentOwner)
      setTransferencias(historial)
      if (currentOwner.toLowerCase() !== walletAddress.toLowerCase()) {
        setOwnerError('Tu wallet no es la propietaria actual de este pasaporte.')
      }
    } catch {
      setOwner(null)
      setOwnerError('No se pudo verificar el titular on-chain.')
    } finally {
      setLoadingOwner(false)
    }
  }, [getPropietario, getTransferenciasVehiculo, vehicle.tokenId, walletAddress])

  useEffect(() => {
    void loadOwner()
    void loadPartesStatus()
  }, [loadOwner, loadPartesStatus])

  useEffect(() => {
    return subscribeVehicleChainUpdates(({ vin, reason }) => {
      if (normalizeVin(vin) !== normalizeVin(info.vin)) return
      if (reason === 'autopartes' || reason === 'transfer') {
        void loadPartesStatus()
        if (reason === 'transfer') void loadOwner()
      }
    })
  }, [info.vin, loadOwner, loadPartesStatus])

  useEffect(() => {
    return subscribeFleetTransferUpdates(CONTRACT_ADDRESS, walletAddress, (updates) => {
      const touchesCurrentVehicle = updates.some((update) => update.tokenId === vehicle.tokenId)
      if (!touchesCurrentVehicle) return
      void loadOwner()
      onTransferred?.()
    })
  }, [loadOwner, onTransferred, vehicle.tokenId, walletAddress])

  async function handleTransferir() {
    if (!owner || !walletEsPropietaria || !destinatarioNormalizado) return
    const ok = await transferirVehiculo(
      walletAddress,
      destinatarioNormalizado,
      vehicle.tokenId,
      normalizeVin(info.vin),
    )
    if (!ok) return
    setDestinatarioConfirmado(destinatarioNormalizado)
    setStep('done')
    onTransferred?.()
  }

  return (
    <div className="transfer-sheet-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="transfer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="transfer-sheet__head">
          <div>
            <p className="transfer-sheet__eyebrow">Cambio de dominio</p>
            <h2 id="transfer-sheet-title" className="transfer-sheet__title">
              Transferir pasaporte
            </h2>
          </div>
          <button type="button" className="transfer-sheet__close" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </header>

        <div className="transfer-sheet__hero">
          <div
            className="transfer-sheet__hero-bg"
            style={media.imageUrl ? { backgroundImage: `url(${media.imageUrl})` } : undefined}
            aria-hidden
          />
          <div className="transfer-sheet__hero-overlay" aria-hidden />
          <div className="transfer-sheet__hero-body">
            <BrandLogo marca={info.marca} size="sm" />
            <p className="transfer-sheet__brand">{safeUpperCase(info.marca)}</p>
            <h3 className="transfer-sheet__model">{info.modelo}</h3>
            <p className="transfer-sheet__meta">
              {String(info.anio)} · {info.color}
            </p>
            <code className="transfer-sheet__vin">{info.vin}</code>
          </div>
        </div>

        {step === 'done' ? (
          <div className="transfer-sheet__done">
            <p className="transfer-sheet__done-title">Transferencia confirmada</p>
            <p className="transfer-sheet__done-text">
              El dominio CarPass pasó a <code>{shortAddress(destinatarioConfirmado || destinatario)}</code>.
              El comprador lo verá en su garaje al conectar la wallet en Sepolia.
            </p>
            {partesStatus === 'complete' ? (
              <p className="transfer-sheet__parts-note transfer-sheet__parts-note--ok">
                Las 6 autopartes grabadas siguen vinculadas al pasaporte y viajan con el historial técnico.
              </p>
            ) : partesStatus === 'pending' ? (
              <p className="transfer-sheet__parts-note transfer-sheet__parts-note--warn">
                Este vehículo aún no tiene autopartes registradas. El comprador deberá pedir a la concesionaria que complete el grabado.
              </p>
            ) : null}
            <div className="transfer-sheet__done-actions">
              {onViewPassport ? (
                <button
                  type="button"
                  className="transfer-sheet__btn transfer-sheet__btn--ghost full-width"
                  onClick={() => onViewPassport(normalizeVin(info.vin))}
                >
                  Ver pasaporte público
                </button>
              ) : null}
              <button type="button" className="transfer-sheet__btn transfer-sheet__btn--primary full-width" onClick={onClose}>
                Volver a mis vehículos
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="transfer-sheet__status">
              {loadingOwner ? (
                <span className="transfer-sheet__pill transfer-sheet__pill--loading">Verificando titular...</span>
              ) : walletEsPropietaria ? (
                <span className="transfer-sheet__pill transfer-sheet__pill--ok">Autorizado para transferir</span>
              ) : (
                <span className="transfer-sheet__pill transfer-sheet__pill--warn">Solo lectura</span>
              )}
              {owner ? (
                <span className="transfer-sheet__owner">
                  Titular: <code>{shortAddress(owner)}</code>
                </span>
              ) : null}
            </div>

            <div
              className={`transfer-sheet__parts-banner transfer-sheet__parts-banner--${
                partesStatus === 'complete' ? 'ok' : partesStatus === 'pending' ? 'warn' : 'muted'
              }`}
            >
              {partesStatusLabel(partesStatus)}
            </div>

            {ownerError ? <p className="error-msg">{ownerError}</p> : null}
            {wrongNetwork ? (
              <p className="error-msg">Cambiá a Sepolia en MetaMask para firmar la transferencia.</p>
            ) : null}

            {step === 'form' ? (
              <div className="transfer-sheet__form">
                <label className="field">
                  Wallet del comprador
                  <input
                    placeholder="0x..."
                    value={destinatario}
                    disabled={!walletEsPropietaria || loadingOwner}
                    onChange={(event) => setDestinatario(event.target.value.trim())}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                {destinatario && !destinatarioValido ? (
                  <p className="error-msg">
                    {destinatario.startsWith('0x') && destinatario.length >= 42
                      ? 'No podés transferir a la dirección cero'
                      : 'Dirección inválida'}
                  </p>
                ) : null}
                {destinatario && destinatarioValido && destinatarioPropio ? (
                  <p className="error-msg">No podés transferirte a vos mismo</p>
                ) : null}

                <button
                  type="button"
                  className="transfer-sheet__btn transfer-sheet__btn--primary full-width"
                  disabled={!puedeContinuar}
                  onClick={() => setStep('confirm')}
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="transfer-sheet__confirm">
                <p className="transfer-sheet__confirm-text">
                  Vas a transferir el NFT de <strong>{info.marca} {info.modelo}</strong> a{' '}
                  <code>{shortAddress(destinatarioNormalizado ?? destinatario)}</code>.
                  Esta acción es irreversible desde CarPass.
                </p>
                {partesStatus === 'complete' ? (
                  <p className="transfer-sheet__confirm-note">
                    Incluye el historial técnico y las 6 autopartes grabadas asociadas al VIN.
                  </p>
                ) : null}
                <div className="transfer-sheet__confirm-actions">
                  <button
                    type="button"
                    className="transfer-sheet__btn transfer-sheet__btn--danger"
                    disabled={!puedeContinuar}
                    onClick={() => void handleTransferir()}
                  >
                    {busy === 'Transfiriendo vehiculo' ? 'Firmando en MetaMask...' : 'Confirmar transferencia'}
                  </button>
                  <button
                    type="button"
                    className="transfer-sheet__btn transfer-sheet__btn--ghost"
                    disabled={Boolean(busy)}
                    onClick={() => setStep('form')}
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}

            <div className="transfer-sheet__history">
              <button
                type="button"
                className="transfer-sheet__history-toggle"
                onClick={() => setShowHistory((value) => !value)}
                aria-expanded={showHistory}
              >
                Historial de titularidad
                <span>{showHistory ? '−' : '+'}</span>
              </button>
              {showHistory ? (
                transferencias.length === 0 ? (
                  <p className="prop-empty">Sin historial disponible.</p>
                ) : (
                  <ul className="domain-history__list">
                    {transferencias.map((tx) => (
                      <li key={`${tx.txHash}-${tx.blockNumber}`} className="domain-history__item">
                        <div>
                          <strong>{tx.from === ZERO_ADDRESS ? 'Alta inicial' : 'Transferencia'}</strong>
                          <span>Bloque {tx.blockNumber}</span>
                        </div>
                        <p>
                          <code>{tx.from === ZERO_ADDRESS ? 'mint' : shortAddress(tx.from)}</code>
                          <span>→</span>
                          <code>{shortAddress(tx.to)}</code>
                        </p>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          </>
        )}

        {step !== 'done' ? <CarPassOperationNotice busy={busy} message={message} lastOp={lastOp} /> : null}
      </aside>
    </div>
  )
}
