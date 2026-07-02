import type { VehiclePartsLastOp } from '../hooks/useVehicleParts'
import { CONTRACT_ADDRESS } from '../hooks/useVehicleParts'
import { getSepoliaAddressUrl } from '../lib/chainActivity'
import { shortAddress } from '../hooks/useWallet'

type VehiclePartsOperationNoticeProps = {
  busy: string
  message: string
  lastOp: VehiclePartsLastOp
}

export function VehiclePartsOperationNotice({ busy, message, lastOp }: VehiclePartsOperationNoticeProps) {
  if (!message && !busy) return null

  const pending = Boolean(busy)
  const tone = lastOp.failed ? 'error' : pending ? 'pending' : 'success'

  return (
    <div className={`operation-notice operation-notice--${tone}`} role="status" aria-live="polite">
      <span className={`operation-notice__icon operation-notice__icon--${tone}`} aria-hidden>
        ⚙
      </span>
      <div className="operation-notice__body">
        <p className="operation-notice__eyebrow">
          {pending ? 'Enviando a Sepolia' : lastOp.failed ? 'Transacción fallida' : 'Confirmado en red'}
          {' · Autopartes'}
        </p>
        <p className="operation-notice__message">{busy ? `${busy}...` : message}</p>
        {!pending && lastOp.txHash ? (
          <div className="operation-notice__links">
            <a href={`https://sepolia.etherscan.io/tx/${lastOp.txHash}`} target="_blank" rel="noreferrer">
              Ver tx {shortAddress(lastOp.txHash)}
            </a>
            {lastOp.blockNumber ? (
              <span className="operation-notice__block">Bloque {lastOp.blockNumber}</span>
            ) : null}
            <a href={getSepoliaAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">
              Contrato VehicleParts
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}
