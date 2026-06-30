import { useEffect, useState } from 'react'
import {
  getChainActivities,
  subscribeChainActivity,
  type ChainActivityEntry,
} from '../lib/chainActivity'

export function useChainActivities(): ChainActivityEntry[] {
  const [items, setItems] = useState<ChainActivityEntry[]>(() => getChainActivities())

  useEffect(() => {
    return subscribeChainActivity(() => {
      setItems(getChainActivities())
    })
  }, [])

  return items
}
