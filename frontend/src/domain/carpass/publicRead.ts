import snapshotData from '../../data/publicVehicleSnapshot.json'
import { DEMO_VEHICLES, findDemoVehicle } from './demoVehicles'
import { normalizeSelloCalidad, normalizeVehiculoInfo } from './vehicleInfo'
import type {
  RegistroService,
  RegistroSiniestro,
  RegistroVTV,
  SelloCalidad,
  VehiculoInfo,
} from '../../hooks/useCarPass'

export type VehicleReadSource = 'live' | 'snapshot' | 'demo'

export type PublicVehicleRecord = {
  source: VehicleReadSource
  sourceLabel: string
  syncedAt: string | null
  fallbackReason: string | null
  tokenId: bigint
  info: VehiculoInfo
  services: RegistroService[]
  siniestros: RegistroSiniestro[]
  vtv: RegistroVTV[]
  sello: SelloCalidad
  ownerAddress: string
}

export type PublicSnapshotMetadata = {
  schemaVersion: number
  network: string
  chainId: number
  contractAddress: string
  syncedAt: string | null
  blockNumber: number | null
  source: string
  vehicleCount: number
}

type SnapshotService = {
  timestamp: string
  tipoServicio: string
  kilometraje: string
  taller: string
  descripcion: string
}

type SnapshotSiniestro = {
  timestamp: string
  gravedad: number
  descripcion: string
  reparado: boolean
  costoEstimado: string
  declarante: string
}

type SnapshotVtv = {
  timestamp: string
  resultado: number
  vencimiento: string
  planta: string
}

type SnapshotVehicle = {
  tokenId: string
  info: VehiculoInfo
  services: SnapshotService[]
  siniestros: SnapshotSiniestro[]
  vtv: SnapshotVtv[]
  sello: SelloCalidad
  ownerAddress: string
}

type PublicSnapshot = {
  schemaVersion: number
  network: string
  chainId: number
  contractAddress: string
  syncedAt: string | null
  blockNumber: number | null
  source: string
  vehicles: Record<string, SnapshotVehicle>
}

const snapshot = snapshotData as PublicSnapshot
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const DAY = 24 * 60 * 60
const BASE_DEMO_TS = 1_719_000_000

export const PUBLIC_SNAPSHOT_METADATA: PublicSnapshotMetadata = {
  schemaVersion: snapshot.schemaVersion,
  network: snapshot.network,
  chainId: snapshot.chainId,
  contractAddress: snapshot.contractAddress,
  syncedAt: snapshot.syncedAt,
  blockNumber: snapshot.blockNumber,
  source: snapshot.source,
  vehicleCount: Object.keys(snapshot.vehicles).length,
}

export function getReadSourceLabel(source: VehicleReadSource) {
  if (source === 'live') return 'Live Sepolia'
  if (source === 'snapshot') return 'Snapshot Sepolia'
  return 'Demo local'
}

export function getReadSourceDetail(record: PublicVehicleRecord) {
  if (record.source === 'live') {
    return 'Lectura verificada en vivo contra el contrato CarPass en Sepolia.'
  }

  if (record.source === 'snapshot') {
    return record.syncedAt
      ? `Ultimo snapshot sincronizado desde Sepolia: ${new Date(record.syncedAt).toLocaleString('es-AR')}.`
      : 'Snapshot local generado desde Sepolia, sin fecha de sincronizacion disponible.'
  }

  return 'Datos locales de demostracion para sostener el flujo visual si Sepolia o el snapshot no responden.'
}

export function createLiveVehicleRecord(
  data: Omit<PublicVehicleRecord, 'source' | 'sourceLabel' | 'syncedAt' | 'fallbackReason'>,
): PublicVehicleRecord {
  return normalizePublicVehicleRecord({
    ...data,
    source: 'live',
    sourceLabel: getReadSourceLabel('live'),
    syncedAt: null,
    fallbackReason: null,
  })
}

