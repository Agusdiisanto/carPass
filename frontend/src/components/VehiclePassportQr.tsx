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
  size?: number
  /** Ficha pública: layout compacto optimizado para mostrar en taller. */
  variant?: 'default' | 'featured' | 'flip'
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

function StickerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M15 3v3h3" />
      <path d="M9 13h6M9 17h4" />
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

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  )
}

type ToolbarAction = 'link' | 'vin' | 'qr' | 'sticker' | 'panel'

const FEEDBACK_LABELS: Record<ToolbarAction, string> = {
  qr: 'QR descargado',
  sticker: 'Sticker listo',
  link: 'Enlace copiado',
  vin: 'VIN copiado',
  panel: 'Abriendo panel',
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
  size,
  variant = 'default',
}: VehiclePassportQrProps) {
  const featured = variant === 'featured'
  const flip = variant === 'flip'
  const qrSize = size ?? (flip ? 132 : featured ? 148 : 204)

  const [dataUrl, setDataUrl] = useState('')
  const [feedback, setFeedback] = useState<ToolbarAction | null>(null)
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
  const vehicleLabel = `${marca} ${modelo}`.trim()

  function flash(action: ToolbarAction) {
    setFeedback(action)
    window.setTimeout(() => setFeedback(null), 2000)
  }

  async function copyText(text: string, action: ToolbarAction) {
    try {
      await navigator.clipboard.writeText(text)
      flash(action)
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
    flash('qr')
  }

  return (
    <section
      className={`passport-qr${featured ? ' passport-qr--featured' : ''}${flip ? ' passport-qr--flip' : ''}`}
      aria-label={`QR pasaporte ${vin}`}
    >
      <article className="passport-qr__card">
        {!featured && !flip ? (
          <header className="passport-qr__head">
            <span className="passport-qr__head-label">Pasaporte digital</span>
            {localhostOnly ? (
              <span className="passport-qr__localhost" title="Localhost: configurá VITE_PUBLIC_APP_URL">
                <WarnIcon />
              </span>
            ) : null}
          </header>
        ) : null}

        <div className="passport-qr__body">
          <div className="passport-qr__frame">
            <span className="passport-qr__corner passport-qr__corner--tl" aria-hidden />
            <span className="passport-qr__corner passport-qr__corner--tr" aria-hidden />
            <span className="passport-qr__corner passport-qr__corner--bl" aria-hidden />
            <span className="passport-qr__corner passport-qr__corner--br" aria-hidden />
            <div className="passport-qr__canvas">
              <QrCodeImage
                value={shareUrl}
                size={qrSize}
                label={`QR pasaporte CarPass ${vin}`}
                onDataUrl={setDataUrl}
              />
            </div>
          </div>

          {featured ? (
            <div className="passport-qr__meta">
              <p className="passport-qr__vehicle">{vehicleLabel}</p>
              <p className="passport-qr__hint">Mostrá este código en taller o VTV</p>
              {localhostOnly ? (
                <p className="passport-qr__localhost-note">
                  <WarnIcon />
                  Localhost: no escaneable desde otro dispositivo
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {feedback ? (
          <p className="passport-qr__toast" role="status" aria-live="polite">
            {FEEDBACK_LABELS[feedback]}
          </p>
        ) : null}

        <footer className="passport-qr__dock" role="toolbar" aria-label="Acciones del QR">
          <button
            type="button"
            className={`passport-qr__dock-btn${feedback === 'qr' ? ' passport-qr__dock-btn--ok' : ''}`}
            disabled={!dataUrl}
            title="Descargar PNG"
            aria-label="Descargar QR en PNG"
            onClick={downloadQr}
          >
            {feedback === 'qr' ? <CheckIcon /> : <DownloadIcon />}
          </button>

          <button
            type="button"
            className={`passport-qr__dock-btn passport-qr__dock-btn--accent${feedback === 'sticker' ? ' passport-qr__dock-btn--ok' : ''}`}
            title="Sticker A6"
            aria-label="Descargar sticker A6 para imprimir"
            onClick={() => {
              setStickerOpen(true)
              flash('sticker')
            }}
          >
            <StickerIcon />
          </button>

          <span className="passport-qr__dock-sep" aria-hidden />

          <button
            type="button"
            className={`passport-qr__dock-btn${feedback === 'link' ? ' passport-qr__dock-btn--ok' : ''}`}
            title="Copiar enlace"
            aria-label="Copiar enlace del pasaporte"
            onClick={() => copyText(shareUrl, 'link')}
          >
            {feedback === 'link' ? <CheckIcon /> : <LinkIcon />}
          </button>

          <button
            type="button"
            className={`passport-qr__dock-btn${feedback === 'vin' ? ' passport-qr__dock-btn--ok' : ''}`}
            title="Copiar VIN"
            aria-label={`Copiar VIN ${vin}`}
            onClick={() => copyText(vin, 'vin')}
          >
            {feedback === 'vin' ? <CheckIcon /> : <CopyIcon />}
          </button>

          {operativeReady ? (
            <>
              <span className="passport-qr__dock-sep" aria-hidden />
              <button
                type="button"
                className="passport-qr__dock-btn passport-qr__dock-btn--panel"
                title={`Panel · ${ROLE_LABELS[role]}`}
                aria-label={`Cargar en panel de ${ROLE_LABELS[role]}`}
                onClick={() => {
                  flash('panel')
                  onGoToPanel?.()
                }}
              >
                <PanelIcon />
              </button>
            </>
          ) : null}
        </footer>
      </article>

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
