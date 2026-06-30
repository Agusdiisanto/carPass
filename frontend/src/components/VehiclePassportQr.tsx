import { useMemo, useState } from 'react'
import type { Role } from '../hooks/useCarPass'
import { ROLE_LABELS } from '../domain/carpass/roles'
import { buildVinRelayPayload } from '../lib/companionUrl'
import { isLocalDevHost } from '../lib/lanHost'
import { QrCodeImage } from './QrCodeImage'
import { VehiclePassportStickerModal } from './VehiclePassportStickerModal'

type VehiclePassportQrProps = {
  vin: string
  marca: string
  modelo: string
  anio?: number
  color?: string
  connected?: boolean
  role?: Role | null
  onGoToPanel?: () => void
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function StickerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M15 3v3h3" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  )
}

export function VehiclePassportQr({
  vin,
  marca,
  modelo,
  anio,
  color,
  connected = false,
  role = null,
  onGoToPanel,
}: VehiclePassportQrProps) {
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState<'link' | 'vin' | null>(null)
  const [stickerOpen, setStickerOpen] = useState(false)

  const shareUrl = useMemo(() => buildVinRelayPayload(vin), [vin])
  const localhostOnly = useMemo(() => {
    try {
      return isLocalDevHost(new URL(shareUrl).hostname)
    } catch {
      return isLocalDevHost()
    }
  }, [shareUrl])

  const operativeReady = connected && role && role !== 'none' && onGoToPanel

  async function copyText(text: string, kind: 'link' | 'vin') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      // clipboard no disponible.
    }
  }

  function downloadQr() {
    if (!dataUrl) return
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `carpass-${vin}.png`
    anchor.click()
  }

  return (
    <section className="passport-qr" aria-label="QR del pasaporte vehicular">
      <div className="passport-qr__glow" aria-hidden />

      <div className="passport-qr__head">
        <p className="passport-qr__eyebrow">Pasaporte digital</p>
        <h3 className="passport-qr__title">QR para operar</h3>
        <p className="passport-qr__subtitle">
          {marca} {modelo} · escanealo en taller, aseguradora o línea de VTV sin tipear el VIN.
        </p>
      </div>

      <div className="passport-qr__body">
        <div className="passport-qr__qr-wrap">
          <div className="passport-qr__qr-ring" aria-hidden />
          <QrCodeImage
            value={shareUrl}
            size={212}
            label={`QR pasaporte CarPass ${vin}`}
            onDataUrl={setDataUrl}
          />
        </div>

        <div className="passport-qr__meta">
          <code className="passport-qr__vin">{vin}</code>
          <p className="passport-qr__hint">
            El código abre la ficha pública y permite identificar el vehículo en los paneles operativos.
          </p>

          {localhostOnly ? (
            <p className="passport-qr__warn">
              Estás en localhost: para escanear desde otro dispositivo configurá <code>VITE_PUBLIC_APP_URL</code>.
            </p>
          ) : null}

          <div className="passport-qr__actions">
            <button type="button" className="passport-qr__btn" onClick={() => copyText(shareUrl, 'link')}>
              <LinkIcon />
              {copied === 'link' ? 'Enlace copiado' : 'Copiar enlace'}
            </button>
            <button type="button" className="passport-qr__btn" onClick={() => copyText(vin, 'vin')}>
              <CopyIcon />
              {copied === 'vin' ? 'VIN copiado' : 'Copiar VIN'}
            </button>
            <button type="button" className="passport-qr__btn" disabled={!dataUrl} onClick={downloadQr}>
              <DownloadIcon />
              Descargar QR
            </button>
            <button type="button" className="passport-qr__btn passport-qr__btn--accent" onClick={() => setStickerOpen(true)}>
              <StickerIcon />
              Sticker A6
            </button>
          </div>

          {operativeReady ? (
            <button type="button" className="passport-qr__panel-btn" onClick={onGoToPanel}>
              <PanelIcon />
              Cargar en panel · {ROLE_LABELS[role]}
            </button>
          ) : null}
        </div>
      </div>

      <VehiclePassportStickerModal
        open={stickerOpen}
        onClose={() => setStickerOpen(false)}
        vin={vin}
        marca={marca}
        modelo={modelo}
        anio={anio}
        color={color}
        shareUrl={shareUrl}
      />
    </section>
  )
}
