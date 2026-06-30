import { useCallback, useEffect, useState } from 'react'
import { CONTRACT_ADDRESS, getMisVehiculosSafe, type VehiculoInfo } from './useCarPass'
import { subscribeVehicleChainUpdates } from '../lib/vehicleChainRefresh'
import { subscribeFleetTransferUpdates } from '../lib/fleetRead'

export type MiVehiculo = { tokenId: bigint; info: VehiculoInfo }

export function useMisVehiculos(address: string) {
  const [vehiculos, setVehiculos] = useState<MiVehiculo[]>([])
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!address) {
      setVehiculos([])
      setCargando(false)
      setSincronizando(false)
      setError('')
      return
    }

    const silent = options?.silent === true
    if (silent) setSincronizando(true)
    else setCargando(true)

    try {
      const { vehiculos: list, error: readError } = await getMisVehiculosSafe(address)
      if (silent && readError) {
        setError(readError)
        return
      }
      setVehiculos(list)
      setError(readError)
    } catch {
      if (!silent) setVehiculos([])
      setError(
        silent
          ? 'No se pudo sincronizar la titularidad on-chain.'
          : 'No se pudo leer tu flota on-chain. Verifica MetaMask en Sepolia.',
      )
    } finally {
      if (silent) setSincronizando(false)
      else setCargando(false)
    }
  }, [address])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    return subscribeVehicleChainUpdates(() => {
      void reload({ silent: true })
    })
  }, [reload])

  useEffect(() => {
    return subscribeFleetTransferUpdates(CONTRACT_ADDRESS, address, () => {
      void reload({ silent: true })
    })
  }, [address, reload])

  return { vehiculos, cargando, sincronizando, error, reload }
}
