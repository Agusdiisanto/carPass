import type { CarPassLastOp } from '../hooks/useCarPass'
import { OperationNotice } from './OperationNotice'

type CarPassOperationNoticeProps = {
  busy: string
  message: string
  lastOp: CarPassLastOp
}

export function CarPassOperationNotice({ busy, message, lastOp }: CarPassOperationNoticeProps) {
  return (
    <OperationNotice
      busy={busy}
      message={message}
      kind={lastOp.kind}
      txHash={lastOp.txHash}
      blockNumber={lastOp.blockNumber}
      failed={lastOp.failed}
    />
  )
}
