import { isAddress } from 'ethers'
import type { VehiculoInfo } from '../../hooks/useCarPass'

export const VIN_LENGTH = 17

export function isValidVin(vin: string): boolean {
  return vin.length === VIN_LENGTH
}

export function isValidMileage(km: number, lastKm: number): boolean {
  return Number.isFinite(km) && km > lastKm
}

export function isValidWalletAddress(address: string): boolean {
  return isAddress(address)
}

export function isValidVehicleInfo(info: VehiculoInfo): boolean {
  return (
    isValidVin(info.vin) &&
    info.marca.trim().length > 0 &&
    info.modelo.trim().length > 0 &&
    info.color.trim().length > 0 &&
    Number.isInteger(info.anio) &&
    info.anio >= 1900 &&
    info.anio <= 2099
  )
}
