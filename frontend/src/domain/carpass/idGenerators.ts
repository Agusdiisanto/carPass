import { keccak256, toUtf8Bytes } from 'ethers'
import { VIN_LENGTH } from './validators'
import { TOTAL_TIPOS_PARTE } from './vehicleParts'
import { normalizeVin } from './formatters'

// Excluye I, O, Q como el estandar VIN real, para evitar confusion visual.
const VIN_CHARS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ'

export function generateVin(): string {
  let vin = ''
  for (let i = 0; i < VIN_LENGTH; i++) {
    vin += VIN_CHARS[Math.floor(Math.random() * VIN_CHARS.length)]
  }
  return vin
}

const TIPO_PARTE_PREFIX = ['MOT', 'CAJ', 'PDI', 'PDD', 'CAP', 'BAU']

export function generateNumeroGrabado(tipo: number): string {
  const prefix = TIPO_PARTE_PREFIX[tipo] ?? 'PRT'
  const random = Math.floor(100000 + Math.random() * 900000)
  return `${prefix}-${random}`
}

/** Deterministicos por VIN — mismos criterios que el seed on-chain. */
export function generateNumerosGrabadoForVin(vin: string): string[] {
  const suffix = vin.trim().toUpperCase().slice(-6)
  return TIPO_PARTE_PREFIX.map((prefix, index) => `${prefix}-${suffix}-${index + 1}`)
}

export function generateNumerosGrabado(vin?: string): string[] {
  if (vin?.trim()) return generateNumerosGrabadoForVin(vin)
  return Array.from({ length: TOTAL_TIPOS_PARTE }, (_, tipo) => generateNumeroGrabado(tipo))
}

export function vehicleTokenIdFromVin(vin: string): bigint {
  return BigInt(keccak256(toUtf8Bytes(normalizeVin(vin))))
}
