import { useEffect, useState } from 'react'
import { findDemoVehicle } from '../domain/carpass/demoVehicles'
import { resolveVehicleImageUrl, type VehicleMediaInput } from '../domain/carpass/vehicleMedia'

function getInitialDemoImage(vin: string): string | undefined {
  return findDemoVehicle(vin)?.imageUrl
}

export function useVehicleMedia(input: VehicleMediaInput) {
  const { vin, marca, modelo, anio } = input
  const curated = getInitialDemoImage(vin)
  const [imageUrl, setImageUrl] = useState<string | undefined>(curated)
  const [loading, setLoading] = useState(!curated)

  useEffect(() => {
    let cancelled = false
    const demoUrl = getInitialDemoImage(vin)
    setImageUrl(demoUrl)
    setLoading(!demoUrl)

    void resolveVehicleImageUrl({ vin, marca, modelo, anio }).then((url) => {
      if (cancelled) return
      setImageUrl(url ?? undefined)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [vin, marca, modelo, anio])

  return { imageUrl, loading }
}
