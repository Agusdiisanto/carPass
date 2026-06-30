import type { ChainActivityKind } from '../lib/chainActivity'
import {
  getSepoliaAddressUrl,
  getSepoliaTxUrl,
  KIND_LABELS,
} from '../lib/chainActivity'
import { shortAddress } from '../hooks/useWallet'
import { CONTRACT_ADDRESS } from '../hooks/useCarPass'

type OperationNoticeProps = {
  message?: string
  busy?: string
  txHash?: string | null
  blockNumber?: number | null
  kind?: ChainActivityKind | null
  failed?: boolean
}

function ActivityIcon({ kind }: { kind?: ChainActivityKind | null }) {
  if (kind === 'mint_vehicle') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 17h14M5 17a2 2 0 1 0-4 0 2 2 0 0 0 4 0Zm14 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" />
        <path d="M3 12h18l-2-7H5l-2 7Z" />
      </svg>
    )
  }
  if (kind === 'transfer_nft') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 7h10v10" /><path d="M7 17 17 7" />
      </svg>
    )
  }
  if (kind === 'grant_role' || kind === 'revoke_role') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3 20 7v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4Z" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

export function OperationNotice({
  message = '',
  busy = '',
  txHash,
  blockNumber,
  kind,
  failed = false,
}: OperationNoticeProps) {
  if (!message && !busy) return null

  const pending = Boolean(busy)
  const tone = failed ? 'error' : pending ? 'pending' : 'success'
  const label = kind ? KIND_LABELS[kind] : 'On-chain'

  return (
    <div className={`operation-notice operation-notice--${tone}`} role="status" aria-live="polite">
      <span className={`operation-notice__icon operation-notice__icon--${tone}`} aria-hidden>
        <ActivityIcon kind={kind} />
      </span>
      <div className="operation-notice__body">
        <p className="operation-notice__eyebrow">
          {pending ? 'Enviando a Sepolia' : failed ? 'Transacción fallida' : 'Confirmado en red'}
          {kind ? ` · ${label}` : null}
        </p>
        <p className="operation-notice__message">{busy ? `${busy}...` : message}</p>
        {!pending && txHash ? (
          <div className="operation-notice__links">
            <a href={getSepoliaTxUrl(txHash)} target="_blank" rel="noreferrer">
              Ver tx {shortAddress(txHash)}
            </a>
            {blockNumber ? <span className="operation-notice__block">Bloque {blockNumber}</span> : null}
            <a href={getSepoliaAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">
              Contrato CarPass
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}
