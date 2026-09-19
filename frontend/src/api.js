// All calls to the backend. Vite proxies /api to http://localhost:4000 (see vite.config.js).
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* not JSON */
  }
  // The backend answers business errors as { status: 'error', ... }; those are fine to return.
  if (data === null || (!res.ok && !data.status)) {
    throw new Error('Request failed: ' + res.status)
  }
  return data
}

export const getInventory = () => request('/api/inventory')

export const getHistory = (limit = 8) => request('/api/history?limit=' + limit)

export const sendCommand = (text, { force = false, source = 'typed' } = {}) =>
  request('/api/command', {
    method: 'POST',
    body: JSON.stringify({ text, force, source }),
  })

export const resetDemo = () => request('/api/reset-demo', { method: 'POST' })
