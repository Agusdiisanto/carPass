import { useCallback, useEffect, useState } from 'react'
import { normalizeVin, safeUpperCase } from '../domain/carpass/formatters'
import { isValidWalletAddress } from '../domain/carpass/validators'
import type { MiVehiculo } from '../hooks/useMisVehiculos'
import type { TransferenciaVehiculo } from '../hooks/useCarPass'
import { useCarPass } from '../hooks/useCarPass'
import { shortAddress } from '../hooks/useWallet'
import { BrandLogo } from './BrandLogo'
import { useVehicleMedia } from '../hooks/useVehicleMedia'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

type TransferStep = 'form' | 'confirm' | 'done'

type TransferDominioSheetProps = {
  vehicle: MiVehiculo
  walletAddress: string
  wrongNetwork?: boolean
  onClose: () => void
  onTransferred?: () => void
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function TransferDominioSheet({
  vehicle,
  walletAddress,
  wrongNetwork = false,
  onClose,
  onTransferred,
}: TransferDominioSheetProps) {
  const { busy, message, getPropietario, getTransferenciasVehiculo, transferirVehiculo } = useCarPass()
  const [owner, setOwner] = useState<string | null>(null)
  const [loadingOwner, setLoadingOwner] = useState(true)
  const [ownerError, setOwnerError] = useState('')
  const [transferencias, setTransferencias] = useState<TransferenciaVehiculo[]>([])
  const [destinatario, setDestinatario] = useState('')
  const [step, setStep] = useState<TransferStep>('form')
  const [showHistory, setShowHistory] = useState(false)

  const { info } = vehicle
  const media = useVehicleMedia({
    vin: info.vin,
    marca: info.marca,
    modelo: info.modelo,
    anio: info.anio,
  })

  const destinatarioValido = isValidWalletAddress(destinatario)
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
  }, [loadOwner])

  async function handleTransferir() {
    if (!owner || !walletEsPropietaria) return
    const ok = await transferirVehiculo(
      walletAddress,
      destinatario,
      vehicle.tokenId,
      normalizeVin(info.vin),
    )
    if (!ok) return
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
            <p className="transfer-sheet__done-title">Transferencia enviada</p>
            <p className="transfer-sheet__done-text">
              El dominio CarPass pasó a <code>{shortAddress(destinatario)}</code>. La flota se actualizará sola.
            </p>
            <button type="button" className="transfer-sheet__btn transfer-sheet__btn--primary full-width" onClick={onClose}>
              Volver a mis vehículos
            </button>
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
                  <p className="error-msg">Dirección inválida</p>
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
                  <code>{shortAddress(destinatario)}</code>. Esta acción es irreversible desde CarPass.
                </p>
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

        {message && step !== 'done' ? <div className="status-bar">{message}</div> : null}
      </aside>
    </div>
  )
}
