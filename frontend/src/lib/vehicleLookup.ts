import { Contract, ZeroAddress } from 'ethers'
import { normalizeVin } from '../domain/carpass/formatters'
import { normalizeVehiculoInfo } from '../domain/carpass/vehicleInfo'
import { isValidVin, VIN_LENGTH } from '../domain/carpass/validators'
import type { VehiculoInfo } from '../hooks/useCarPass'
import { getSnapshotVehicle, getDemoVehicleRecord } from '../domain/carpass/publicRead'

export class VehicleLookupError extends Error {
  readonly code: 'not_found' | 'offline_data_only'
  readonly vin: string

  constructor(code: 'not_found' | 'offline_data_only', vin: string, message: string) {
    super(message)
    this.name = 'VehicleLookupError'
    this.code = code
    this.vin = vin
  }
}

function vinCandidates(vin: string): string[] {
  const trimmed = vin.trim()
  const upper = normalizeVin(trimmed)
  const lower = trimmed.toLowerCase()
  const out: string[] = []
  for (const candidate of [upper, trimmed, lower]) {
    if (candidate.length === VIN_LENGTH && !out.includes(candidate)) {
      out.push(candidate)
    }
  }
  return out
}

export async function vehicleExistsAtToken(c: Contract, tokenId: bigint): Promise<boolean> {
  try {
    if (await c.vehiculoExiste(tokenId)) return true
  } catch {
    // Deploys viejos sin vehiculoExiste — seguir con fallbacks.
  }

  try {
    const info = normalizeVehiculoInfo(await c.getVehiculoInfo(tokenId))
    if (isValidVin(normalizeVin(info.vin))) return true
  } catch {
    // ignore
  }

  try {
    const owner = String(await c.ownerOf(tokenId))
    return owner !== ZeroAddress
  } catch {
    return false
  }
}

export function explainOfflineVinAvailability(vin: string): 'snapshot' | 'demo' | null {
  const vinNorm = normalizeVin(vin)
  if (!isValidVin(vinNorm)) return null
  if (getSnapshotVehicle(vinNorm, null)) return 'snapshot'
  if (getDemoVehicleRecord(vinNorm, null)) return 'demo'
  return null
}

export function formatVehicleLookupError(vin: string, error: unknown): string {
  if (error instanceof VehicleLookupError) {
    if (error.code === 'offline_data_only') return error.message
    const offline = explainOfflineVinAvailability(vin)
    if (offline === 'snapshot') {
      return (
        'Este VIN figura en el snapshot local pero no está minteado en el CarPass de Sepolia al que apunta la app. ' +
        'Registralo en el panel 1 o ejecutá npm run seed:sepolia.'
      )
    }
    if (offline === 'demo') {
      return (
        'Este VIN es de la demo local (pasaporte público) y no existe on-chain. ' +
        'Registralo primero como vehículo nuevo o usá un VIN ya minteado en Sepolia.'
      )
    }
    return 'No se encontró un vehículo minteado con ese VIN en CarPass (Sepolia).'
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.split('\n')[0]
  }

  return 'No se pudo consultar el VIN en CarPass. Revisá la conexión a Sepolia.'
}

/** Resuelve vehículo por VIN con fallbacks para deploys y normalización. */
export async function resolveVehicleByVin(
  c: Contract,
  vin: string,
): Promise<{ tokenId: bigint; info: VehiculoInfo }> {
  const searchNorm = normalizeVin(vin)
  if (!isValidVin(searchNorm)) {
    throw new VehicleLookupError('not_found', searchNorm, 'VIN inválido')
  }

  const offline = explainOfflineVinAvailability(searchNorm)

  for (const candidate of vinCandidates(vin)) {
    const tokenId: bigint = await c.vinToTokenId(candidate)
    if (!(await vehicleExistsAtToken(c, tokenId))) continue

    const info = normalizeVehiculoInfo(await c.getVehiculoInfo(tokenId))
    const infoVin = normalizeVin(info.vin)
    if (!isValidVin(infoVin)) continue

    if (infoVin !== searchNorm && infoVin !== normalizeVin(candidate)) continue

    return {
      tokenId,
      info: { ...info, vin: infoVin },
    }
  }

  if (offline) {
    throw new VehicleLookupError(
      'offline_data_only',
      searchNorm,
      offline === 'demo'
        ? 'VIN disponible solo en demo local'
        : 'VIN disponible solo en snapshot local',
    )
  }

  throw new VehicleLookupError('not_found', searchNorm, 'Vehiculo no encontrado')
}
