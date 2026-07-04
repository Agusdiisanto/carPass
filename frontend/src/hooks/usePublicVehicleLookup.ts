import { useCallback, useState } from 'react'
import { normalizeVin } from '../domain/carpass/formatters'
import {
  createLiveVehicleRecord,
  getDemoVehicleRecord,
  getSnapshotVehicle,
  type PublicVehicleRecord,
} from '../domain/carpass/publicRead'
import { normalizeVehiculoInfo, normalizeSelloCalidad } from '../domain/carpass/vehicleInfo'
import { isValidVin } from '../domain/carpass/validators'
import { getVehiculoPorVin, getHistorial, getPropietario } from './useCarPass'

const DEFAULT_TIMEOUT_MS = 4500

type LookupState = {
  data: PublicVehicleRecord | null
  error: string
  loading: boolean
  loadingVin: string
  refreshing: boolean
}

function getTimeoutMs() {
  const configured = Number(import.meta.env.VITE_CARPASS_PUBLIC_READ_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS
}

function describeError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'La lectura live no respondio'
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`Timeout de lectura publica (${ms} ms)`)), ms)
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout))
  })
}

export function usePublicVehicleLookup() {
  const [state, setState] = useState<LookupState>({
    data: null,
    error: '',
    loading: false,
    loadingVin: '',
    refreshing: false,
  })

  const readLive = useCallback(
    async (vin: string) => {
      const { tokenId, info } = await getVehiculoPorVin(vin)
      if (!info.vin) {
        throw new Error('Vehiculo no encontrado en Sepolia')
      }

      const [historial, ownerAddress] = await Promise.all([
        getHistorial(tokenId),
        getPropietario(tokenId),
      ])

      return createLiveVehicleRecord({
        tokenId,
        info: normalizeVehiculoInfo(info),
        services: historial.services,
        siniestros: historial.siniestros,
        vtv: historial.vtv,
        sello: normalizeSelloCalidad(historial.sello),
        ownerAddress,
      })
    },
    [getHistorial, getPropietario, getVehiculoPorVin],
  )

  const fetchRecord = useCallback(
    async (vin: string): Promise<{ record: PublicVehicleRecord | null; error: string }> => {
      try {
        const live = await withTimeout(readLive(vin), getTimeoutMs())
        return { record: live, error: '' }
      } catch (error) {
        const fallbackReason = describeError(error)
        const snapshot = getSnapshotVehicle(vin, fallbackReason)
        if (snapshot) return { record: snapshot, error: '' }

        const demo = getDemoVehicleRecord(vin, fallbackReason)
        if (demo) return { record: demo, error: '' }

        return {
          record: null,
          error: fallbackReason
            ? `No se pudo resolver el VIN. Ultimo intento live: ${fallbackReason}.`
            : 'No se encontro ningun vehiculo con ese VIN.',
        }
      }
    },
    [readLive],
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      error: '',
      loading: false,
      loadingVin: '',
      refreshing: false,
    })
  }, [])

  const search = useCallback(
    async (vinToSearch: string): Promise<PublicVehicleRecord | null> => {
      const vin = normalizeVin(vinToSearch)
      if (!isValidVin(vin)) return null

      setState({
        data: null,
        error: '',
        loading: true,
        loadingVin: vin,
        refreshing: false,
      })

      const { record, error } = await fetchRecord(vin)
      setState({
        data: record,
        error,
        loading: false,
        loadingVin: '',
        refreshing: false,
      })
      return record
    },
    [fetchRecord],
  )

  const refresh = useCallback(
    async (vinToRefresh: string): Promise<PublicVehicleRecord | null> => {
      const vin = normalizeVin(vinToRefresh)
      if (!isValidVin(vin)) return null

      setState((current) => ({
        ...current,
        loading: true,
        loadingVin: vin,
        refreshing: true,
        error: '',
      }))

      const { record, error } = await fetchRecord(vin)
      setState((current) => ({
        data: record ?? current.data,
        error: record ? '' : error || current.error,
        loading: false,
        loadingVin: '',
        refreshing: false,
      }))
      return record
    },
    [fetchRecord],
  )

  return {
    ...state,
    search,
    refresh,
    reset,
  }
}
