import { Interface } from 'ethers'
import { CARPASS_ABI } from '../../contracts/carpassAbi'
import { VEHICLEPARTS_ABI } from '../../contracts/vehiclePartsAbi'
import { formatKm } from './formatters'

export function getRevertData(error: unknown): string | undefined {
  const visited = new Set<unknown>()

  function walk(err: unknown): string | undefined {
    if (err == null || visited.has(err)) return undefined
    visited.add(err)

    const raw = err as Record<string, unknown>
    const data = raw.data
    if (typeof data === 'string' && data.startsWith('0x') && data.length > 2) {
      return data
    }

    return walk(raw.error) ?? walk(raw.info)
  }

  return walk(error)
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
    if (msg.includes('Conecta MetaMask')) return msg
    if (msg.includes('cancelad')) return msg
    if (msg.includes('Sepolia')) return msg
    if (msg.includes('cuenta activa')) return msg
    if (msg.includes('user rejected')) return 'Transaccion cancelada por el usuario'
    if (msg.includes('insufficient funds')) return 'Fondos insuficientes para pagar el gas'
    if (msg.includes('missing revert data')) {
      return 'El contrato rechazó la operación pero el nodo no devolvió el motivo. Revisá que tu wallet tenga el rol correcto y que el vehículo exista.'
    }
    if (msg.includes('execution reverted')) return 'El contrato rechazo la operacion'
    if (msg.includes('network')) return 'No se pudo conectar a la red'
    return msg.slice(0, 160)
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
        if (parsed.name === 'ERC721InvalidReceiver') {
          return 'El propietario del vehículo no acepta NFTs (wallet contrato). Transferí el pasaporte a una EOA.'
        }
        if (parsed.name === 'ERC721InvalidOwner') return 'Propietario del vehículo inválido para mintear autopartes'
        if (parsed.name === 'ERC721InvalidSender') return 'No se pudo mintear la autoparte: sender inválido'
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
    if (msg.includes('token already minted') || msg.includes('ERC721')) {
      return 'Ese número de grabado ya fue registrado. Generá otros números e intentá de nuevo.'
    }
    if (msg.includes('missing revert data')) {
      return 'El contrato rechazó la operación pero el nodo no devolvió el motivo. Revisá rol Concesionaria, que el vehículo exista y que las autopartes no estén ya registradas.'
    }
    if (msg.includes('execution reverted')) return 'El contrato rechazo la operacion'
    if (msg.includes('network')) return 'No se pudo conectar a la red'
    return msg.slice(0, 160)
  }

  return 'Transaccion rechazada'
}

export function isGenericVehiclePartsRejection(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return (
    normalized === 'el contrato rechazo la operacion' ||
    normalized.startsWith('missing revert data') ||
    normalized === 'transaccion rechazada'
  )
}
