import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { extractVinFromQrPayload } from '../domain/carpass/vinFromQr'
import { hasBarcodeDetector } from '../lib/deviceProfile'

const H5QR_READER_ID = 'vin-h5qr-reader'

type VinQrScannerProps = {
  open: boolean
  onClose: () => void
  onDetected: (vin: string) => void
  /** Titulo y copy para modo recepcion desde celular en desktop. */
  receiveMode?: boolean
  /** Copy para consulta publica u operaciones de taller/aseguradora/VTV. */
  variant?: 'consulta' | 'operativo'
}

type ScanMode = 'camera' | 'manual'
type CameraEngine = 'barcode-detector' | 'html5-qrcode' | 'idle'

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

export function VinQrScanner({
  open,
  onClose,
  onDetected,
  receiveMode = false,
  variant = 'consulta',
}: VinQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manualVin, setManualVin] = useState('')
  const [mode, setMode] = useState<ScanMode>('camera')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraEngine, setCameraEngine] = useState<CameraEngine>('idle')

  useEffect(() => {
    if (!open) {
      setMode('camera')
      setError('')
      setManualVin('')
      setCameraReady(false)
      setCameraEngine('idle')
      return
    }
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'camera') {
      setCameraEngine('idle')
      return
    }

    if (!('mediaDevices' in navigator)) {
      setError('Tu navegador no permite acceso a cámara.')
      setMode('manual')
      return
    }

    setCameraEngine(hasBarcodeDetector() ? 'barcode-detector' : 'html5-qrcode')
  }, [open, mode])

  useEffect(() => {
    if (!open || mode !== 'camera' || cameraEngine !== 'barcode-detector') return

    let stream: MediaStream | null = null
    let frameId = 0
    let cancelled = false

    async function start() {
      setError('')
      setCameraReady(false)

      const Detector = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>
      } }).BarcodeDetector

      if (!Detector) return

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
  }, [open, mode, cameraEngine, onClose, onDetected])

  useEffect(() => {
    if (!open || mode !== 'camera' || cameraEngine !== 'html5-qrcode') return

    let scanner: Html5Qrcode | null = null
    let cancelled = false

    async function start() {
      setError('')
      setCameraReady(false)

      try {
        scanner = new Html5Qrcode(H5QR_READER_ID)
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
          (decodedText) => {
            if (cancelled) return
            const vin = extractVinFromQrPayload(decodedText)
            if (vin) {
              void scanner?.stop().finally(() => {
                if (!cancelled) {
                  onDetected(vin)
                  onClose()
                }
              })
              return
            }
            setError('QR leído, pero no contiene un VIN válido.')
          },
          () => {},
        )
        if (!cancelled) setCameraReady(true)
      } catch {
        if (!cancelled) {
          setError('No se pudo abrir la cámara. Revisá permisos o pegá el código manualmente.')
          setMode('manual')
        }
      }
    }

    const timer = window.setTimeout(() => {
      void start()
    }, 80)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (scanner?.isScanning) {
        void scanner.stop().catch(() => {})
      }
      setCameraReady(false)
    }
  }, [open, mode, cameraEngine, onClose, onDetected])

  if (!open) return null

  const dialogLabel = receiveMode
    ? 'Recibir VIN del celular'
    : variant === 'operativo'
      ? 'Escanear pasaporte del vehículo'
      : 'Escanear QR de VIN'

  const eyebrow = receiveMode
    ? 'Phone companion'
    : variant === 'operativo'
      ? 'Carga operativa'
      : 'Consulta rapida'

  const title = receiveMode
    ? 'Recibir VIN del celular'
    : variant === 'operativo'
      ? 'Escanear pasaporte'
      : 'Escanear VIN'

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
      aria-label={dialogLabel}
    >
      <div className="qr-scanner-panel">
        <div className="qr-scanner-head">
          <div>
            <p className="qr-scanner-eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
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
            {cameraEngine === 'html5-qrcode' ? (
              <div id={H5QR_READER_ID} className="qr-scanner-h5qr" />
            ) : (
              <>
                <video ref={videoRef} className="qr-scanner-video" muted playsInline />
                <div className="qr-scanner-frame" aria-hidden>
                  <span className="qr-scanner-corner qr-scanner-corner--tl" />
                  <span className="qr-scanner-corner qr-scanner-corner--tr" />
                  <span className="qr-scanner-corner qr-scanner-corner--bl" />
                  <span className="qr-scanner-corner qr-scanner-corner--br" />
                  <span className="qr-scanner-scanline" />
                </div>
              </>
            )}
            {!cameraReady && !error ? (
              <p className="qr-scanner-hint">Activando cámara...</p>
            ) : (
              <p className="qr-scanner-hint">
                {receiveMode
                  ? 'Apunta al QR grande en la pantalla del celular'
                  : variant === 'operativo'
                    ? 'Centrá el QR del pasaporte CarPass dentro del recuadro'
                    : 'Centrá el QR dentro del recuadro'}
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
              {variant === 'operativo' ? 'Identificar vehículo' : 'Buscar VIN'}
            </button>
          </div>
        )}

        {error ? <p className="qr-scanner-error">{error}</p> : null}

        <p className="qr-scanner-foot">
          {receiveMode
            ? 'Lee el codigo que muestra el celular despues de escanear el vehiculo.'
            : variant === 'operativo'
              ? <>Escaneá el QR del pasaporte, parabrisas o pegá un enlace con <code>?vin=</code>.</>
              : <>Acepta VIN plano, URLs con <code>?vin=</code> o payloads de QR del pasaporte.</>}
        </p>
      </div>
    </div>
  )
}
