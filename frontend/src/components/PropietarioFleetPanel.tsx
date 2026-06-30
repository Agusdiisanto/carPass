import { useState } from 'react'
import { MisAutosView } from '../views/MisAutosView'
import { takePendingOperativeVin } from '../lib/operativeVinBridge'

type PropietarioFleetPanelProps = {
  address: string
  wrongNetwork: boolean
  onViewPassport: (vin: string) => void
  onGoToMisAutos?: () => void
}

export function PropietarioFleetPanel({
  address,
  wrongNetwork,
  onViewPassport,
  onGoToMisAutos,
}: PropietarioFleetPanelProps) {
  const [transferVin, setTransferVin] = useState<string | null>(() => takePendingOperativeVin())

  return (
    <div className="propietario-fleet-panel">
      {onGoToMisAutos ? (
        <button type="button" className="propietario-fleet-panel__expand" onClick={onGoToMisAutos}>
          Abrir Mis vehículos en pantalla completa →
        </button>
      ) : null}
      <MisAutosView
      compact
      address={address}
      wrongNetwork={wrongNetwork}
      transferVin={transferVin}
      onTransferDismiss={() => setTransferVin(null)}
      onViewPassport={onViewPassport}
      onTransfer={(vin) => setTransferVin(vin)}
    />
    </div>
  )
}
