import { shortAddress } from '../hooks/useWallet'
import { getRememberedWalletHint } from '../lib/companionUrl'

type MobileLinkBannerProps = {
  connectedAddress?: string
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export function MobileLinkBanner({ connectedAddress }: MobileLinkBannerProps) {
  const expectedWallet = getRememberedWalletHint()
  if (!expectedWallet) return null

  const connected =
    connectedAddress && connectedAddress.toLowerCase() === expectedWallet.toLowerCase()

  return (
    <section className={`mobile-link-banner ${connected ? 'mobile-link-banner--ok' : ''}`} role="note">
      <LinkIcon />
      <div>
        <p className="mobile-link-banner__title">
          {connected ? 'Wallet vinculada con la PC' : 'Wallet de la notebook'}
        </p>
        <p className="mobile-link-banner__text">
          {connected ? (
            <>Conectaste <strong>{shortAddress(expectedWallet)}</strong> — la misma que en la PC.</>
          ) : (
            <>Conectá MetaMask con <strong>{shortAddress(expectedWallet)}</strong> (misma cuenta que en la PC).</>
          )}
        </p>
      </div>
    </section>
  )
}
