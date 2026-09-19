import { useCallback, useEffect, useState } from 'react'
import { getHistory, getInventory } from '../api.js'

async function fetchAll() {
  const [products, history] = await Promise.all([getInventory(), getHistory(8)])
  if (!Array.isArray(products) || !Array.isArray(history)) {
    throw new Error('Unexpected response from the server')
  }
  return { products, history }
}

const OFFLINE = "Can't reach the server. Start the backend (npm run dev in the backend folder)."

export function useInventory() {
  const [products, setProducts] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load once when the page opens
  useEffect(() => {
    let ignore = false
    fetchAll()
      .then((data) => {
        if (ignore) return
        setProducts(data.products)
        setHistory(data.history)
        setError('')
      })
      .catch(() => {
        if (!ignore) setError(OFFLINE)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // Call after the stock changes
  const refresh = useCallback(async () => {
    try {
      const data = await fetchAll()
      setProducts(data.products)
      setHistory(data.history)
      setError('')
    } catch {
      setError(OFFLINE)
    }
  }, [])

  return { products, history, loading, error, refresh }
}
