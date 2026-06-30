import { useEffect } from 'react'
import { CarPassLogoMark } from './CarPassLogo'
import { QrCodeImage } from './QrCodeImage'

type VehiclePassportStickerModalProps = {
  open: boolean
  onClose: () => void
  vin: string
  marca: string
  modelo: string
  anio?: number
  color?: string
  shareUrl: string
}

function PrintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function StickerSheet({
  vin,
  marca,
  modelo,
  anio,
  color,
  shareUrl,
}: Omit<VehiclePassportStickerModalProps, 'open' | 'onClose'>) {
  const vehicleLine = [marca, modelo, anio ? String(anio) : ''].filter(Boolean).join(' · ')
  const detailLine = [color, 'Sepolia testnet'].filter(Boolean).join(' · ')

  return (
    <article className="sticker-sheet" aria-label="Sticker CarPass A6">
      <header className="sticker-sheet__head">
        <CarPassLogoMark size={28} className="sticker-sheet__logo" />
        <div>
          <p className="sticker-sheet__brand">
            <span className="sticker-sheet__brand-car">Car</span>
            <span className="sticker-sheet__brand-pass">Pass</span>
          </p>
          <p className="sticker-sheet__tagline">Pasaporte vehicular verificable</p>
        </div>
      </header>

      <div className="sticker-sheet__vehicle">
        <h2 className="sticker-sheet__model">{vehicleLine}</h2>
        {detailLine ? <p className="sticker-sheet__detail">{detailLine}</p> : null}
      </div>

      <div className="sticker-sheet__qr-wrap">
        <QrCodeImage value={shareUrl} size={156} label={`QR CarPass ${vin}`} />
      </div>

      <div className="sticker-sheet__vin-block">
        <p className="sticker-sheet__vin-label">VIN</p>
        <p className="sticker-sheet__vin">{vin}</p>
      </div>

      <footer className="sticker-sheet__foot">
        <p>Escanear en taller · aseguradora · VTV</p>
        <p className="sticker-sheet__foot-sub">Sin tipear los 17 caracteres</p>
      </footer>

      <div className="sticker-sheet__crop-marks" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
    </article>
  )
}

export function VehiclePassportStickerModal({
  open,
  onClose,
  vin,
  marca,
  modelo,
  anio,
  color,
  shareUrl,
}: VehiclePassportStickerModalProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    function onAfterPrint() {
      document.body.classList.remove('print-sticker-active')
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      window.removeEventListener('afterprint', onAfterPrint)
      document.body.classList.remove('print-sticker-active')
    }
  }, [])

  if (!open) return null

  function handlePrint() {
    document.body.classList.add('print-sticker-active')
    window.print()
  }

  const sheetProps = { vin, marca, modelo, anio, color, shareUrl }

  return (
    <div className="sticker-modal-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa sticker A6">
      <div className="sticker-modal-panel">
        <div className="sticker-modal-head">
          <div>
            <p className="sticker-modal-eyebrow">Formato imprimible</p>
            <h3>Sticker A6 · CarPass</h3>
            <p className="sticker-modal-desc">
              Vista compacta para pegar en parabrisas, portón o cédula. Usá papel adhesivo A6 o recortá con las marcas.
            </p>
          </div>
          <button type="button" className="sticker-modal-close" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className="sticker-modal-preview">
          <StickerSheet {...sheetProps} />
        </div>

        <div className="sticker-modal-actions">
          <button type="button" className="sticker-modal-btn sticker-modal-btn--ghost" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="sticker-modal-btn sticker-modal-btn--primary" onClick={handlePrint}>
            <PrintIcon />
            Imprimir sticker A6
          </button>
        </div>
      </div>

      <div className="sticker-print-root" aria-hidden>
        <StickerSheet {...sheetProps} />
      </div>
    </div>
  )
}
