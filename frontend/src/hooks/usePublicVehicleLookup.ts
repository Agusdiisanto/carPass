import { useState } from 'react'
import { normalizeVin } from '../domain/carpass/formatters'
import {
  createLiveVehicleRecord,
  getDemoVehicleRecord,
  getSnapshotVehicle,
  type PublicVehicleRecord,
} from '../domain/carpass/publicRead'
import { isValidVin } from '../domain/carpass/validators'
import { useCarPass } from './useCarPass'

const DEFAULT_TIMEOUT_MS = 4500

type LookupState = {
  data: PublicVehicleRecord | null
  error: string
  loading: boolean
  loadingVin: string
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
  const { getVehiculoPorVin, getHistorial, getPropietario } = useCarPass()
  const [state, setState] = useState<LookupState>({
    data: null,
    error: '',
    loading: false,
    loadingVin: '',
  })

  function reset() {
    setState({
      data: null,
      error: '',
      loading: false,
      loadingVin: '',
    })
  }

  async function readLive(vin: string) {
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
      info,
      ...historial,
      ownerAddress,
    })
  }

  async function search(vinToSearch: string): Promise<PublicVehicleRecord | null> {
    const vin = normalizeVin(vinToSearch)
    if (!isValidVin(vin)) return null

    setState({
      data: null,
      error: '',
      loading: true,
      loadingVin: vin,
    })

    let fallbackReason: string | null = null

    try {
      const live = await withTimeout(readLive(vin), getTimeoutMs())
      setState({
        data: live,
        error: '',
        loading: false,
        loadingVin: '',
      })
      return live
    } catch (error) {
      fallbackReason = describeError(error)
    }

    const snapshot = getSnapshotVehicle(vin, fallbackReason)
    if (snapshot) {
      setState({
        data: snapshot,
        error: '',
        loading: false,
        loadingVin: '',
      })
      return snapshot
    }

    const demo = getDemoVehicleRecord(vin, fallbackReason)
    if (demo) {
      setState({
        data: demo,
        error: '',
        loading: false,
        loadingVin: '',
      })
      return demo
    }

    setState({
      data: null,
      error: fallbackReason
        ? `No se pudo resolver el VIN. Ultimo intento live: ${fallbackReason}.`
        : 'No se encontro ningun vehiculo con ese VIN.',
      loading: false,
      loadingVin: '',
    })
    return null
  }

  return {
    ...state,
    search,
    reset,
  }
}
