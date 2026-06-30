export function parseWalletConnectError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'No se pudo conectar la wallet'

  const msg = raw.split('\n')[0].trim()
  const lower = msg.toLowerCase()

  if (lower.includes('transport request timed out') || lower.includes('timeout')) {
    return 'MetaMask no respondió a tiempo. Reintentá el QR o usá la extensión.'
  }
  if (lower.includes('session expired') || lower.includes('expired')) {
    return 'El QR expiró. Generá uno nuevo e intentá de nuevo.'
  }
  if (lower.includes('user rejected') || lower.includes('user closed') || lower.includes('cancel')) {
    return 'Cancelaste la conexión en MetaMask.'
  }
  if (lower.includes('connection declined') || lower.includes('rejected')) {
    return 'MetaMask rechazó la conexión.'
  }
  if (lower.includes('without any listeners') || lower.includes('no matching key')) {
    return 'La sesión QR quedó inválida. Reintentá para generar un código nuevo.'
  }
  if (lower.includes('network') || lower.includes('fetch failed')) {
    return 'No hay conexión estable con MetaMask. Revisá tu red e intentá de nuevo.'
  }
  if (lower.includes('sepolia')) {
    return msg
  }

  return msg.length > 140 ? `${msg.slice(0, 137)}…` : msg
}
