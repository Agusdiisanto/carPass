import { useMemo, useState } from 'react'
import { buildCompanionScanUrl } from '../lib/companionUrl'
import {
  getEffectivePublicAppUrl,
  isCompanionUrlReachable,
  setSessionPublicAppUrl,
} from '../lib/publicAppUrl'
import { setSessionDevLanHost } from '../lib/lanHost'
import { useLanHost } from '../hooks/useLanHost'
import { shortAddress } from '../hooks/useWallet'
import { QrCodeImage } from './QrCodeImage'

type PhoneCompanionCardProps = {
  onReceiveFromPhone: () => void
  operative?: boolean
  walletAddress?: string
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  )
}

function LaptopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16v10H4z" />
      <path d="M2 18h20" />
    </svg>
  )
}

function ReceiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export function PhoneCompanionCard({
  onReceiveFromPhone,
  operative = false,
  walletAddress = '',
}: PhoneCompanionCardProps) {
  const { isLocalDev, lanIp, discovering } = useLanHost()
  const [copied, setCopied] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [urlError, setUrlError] = useState('')
  const [urlRevision, setUrlRevision] = useState(0)

  const publicAppUrl = getEffectivePublicAppUrl()
  const companionUrl = useMemo(
    () =>
      buildCompanionScanUrl({
        lanHost: isLocalDev ? lanIp : null,
        operative,
        walletAddress: operative ? walletAddress : null,
      }),
    [isLocalDev, lanIp, urlRevision, publicAppUrl, operative, walletAddress],
  )
  const qrReady = isCompanionUrlReachable(companionUrl)

  async function copyCompanionUrl() {
    if (!companionUrl) return
    try {
      await navigator.clipboard.writeText(companionUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard no disponible.
    }
  }

  function applyManualUrl() {
    const trimmed = urlDraft.trim()
    if (!trimmed) return

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
      const saved = setSessionDevLanHost(trimmed)
      if (!saved) {
        setUrlError('Usa la IP de tu WiFi (192.168.x.x). No la IP publica del modem (190.x, etc.).')
        return
      }
      setUrlError('')
      setUrlDraft('')
      setUrlRevision((value) => value + 1)
      return
    }

    const saved = setSessionPublicAppUrl(trimmed)
    if (!saved) {
      setUrlError('Ingresa https://tu-deploy.vercel.app o una IP LAN 192.168.x.x')
      return
    }
    setUrlError('')
    setUrlDraft('')
    setUrlRevision((value) => value + 1)
  }

  return (
    <section className="phone-companion" aria-label="Escanear VIN con celular">
      <div className="phone-companion__glow" aria-hidden />

      <div className="phone-companion__head">
        <div className="phone-companion__icons" aria-hidden>
          <span className="phone-companion__icon phone-companion__icon--laptop">
            <LaptopIcon />
          </span>
          <span className="phone-companion__link-pulse" />
          <span className="phone-companion__icon phone-companion__icon--phone">
            <PhoneIcon />
          </span>
        </div>
        <div>
          <p className="phone-companion__eyebrow">Notebook + celular</p>
          <h2 className="phone-companion__title">Escaneá desde el celular</h2>
          <p className="phone-companion__subtitle">
            {operative
              ? 'Escaneá el QR, leé el pasaporte del auto y en el celular conectá MetaMask con la misma cuenta que acá.'
              : 'Escaneá el QR para abrir la cámara en el celular. Después podés mostrar el VIN a esta PC.'}
          </p>
        </div>
      </div>

      {operative && walletAddress ? (
        <p className="phone-companion__wallet-hint" role="note">
          Wallet en esta PC: <strong>{shortAddress(walletAddress)}</strong> — usá la misma en el celular.
        </p>
      ) : null}

      {isLocalDev ? (
        <div className="phone-companion__dev-hint" role="note">
          {qrReady ? (
            <>
              <p className="phone-companion__dev-text">
                {publicAppUrl
                  ? <>Estas en <code>localhost</code>, pero el QR apunta a tu deploy:</>
                  : lanIp
                    ? <>Misma WiFi: usa esta IP <strong>privada</strong> (192.168.x.x), no la publica del modem:</>
                    : <>El celular debe estar en la misma WiFi o usar esta URL:</>}
              </p>
              <div className="phone-companion__dev-row">
                <code className="phone-companion__lan-url">{companionUrl}</code>
                <button type="button" className="phone-companion__copy" onClick={() => void copyCompanionUrl()}>
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </>
          ) : discovering ? (
            <p className="phone-companion__dev-text">Detectando red local...</p>
          ) : (
            <>
              <p className="phone-companion__dev-text phone-companion__dev-text--warn">
                <code>localhost</code> no abre en el celular. Pega tu IP WiFi o la URL del deploy:
              </p>
              <div className="phone-companion__manual">
                <input
                  type="text"
                  className="phone-companion__manual-input"
                  value={urlDraft}
                  onChange={(e) => {
                    setUrlDraft(e.target.value)
                    setUrlError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && applyManualUrl()}
                  placeholder="192.168.0.155 o https://tu-app.vercel.app"
                  aria-label="IP WiFi o URL del deploy"
                />
                <button type="button" className="phone-companion__manual-btn" onClick={applyManualUrl}>
                  Generar QR
                </button>
              </div>
              {urlError ? <p className="phone-companion__manual-error">{urlError}</p> : null}
              <p className="phone-companion__dev-text">
                Tip: en Windows corre <code>ipconfig</code> y busca IPv4 en tu WiFi (192.168...).
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="phone-companion__body">
        <div className="phone-companion__qr-wrap">
          <div className="phone-companion__qr-ring" aria-hidden />
          {qrReady ? (
            <QrCodeImage value={companionUrl} size={168} label="Abrir escaner en el celular" />
          ) : (
            <div className="phone-companion__qr-placeholder" aria-hidden />
          )}
        </div>

        <ol className="phone-companion__steps">
          <li>
            <span className="phone-companion__step-num">1</span>
            Escaneá este QR con el celular
          </li>
          <li>
            <span className="phone-companion__step-num">2</span>
            Apuntá al QR del parabrisas o cédula
          </li>
          <li>
            <span className="phone-companion__step-num">3</span>
            {operative ? 'Conectá MetaMask en el celular (misma cuenta)' : 'Mostrá el VIN a esta PC'}
          </li>
        </ol>
      </div>

      <button type="button" className="phone-companion__receive" onClick={onReceiveFromPhone}>
        <ReceiveIcon />
        Recibir VIN del celular
      </button>
    </section>
  )
}
