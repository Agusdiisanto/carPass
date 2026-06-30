export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/** Desktop/notebook: mostrar flujo companion en lugar de asumir camara util. */
export function prefersPhoneCompanion(): boolean {
  return !isMobileDevice()
}

export function canUseCameraScan(): boolean {
  if (typeof navigator === 'undefined') return false
  return 'mediaDevices' in navigator && 'BarcodeDetector' in window
}
