import { useEffect, useRef, useState } from 'react'
import { extractVinFromQrPayload } from '../domain/carpass/vinFromQr'

type VinQrScannerProps = {
  open: boolean
  onClose: () => void
  onDetected: (vin: string) => void
  /** Titulo y copy para modo recepcion desde celular en desktop. */
  receiveMode?: boolean
}

type ScanMode = 'camera' | 'manual'

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  )
}

export function VinQrScanner({ open, onClose, onDetected, receiveMode = false }: VinQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manualVin, setManualVin] = useState('')
  const [mode, setMode] = useState<ScanMode>('camera')
  const [cameraReady, setCameraReady] = useState(false)

  useEffect(() => {
    if (!open) {
      setMode('camera')
      setError('')
      setManualVin('')
      setCameraReady(false)
      return
    }
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'camera') return

    let stream: MediaStream | null = null
    let frameId = 0
    let cancelled = false

    async function start() {
      setError('')
      setCameraReady(false)

      if (!('mediaDevices' in navigator)) {
        setError('Tu navegador no permite acceso a cámara.')
        setMode('manual')
        return
      }

      const Detector = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>
      } }).BarcodeDetector

      if (!Detector) {
        setError('QR por cámara no disponible aquí. Usá la pestaña Pegar código.')
        setMode('manual')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) return

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCameraReady(true)

        const detector = new Detector({ formats: ['qr_code'] })

        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const raw = codes[0]?.rawValue
            if (raw) {
              const vin = extractVinFromQrPayload(raw)
              if (vin) {
                onDetected(vin)
                onClose()
                return
              }
              setError('QR leído, pero no contiene un VIN válido.')
            }
          } catch {
            // Frame sin detección.
          }
          frameId = window.requestAnimationFrame(() => {
            void tick()
          })
        }

        frameId = window.requestAnimationFrame(() => {
          void tick()
        })
      } catch {
        setError('No se pudo abrir la cámara. Revisá permisos o pegá el código manualmente.')
        setMode('manual')
      }
    }

    void start()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((track) => track.stop())
      setCameraReady(false)
    }
  }, [open, mode, onClose, onDetected])

  if (!open) return null

  function submitManual() {
    const vin = extractVinFromQrPayload(manualVin)
    if (!vin) {
      setError('Pegá un VIN de 17 caracteres o un enlace con ?vin=')
      return
    }
    onDetected(vin)
    onClose()
  }

  return (
    <div
      className="qr-scanner-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={receiveMode ? 'Recibir VIN del celular' : 'Escanear QR de VIN'}
    >
      <div className="qr-scanner-panel">
        <div className="qr-scanner-head">
          <div>
            <p className="qr-scanner-eyebrow">{receiveMode ? 'Phone companion' : 'Consulta rapida'}</p>
            <h3>{receiveMode ? 'Recibir VIN del celular' : 'Escanear VIN'}</h3>
          </div>
          <button type="button" className="qr-scanner-close" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className="qr-scanner-tabs" role="tablist" aria-label="Modo de escaneo">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'camera'}
            className={`qr-scanner-tab ${mode === 'camera' ? 'active' : ''}`}
            onClick={() => {
              setMode('camera')
              setError('')
            }}
          >
            <CameraIcon />
            Cámara
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'manual'}
            className={`qr-scanner-tab ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => {
              setMode('manual')
              setError('')
            }}
          >
            <PasteIcon />
            Pegar código
          </button>
        </div>

        {mode === 'camera' ? (
          <div className="qr-scanner-viewport">
            <video ref={videoRef} className="qr-scanner-video" muted playsInline />
            <div className="qr-scanner-frame" aria-hidden>
              <span className="qr-scanner-corner qr-scanner-corner--tl" />
              <span className="qr-scanner-corner qr-scanner-corner--tr" />
              <span className="qr-scanner-corner qr-scanner-corner--bl" />
              <span className="qr-scanner-corner qr-scanner-corner--br" />
              <span className="qr-scanner-scanline" />
            </div>
            {!cameraReady && !error ? (
              <p className="qr-scanner-hint">Activando cámara...</p>
            ) : (
              <p className="qr-scanner-hint">
                {receiveMode
                  ? 'Apunta al QR grande en la pantalla del celular'
                  : 'Centra el QR dentro del recuadro'}
              </p>
            )}
          </div>
        ) : (
          <div className="qr-scanner-manual">
            <label htmlFor="qr-manual-input">Contenido del QR o enlace</label>
            <textarea
              id="qr-manual-input"
              rows={3}
              value={manualVin}
              onChange={(e) => setManualVin(e.target.value)}
              placeholder="VIN de 17 caracteres o https://...?vin=1HGBH41JXMN109186"
            />
            <button type="button" className="qr-scanner-submit" onClick={submitManual}>
              Buscar VIN
            </button>
          </div>
        )}

        {error ? <p className="qr-scanner-error">{error}</p> : null}

        <p className="qr-scanner-foot">
          {receiveMode
            ? 'Lee el codigo que muestra el celular despues de escanear el vehiculo.'
            : <>Acepta VIN plano, URLs con <code>?vin=</code> o payloads de QR del pasaporte.</>}
        </p>
      </div>
    </div>
  )
}
