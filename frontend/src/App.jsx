import { useEffect, useMemo, useState } from 'react'

const SAMPLE_PHRASES = [
  '20 bags rice vachindi',
  'Rice stock entha undi?',
  'Remove 50 bags of rice',
]

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function joinNames(names) {
  const list =
    names.length > 1
      ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
      : names[0]
  return list.charAt(0).toUpperCase() + list.slice(1)
}

function MicIcon({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 14a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 14Z" />
      <path d="M6.5 10.5a1 1 0 1 0-2 0 7.5 7.5 0 0 0 6.5 7.43V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7.5 7.5 0 0 0 19.5 10.5a1 1 0 1 0-2 0 5.5 5.5 0 1 1-11 0Z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </svg>
  )
}

function ProductArt({ name }) {
  const n = name.toLowerCase()
  if (n.includes('oil')) {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect x="14" y="10" width="20" height="28" rx="4" fill="#dbe7ff" />
        <rect x="18" y="6" width="12" height="6" rx="2" fill="#3b6ef5" />
        <rect x="18" y="18" width="12" height="12" rx="2" fill="#3b6ef5" />
      </svg>
    )
  }
  if (n.includes('biscuit')) {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <circle cx="24" cy="24" r="14" fill="#f3c9a3" />
        <circle cx="19" cy="20" r="2" fill="#c9844e" />
        <circle cx="27" cy="22" r="2" fill="#c9844e" />
        <circle cx="22" cy="28" r="2" fill="#c9844e" />
        <circle cx="29" cy="29" r="1.6" fill="#c9844e" />
      </svg>
    )
  }
  if (n.includes('rice') || n.includes('wheat')) {
    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path d="M24 8c8 7 10 18 4 28" stroke="#65a30d" strokeWidth="3" fill="none" />
        <ellipse cx="20" cy="16" rx="5" ry="3" fill="#84cc16" />
        <ellipse cx="19" cy="22" rx="5" ry="3" fill="#65a30d" />
        <ellipse cx="21" cy="28" rx="5" ry="3" fill="#4d7c0f" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
      <rect x="12" y="14" width="24" height="22" rx="4" fill="#dbe7ff" />
      <path d="M12 20h24" stroke="#3b6ef5" strokeWidth="2" />
    </svg>
  )
}

