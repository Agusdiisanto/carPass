import { useCallback, useEffect, useState } from 'react'
import { getMisVehiculosSafe, type VehiculoInfo } from './useCarPass'
import { subscribeVehicleChainUpdates } from '../lib/vehicleChainRefresh'

export type MiVehiculo = { tokenId: bigint; info: VehiculoInfo }

export function useMisVehiculos(address: string) {
  const [vehiculos, setVehiculos] = useState<MiVehiculo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!address) {
      setVehiculos([])
      setCargando(false)
      setError('')
      return
    }

    setCargando(true)
    try {
      const { vehiculos: list, error: readError } = await getMisVehiculosSafe(address)
      setVehiculos(list)
      setError(readError)
    } catch {
      setVehiculos([])
      setError('No se pudo leer tu flota on-chain. Verificá MetaMask en Sepolia.')
    } finally {
      setCargando(false)
    }
  }, [address])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    return subscribeVehicleChainUpdates(() => {
      void reload()
    })
  }, [reload])

  return { vehiculos, cargando, error, reload }
}
