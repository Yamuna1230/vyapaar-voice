export function capitalize(text) {
  const s = String(text || '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// 45 -> "45", 2.5 -> "2.5", 1200 -> "1,200"
export function formatQty(n) {
  return Number(Number(n).toFixed(2)).toLocaleString('en-IN')
}

// "3:15 pm" for today, "18 Sep, 3:15 pm" for older entries
export function formatTime(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const time = d
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
  if (d.toDateString() === new Date().toDateString()) return time
  const day = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return day + ', ' + time
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// "Oil" / "Oil and Rice" / "Oil, Rice and Biscuits"
export function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}

// Enough to get back to twice the minimum
export function reorderQuantity(product) {
  const needed = product.minimum_quantity * 2 - product.current_quantity
  return Math.max(1, Math.ceil(needed))
}
