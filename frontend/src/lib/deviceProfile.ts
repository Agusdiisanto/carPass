export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPR|Opera|Chromium/i.test(ua)
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/** Safari en iPhone/iPad: sin extensión MetaMask ni BarcodeDetector nativo. */
export function isIosSafari(): boolean {
  return isIosDevice() && isSafariBrowser()
}

export function hasBarcodeDetector(): boolean {
  if (typeof window === 'undefined') return false
  return 'BarcodeDetector' in window
}

/** Cámara + motor QR (nativo o html5-qrcode). */
export function canUseCameraScan(): boolean {
  if (typeof navigator === 'undefined') return false
  return 'mediaDevices' in navigator
}

/** Desktop/notebook: mostrar flujo companion en lugar de asumir camara util. */
export function prefersPhoneCompanion(): boolean {
  return !isMobileDevice()
}
