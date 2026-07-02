import { useCallback, useEffect, useState } from 'react'
import { hasContractAddress, tienePartesRegistradas } from './useVehicleParts'
import type { MiVehiculo } from './useMisVehiculos'
import { subscribeVehicleChainUpdates } from '../lib/vehicleChainRefresh'

export type PartesFleetStatus = 'complete' | 'pending' | 'unavailable' | 'loading'

export async function getPartesFleetStatus(tokenId: bigint): Promise<PartesFleetStatus> {
  if (!hasContractAddress) return 'unavailable'
  try {
    const instaladas = await tienePartesRegistradas(tokenId)
    return instaladas ? 'complete' : 'pending'
  } catch {
    return 'unavailable'
  }
}

function statusKey(tokenId: bigint) {
  return String(tokenId)
}

export function useFleetPartesStatus(vehiculos: MiVehiculo[]) {
  const [statusMap, setStatusMap] = useState<Record<string, PartesFleetStatus>>({})
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!hasContractAddress || vehiculos.length === 0) {
      setStatusMap({})
      return
    }

    setLoading(true)
    const entries = await Promise.all(
      vehiculos.map(async (vehicle) => {
        const status = await getPartesFleetStatus(vehicle.tokenId)
        return [statusKey(vehicle.tokenId), status] as const
      }),
    )
    setStatusMap(Object.fromEntries(entries))
    setLoading(false)
  }, [vehiculos])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    return subscribeVehicleChainUpdates(({ reason }) => {
      if (reason === 'autopartes' || reason === 'mint' || reason === 'transfer') {
        void reload()
      }
    })
  }, [reload])

  function getStatus(tokenId: bigint): PartesFleetStatus {
    return statusMap[statusKey(tokenId)] ?? (loading ? 'loading' : 'unavailable')
  }

  return { getStatus, reload, loading }
}