export function normalizePublicVehicleRecord(record: PublicVehicleRecord): PublicVehicleRecord {
  return {
    ...record,
    info: normalizeVehiculoInfo(record.info),
    sello: normalizeSelloCalidad(record.sello),
  }
}

export function getSnapshotVehicle(vin: string, fallbackReason: string | null): PublicVehicleRecord | null {
  const vehicle = snapshot.vehicles[vin]
  if (!vehicle) return null

  return normalizePublicVehicleRecord({
    source: 'snapshot',
    sourceLabel: getReadSourceLabel('snapshot'),
    syncedAt: snapshot.syncedAt,
    fallbackReason,
    tokenId: BigInt(vehicle.tokenId),
    info: normalizeVehiculoInfo(vehicle.info),
    services: vehicle.services.map((record) => ({
      timestamp: BigInt(record.timestamp),
      tipoServicio: record.tipoServicio,
      kilometraje: BigInt(record.kilometraje),
      taller: record.taller,
      descripcion: record.descripcion,
    })),
    siniestros: vehicle.siniestros.map((record) => ({
      timestamp: BigInt(record.timestamp),
      gravedad: record.gravedad,
      descripcion: record.descripcion,
      reparado: record.reparado,
      costoEstimado: BigInt(record.costoEstimado),
      declarante: record.declarante,
    })),
    vtv: vehicle.vtv.map((record) => ({
      timestamp: BigInt(record.timestamp),
      resultado: record.resultado,
      vencimiento: BigInt(record.vencimiento),
      planta: record.planta,
    })),
    sello: normalizeSelloCalidad(vehicle.sello),
    ownerAddress: vehicle.ownerAddress,
  })
}

export function getDemoVehicleRecord(vin: string, fallbackReason: string | null): PublicVehicleRecord | null {
  const vehicle = findDemoVehicle(vin)
  if (!vehicle) return null

  const services = Array.from({ length: vehicle.services }, (_, index) => {
    const km = Math.round((vehicle.km / Math.max(vehicle.services, 1)) * (index + 1))
    return {
      timestamp: BigInt(BASE_DEMO_TS + index * 90 * DAY),
      tipoServicio: `Service ${km.toLocaleString('es-AR')} km`,
      kilometraje: BigInt(km),
      taller: ZERO_ADDRESS,
      descripcion: index === vehicle.services - 1 ? vehicle.reason : 'Mantenimiento preventivo registrado',
    }
  })

  const vtv = Array.from({ length: vehicle.vtv }, (_, index) => ({
    timestamp: BigInt(BASE_DEMO_TS + (index + 1) * 120 * DAY),
    resultado: vehicle.seal === 2 && vehicle.reason.toLowerCase().includes('vtv') ? 2 : vehicle.seal === 1 ? 1 : 0,
    vencimiento: vehicle.seal === 2 && vehicle.reason.toLowerCase().includes('rechazada')
      ? 0n
      : BigInt(BASE_DEMO_TS + 500 * DAY),
    planta: ZERO_ADDRESS,
  }))

  const siniestros = Array.from({ length: vehicle.siniestros }, (_, index) => ({
    timestamp: BigInt(BASE_DEMO_TS + (index + 1) * 150 * DAY),
    gravedad: vehicle.seal === 2 ? 2 : 0,
    descripcion: vehicle.reason,
    reparado: false,
    costoEstimado: 800000n,
    declarante: ZERO_ADDRESS,
  }))

  return normalizePublicVehicleRecord({
    source: 'demo',
    sourceLabel: getReadSourceLabel('demo'),
    syncedAt: null,
    fallbackReason,
    tokenId: BigInt(DEMO_VEHICLES.findIndex((item) => item.vin === vin) + 1),
    info: normalizeVehiculoInfo({
      vin: vehicle.vin,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      anio: vehicle.anio,
      color: vehicle.color,
    }),
    services,
    siniestros,
    vtv,
    sello: normalizeSelloCalidad({
      estado: vehicle.seal,
      motivo: vehicle.reason,
    }),
    ownerAddress: ZERO_ADDRESS,
  })
}