function StockCard({ p, highlighted }) {
  const max = Math.max(p.current_quantity, p.minimum_quantity * 2, 1)
  const fill = Math.min((p.current_quantity / max) * 100, 100)
  const tick = Math.min((p.minimum_quantity / max) * 100, 100)
  const low = p.low_stock

  return (
    <article
      id={'product-' + p.id}
      className={
        'stock-card rounded-[28px] p-5 transition ' +
        (low ? 'border-red-300 ring-1 ring-red-200/70' : '') +
        (highlighted ? ' ring-2 ring-brand' : '')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <ProductArt name={p.name} />
          <h3 className="mt-3 text-lg font-semibold capitalize">{p.name}</h3>
          <p className={'text-sm ' + (low ? 'font-medium text-red-600' : 'text-[var(--muted)]')}>
            {low ? 'Below minimum of ' : 'Minimum '}
            {p.minimum_quantity} {p.unit}
          </p>
        </div>
        <p className="text-right leading-none">
          <span className="block text-5xl font-extrabold tracking-tight">{p.current_quantity}</span>
          <span className="mt-2 block text-sm text-[var(--muted)]">{p.unit}</span>
        </p>
      </div>

      <div className="relative mt-6 h-2 rounded-full" style={{ background: 'var(--bar)' }}>
        <div
          className={'h-full rounded-full ' + (low ? 'bg-red-500' : 'bg-emerald-500')}
          style={{ width: fill + '%' }}
        />
        <div
          className="absolute -top-1 h-4 w-0.5 bg-slate-700/70 dark:bg-white/80"
          style={{ left: tick + '%' }}
          title="Your minimum"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {low ? (
          <>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/15">
              Low stock
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-medium text-[var(--muted)]" style={{ background: 'var(--chip)' }}>
              Reorder tip
            </span>
          </>
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            In stock
          </span>
        )}
      </div>
    </article>
  )
}

export default function App() {
  const [products, setProducts] = useState([])
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(() => localStorage.getItem('vv-theme') === 'dark')
  const [focusId, setFocusId] = useState(null)
  const [suggestion, setSuggestion] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('vv-theme', dark ? 'dark' : 'light')
  }, [dark])

  async function loadData() {
    try {
      const [invRes, histRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/history?limit=10'),
      ])
      if (!invRes.ok || !histRes.ok) throw new Error('Server error')
      const nextProducts = await invRes.json()
      nextProducts.sort((a, b) => Number(b.low_stock) - Number(a.low_stock) || a.name.localeCompare(b.name))
      setProducts(nextProducts)
      setHistory(await histRes.json())
      setError('')
    } catch {
      setError(
        "Can't reach the server. Start the backend (run node server.js in the backend folder), then refresh."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialLoad = setTimeout(loadData, 0)
    return () => clearTimeout(initialLoad)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    alert('Understanding typed commands arrives in the next stage.')
  }

  const lowStock = useMemo(() => products.filter((p) => p.low_stock), [products])

  function seeSuggestion() {
    const first = lowStock[0]
    if (!first) return
    setFocusId(first.id)
    setSuggestion(
      'Reorder ' +
        first.name +
        ' to at least ' +
        first.minimum_quantity +
        ' ' +
        first.unit +
        '. You currently have ' +
        first.current_quantity +
        '.'
    )
    document.getElementById('product-' + first.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function resetDemo() {
    setSuggestion('')
    setFocusId(null)
    setText('')
    setLoading(true)
    await loadData()
  }

  return (
    <div className="app-shell min-h-screen px-4 pb-16 pt-5 sm:px-6">
      <header className="glass-bar sticky top-4 z-20 mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-4 py-2.5 sm:px-5">
        <a href="/" className="flex items-center gap-3 no-underline">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-white shadow-sm">
            <MicIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">VyapaarVoice</span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <p className="hidden items-center gap-1.5 text-sm text-[var(--muted)] sm:flex">
            <GlobeIcon />
            Telugu and English
          </p>
          <div className="flex rounded-full p-1" style={{ background: 'var(--chip)' }}>
            <button
              type="button"
              onClick={() => setDark(true)}
              className={'rounded-full px-3 py-1 text-sm ' + (dark ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-[var(--muted)]')}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setDark(false)}
              className={'rounded-full px-3 py-1 text-sm ' + (!dark ? 'bg-white text-slate-900 shadow-sm' : 'text-[var(--muted)]')}
            >
              Light
            </button>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
            LK
          </span>
        </div>
      </header>

      <main className="mx-auto mt-16 max-w-5xl">
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Talk to your inventory.</h1>
          <p className="mt-3 text-lg text-[var(--muted)]">
            {greeting()}. Say what came in or went out.
          </p>

          <div className="relative mx-auto my-10 grid h-44 w-44 place-items-center">
            <button
              type="button"
              onClick={() => alert('Voice input arrives in an upcoming stage.')}
              aria-label="Tap to speak"
              className="mic-ring grid h-28 w-28 place-items-center rounded-full bg-brand text-white transition"
            >
              <MicIcon className="h-10 w-10" />
            </button>
          </div>
          <p className="text-[var(--muted)]">Tap to speak</p>

          <p className="mt-10 text-sm text-[var(--muted)]">Try saying</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SAMPLE_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => setText(phrase)}
                className="rounded-full px-4 py-2 text-sm shadow-sm"
                style={{ background: 'var(--chip)', border: '1px solid var(--card-border)' }}
              >
                {phrase}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-3xl items-center gap-2 rounded-[28px] border border-[var(--card-border)] bg-white/80 p-2 shadow-sm dark:bg-white/5"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Or type here"
              aria-label="Type an inventory command"
              className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-base outline-none"
            />
            <button
              type="submit"
              className="rounded-2xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
            >
              Send
            </button>
          </form>
        </section>

        <section className="mt-16">
          {error && (
            <div className="alert-banner mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  loadData()
                }}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm"
              >
                Try again
              </button>
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Your stock</h2>
            <p className="text-sm text-[var(--muted)]">
              {loading ? 'Loading your stock…' : products.length + ' products'}
              {!loading && lowStock.length > 0 ? ', ' + lowStock.length + ' running low' : ''}
            </p>
          </div>

          {!loading && lowStock.length > 0 && (
            <div className="alert-banner mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-red-200 px-4 py-3 text-red-700 dark:text-red-300">
              <p className="flex items-center gap-2 font-medium">
                <span aria-hidden="true">⚠</span>
                {joinNames(lowStock.map((p) => p.name))} {lowStock.length === 1 ? 'is' : 'are'} below
                your minimum. You may want to reorder.
              </p>
              <button
                type="button"
                onClick={seeSuggestion}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:bg-white/10 dark:text-white"
              >
                See suggestion
              </button>
            </div>
          )}

          {suggestion && (
            <p className="mb-5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
              {suggestion}
            </p>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="skeleton h-52 rounded-[28px]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-card rounded-[28px] px-6 py-12 text-center">
              <h3 className="text-2xl font-bold">Your shelves are ready</h3>
              <p className="mx-auto mt-2 max-w-sm text-[var(--muted)]">
                Say or type your first stock update to see your inventory here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                {products.map((p) => (
                  <StockCard key={p.id} p={p} highlighted={focusId === p.id} />
                ))}
              </div>
              <p className="mt-4 text-sm text-[var(--muted)]">
                The thin line on each bar marks your minimum.
              </p>
            </>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-3xl font-bold tracking-tight">Recent activity</h2>
          <ul className="activity-card mt-4 overflow-hidden rounded-[28px]">
            {history.length === 0 && (
              <li className="px-5 py-5 text-[var(--muted)]">
                Nothing yet. Say “Add 20 bags of rice” to log your first change.
              </li>
            )}
            {history.map((h) => {
              const added = h.action === 'ADD_STOCK'
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 border-b border-[var(--card-border)] px-5 py-4 last:border-b-0"
                >
                  <span
                    className={
                      'grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-bold ' +
                      (added ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')
                    }
                  >
                    {added ? '+' : '−'}
                  </span>
                  <span className="flex-1">
                    {added ? 'Added' : 'Removed'} {h.quantity} {h.unit} of{' '}
                    <span className="font-semibold capitalize">{h.product}</span>
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {new Date(h.created_at).toLocaleTimeString('en-IN', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={resetDemo}
            className="mt-4 text-sm text-brand hover:underline"
          >
            Reset demo
          </button>
        </section>
      </main>
    </div>
  )
}
