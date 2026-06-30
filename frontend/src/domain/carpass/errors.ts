import { Interface } from 'ethers'
import { CARPASS_ABI } from '../../contracts/carpassAbi'
import { VEHICLEPARTS_ABI } from '../../contracts/vehiclePartsAbi'
import { formatKm } from './formatters'

export function getRevertData(error: unknown): string | undefined {
  const raw = error as Record<string, unknown>
  return (
    (raw?.data as string) ??
    ((raw?.error as Record<string, unknown>)?.data as string) ??
    ((raw?.info as Record<string, unknown>)?.error as Record<string, unknown>)?.data as string
  )
}

export function parseContractError(error: unknown): string {
  const data = getRevertData(error)

  if (data) {
    try {
      const parsed = new Interface(CARPASS_ABI).parseError(data)
      if (parsed) {
        if (parsed.name === 'VehiculoYaRegistrado') return `El VIN ${parsed.args[0]} ya esta registrado`
        if (parsed.name === 'VehiculoNoEncontrado') return 'Vehiculo no encontrado en el contrato'
        if (parsed.name === 'KilometrajeNoMonotonico') {
          return `Kilometraje invalido: ${formatKm(parsed.args[0])} debe superar ${formatKm(parsed.args[1])}`
        }
        if (parsed.name === 'VinInvalido') return 'VIN invalido: debe tener exactamente 17 caracteres'
        if (parsed.name === 'TransferenciaSoloPropietario') return 'Solo el propietario puede transferir este vehiculo'
        if (parsed.name === 'AccessControlUnauthorizedAccount') return 'Tu wallet no tiene permisos para esta operacion'
        if (parsed.name === 'AccessControlBadConfirmation') return 'Confirmacion de rol invalida'
        return `Error del contrato: ${parsed.name}`
      }
    } catch {
      // Fall through to provider/browser messages.
    }
  }

  if (error instanceof Error) {
    const msg = error.message.split('\n')[0]
    if (msg.includes('user rejected')) return 'Transaccion cancelada por el usuario'
    if (msg.includes('insufficient funds')) return 'Fondos insuficientes para pagar el gas'
    if (msg.includes('execution reverted')) return 'El contrato rechazo la operacion'
    if (msg.includes('network')) return 'No se pudo conectar a la red'
    return msg.slice(0, 120)
  }

  return 'Transaccion rechazada'
}

export function parseVehiclePartsError(error: unknown): string {
  const data = getRevertData(error)

  if (data) {
    try {
      const parsed = new Interface(VEHICLEPARTS_ABI).parseError(data)
      if (parsed) {
        if (parsed.name === 'VehiculoInexistente') return 'El vehiculo no esta registrado en CarPass'
        if (parsed.name === 'PartesYaRegistradas') return 'Este vehiculo ya tiene autopartes registradas'
        if (parsed.name === 'PartesNoRegistradas') return 'Primero hay que registrar las 6 autopartes del vehiculo'
        if (parsed.name === 'NumeroGrabadoInvalido') return 'El numero de grabado no puede estar vacio'
        if (parsed.name === 'RolInsuficiente') return 'Tu wallet no tiene permisos para esta operacion'
        if (parsed.name === 'TransferenciaNoPermitida') return 'El token de autoparte no es transferible'
        return `Error del contrato: ${parsed.name}`
      }
    } catch {
      // Fall through to provider/browser messages.
    }
  }

  if (error instanceof Error) {
    const msg = error.message.split('\n')[0]
    if (msg.includes('user rejected')) return 'Transaccion cancelada por el usuario'
    if (msg.includes('insufficient funds')) return 'Fondos insuficientes para pagar el gas'
    if (msg.includes('execution reverted')) return 'El contrato rechazo la operacion'
    if (msg.includes('network')) return 'No se pudo conectar a la red'
    return msg.slice(0, 120)
  }

  return 'Transaccion rechazada'
}
