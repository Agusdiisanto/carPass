import { useState } from 'react'
import { normalizeVin } from '../domain/carpass/formatters'
import { isValidVin } from '../domain/carpass/validators'
import { useCarPass } from './useCarPass'
import type { VehiculoInfo } from './useCarPass'

type LookupOptions = {
  loadMileage?: boolean
}

export type VehicleLookupResult = {
  tokenId: bigint
  info: VehiculoInfo
  lastKm: number
}

export function useVehicleLookup(options: LookupOptions = {}) {
  const { getVehiculoPorVin, getUltimoKm } = useCarPass()
  const [vin, setVinValue] = useState('')
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [vehicle, setVehicle] = useState<VehiculoInfo | null>(null)
  const [lastKm, setLastKm] = useState(0)
  const [found, setFound] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function setVin(value: string) {
    setVinValue(normalizeVin(value))
    setTokenId(null)
    setVehicle(null)
    setLastKm(0)
    setFound(false)
    setError('')
  }

  function reset() {
    setVinValue('')
    setTokenId(null)
    setVehicle(null)
    setLastKm(0)
    setFound(false)
    setError('')
    setLoading(false)
  }

  async function search(vinToSearch = vin): Promise<VehicleLookupResult | null> {
    const normalizedVin = normalizeVin(vinToSearch)
    if (!isValidVin(normalizedVin)) return null

    setVinValue(normalizedVin)
    setError('')
    setFound(false)
    setLoading(true)

    try {
      const { tokenId: nextTokenId, info } = await getVehiculoPorVin(normalizedVin)
      if (!info.vin) {
        setTokenId(null)
        setVehicle(null)
        setLastKm(0)
        setError('Vehiculo no encontrado')
        return null
      }

      const nextLastKm = options.loadMileage ? await getUltimoKm(nextTokenId) : 0
      setTokenId(nextTokenId)
      setVehicle(info)
      setLastKm(nextLastKm)
      setFound(true)
      return { tokenId: nextTokenId, info, lastKm: nextLastKm }
    } catch {
      setTokenId(null)
      setVehicle(null)
      setLastKm(0)
      setError('No se pudo consultar el contrato')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    vin,
    setVin,
    tokenId,
    vehicle,
    lastKm,
    setLastKm,
    found,
    error,
    loading,
    search,
    reset,
  }
}
