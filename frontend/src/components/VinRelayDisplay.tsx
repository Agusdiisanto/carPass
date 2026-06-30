import { useMemo } from 'react'
import { buildVinRelayPayload } from '../lib/companionUrl'
import { QrCodeImage } from './QrCodeImage'

type VinRelayDisplayProps = {
  vin: string
  onSearchHere: () => void
  onScanAnother: () => void
}

export function VinRelayDisplay({ vin, onSearchHere, onScanAnother }: VinRelayDisplayProps) {
  const relayPayload = useMemo(() => buildVinRelayPayload(vin), [vin])

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
