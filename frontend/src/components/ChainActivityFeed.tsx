import { useMemo, useState } from 'react'
import {
  getSepoliaAddressUrl,
  getSepoliaTxUrl,
  KIND_LABELS,
  type ChainActivityEntry,
  type ChainActivityKind,
} from '../lib/chainActivity'
import { useChainActivities } from '../hooks/useChainActivities'
import { shortAddress } from '../hooks/useWallet'
import { CONTRACT_ADDRESS } from '../hooks/useCarPass'

type ChainActivityFeedProps = {
  walletAddress: string
  wrongNetwork?: boolean
}

function kindIcon(kind: ChainActivityKind) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true as const }
  if (kind === 'wallet_connect' || kind === 'wallet_disconnect') {
    return (
      <svg {...common}>
        <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
        <path d="M16 11h.01" />
      </svg>
    )
  }
  if (kind === 'mint_vehicle') {
    return (
      <svg {...common}>
        <path d="M5 17h14" /><path d="M6 11h12l1-4H5z" />
      </svg>
    )
  }
  if (kind === 'transfer_nft') {
    return (
      <svg {...common}>
        <path d="M7 7h10v10" /><path d="M7 17 17 7" />
      </svg>
    )
  }
  if (kind === 'grant_role' || kind === 'revoke_role') {
    return (
      <svg {...common}>
        <path d="M12 3 20 7v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4Z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    </svg>
  )
}

function ActivityRow({ entry }: { entry: ChainActivityEntry }) {
  const statusClass =
    entry.status === 'failed' ? 'failed' : entry.status === 'pending' ? 'pending' : 'confirmed'

  return (
    <li className={`chain-activity-row chain-activity-row--${statusClass}`}>
      <span className={`chain-activity-row__icon chain-activity-row__icon--${entry.kind}`}>
        {kindIcon(entry.kind)}
      </span>
      <div className="chain-activity-row__main">
        <div className="chain-activity-row__head">
          <strong>{entry.title}</strong>
          <span className="chain-activity-row__method">
            {entry.method ?? KIND_LABELS[entry.kind]}
          </span>
        </div>
        {entry.detail ? <p className="chain-activity-row__detail">{entry.detail}</p> : null}
        <div className="chain-activity-row__meta">
          {entry.txHash ? (
            <a href={getSepoliaTxUrl(entry.txHash)} target="_blank" rel="noreferrer">
              {shortAddress(entry.txHash)}
            </a>
          ) : null}
          {entry.blockNumber ? <span>Bloque {entry.blockNumber}</span> : null}
          {entry.counterparty ? (
            <a href={getSepoliaAddressUrl(entry.counterparty)} target="_blank" rel="noreferrer">
              {entry.counterparty.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
                ? 'Contrato CarPass'
                : shortAddress(entry.counterparty)}
            </a>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export function ChainActivityFeed({ walletAddress, wrongNetwork = false }: ChainActivityFeedProps) {
  const all = useChainActivities()
  const [open, setOpen] = useState(false)

  const items = useMemo(
    () =>
      all.filter(
        (entry) => entry.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
      ),
    [all, walletAddress],
  )

  if (!walletAddress) return null

  return (
    <section className={`chain-activity-feed ${open ? 'chain-activity-feed--open' : ''}`}>
      <button
        type="button"
        className="chain-activity-feed__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="chain-activity-feed__toggle-label">Actividad en Sepolia</span>
        <span className="chain-activity-feed__count">{items.length}</span>
        {wrongNetwork ? <span className="chain-activity-feed__warn">Red incorrecta</span> : null}
        <span className="chain-activity-feed__chevron" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>

      {open ? (
        <div className="chain-activity-feed__panel">
          <div className="chain-activity-feed__links">
            <a href={getSepoliaAddressUrl(walletAddress)} target="_blank" rel="noreferrer">
              Tu wallet en Etherscan
            </a>
            <a href={getSepoliaAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">
              Contrato CarPass
            </a>
          </div>
          {items.length === 0 ? (
            <p className="chain-activity-feed__empty">
              Sin movimientos aún. Al registrar un vehículo, asignar roles o transferir NFT vas a ver cada tx acá.
            </p>
          ) : (
            <ul className="chain-activity-feed__list">
              {items.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}
