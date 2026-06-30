import { VIN_LENGTH } from './validators'
import { TOTAL_TIPOS_PARTE } from './vehicleParts'

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

export function generateNumerosGrabado(): string[] {
  return Array.from({ length: TOTAL_TIPOS_PARTE }, (_, tipo) => generateNumeroGrabado(tipo))
}
