import { useMemo } from 'react'
import { buildVinRelayPayload } from '../lib/companionUrl'
import { buildMetaMaskOperativeLink, getAppSessionFromUrl } from '../lib/appSessionUrl'
import { shouldOfferMetaMaskDeepLink } from '../lib/ethereumProvider'
import { setPendingOperativeVin } from '../lib/operativeVinBridge'
import { QrCodeImage } from './QrCodeImage'

type VinRelayDisplayProps = {
  vin: string
  onSearchHere: () => void
  onScanAnother: () => void
  onContinueOnPhone?: (vin: string) => void
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 11h.01" />
    </svg>
  )
}

export function VinRelayDisplay({ vin, onSearchHere, onScanAnother, onContinueOnPhone }: VinRelayDisplayProps) {
  const relayPayload = useMemo(() => buildVinRelayPayload(vin), [vin])
  const wantsOperativeOnPhone = getAppSessionFromUrl().wantsPanel || Boolean(onContinueOnPhone)

  function handleContinueOnPhone() {
    setPendingOperativeVin(vin)
    if (shouldOfferMetaMaskDeepLink()) {
      const link = buildMetaMaskOperativeLink(vin)
      if (link) {
        window.location.assign(link)
        return
      }
    }
    onContinueOnPhone?.(vin)
  }

  if (wantsOperativeOnPhone) {
    return (
      <section className="vin-relay vin-relay--operative" aria-label="Continuar en celular">
        <div className="vin-relay__glow" aria-hidden />
        <p className="vin-relay__eyebrow">VIN detectado</p>
        <h2 className="vin-relay__title">Listo para operar</h2>
        <p className="vin-relay__vin">{vin}</p>
        <p className="vin-relay__hint">
          Conectá MetaMask con la <strong>misma cuenta</strong> que en la notebook. CarPass abre el panel con este vehículo.
        </p>
        <div className="vin-relay__actions vin-relay__actions--stack">
          <button type="button" className="vin-relay__btn vin-relay__btn--primary" onClick={handleContinueOnPhone}>
            <WalletIcon />
            Operar en este celular
          </button>
          <button type="button" className="vin-relay__btn vin-relay__btn--ghost" onClick={onSearchHere}>
            Solo consultar historial
          </button>
          <button type="button" className="vin-relay__btn vin-relay__btn--ghost" onClick={onScanAnother}>
            Escanear otro VIN
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="vin-relay" aria-label="Mostrar VIN a la notebook">
      <div className="vin-relay__glow" aria-hidden />
      <p className="vin-relay__eyebrow">VIN detectado</p>
      <h2 className="vin-relay__title">Mostra esta pantalla a tu notebook</h2>
      <p className="vin-relay__vin">{vin}</p>

      <div className="vin-relay__qr-wrap">
        <div className="vin-relay__qr-ring" aria-hidden />
        <QrCodeImage value={relayPayload} size={220} label={`VIN ${vin} para la notebook`} />
      </div>

      <p className="vin-relay__hint">
        En la PC, toca <strong>Recibir VIN del celular</strong> y apunta la camara a este codigo.
      </p>

      <div className="vin-relay__actions">
        <button type="button" className="vin-relay__btn vin-relay__btn--primary" onClick={onSearchHere}>
          Buscar en este celular
        </button>
        <button type="button" className="vin-relay__btn vin-relay__btn--ghost" onClick={onScanAnother}>
          Escanear otro VIN
        </button>
      </div>
    </section>
  )
}
