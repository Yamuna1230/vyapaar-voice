import { useMemo, useState } from 'react'
import { capitalize, joinNames } from '../format.js'
import { AlertIcon } from './Icons.jsx'
import StockCard from './StockCard.jsx'

export default function StockSection({ products, loading, error }) {
  const [tipId, setTipId] = useState(null)

  // Low stock first, then A to Z
  const sorted = useMemo(
    () =>
      [...products].sort(
        (a, b) => Number(b.low_stock) - Number(a.low_stock) || a.name.localeCompare(b.name),
      ),
    [products],
  )
  const low = sorted.filter((p) => p.low_stock)

  let summary = ''
  if (!loading && !error) {
    summary = `${products.length} ${products.length === 1 ? 'product' : 'products'}`
    if (low.length > 0) summary += `, ${low.length} running low`
  }

  return (
    <section aria-labelledby="stock-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="stock-title" className="text-3xl font-semibold tracking-tight">
          Your stock
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400">{summary}</p>
      </div>

      {error && (
        <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      )}

      {loading && <p className="mt-5 text-lg text-slate-500 dark:text-slate-400">Loading your stock…</p>}

      {!loading && !error && products.length === 0 && (
        <p className="mt-5 text-lg text-slate-500 dark:text-slate-400">
          No products yet. Reset the demo below to add a few.
        </p>
      )}

      {low.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50/80 px-5 py-4 text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300">
          <p className="flex items-center gap-3 text-lg">
            <AlertIcon className="size-6 shrink-0" />
            <span>
              {joinNames(low.map((p) => capitalize(p.name)))} {low.length === 1 ? 'is' : 'are'} below
              your minimum. You may want to reorder.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setTipId(low[0].id)}
            className="rounded-xl bg-white px-5 py-2.5 text-base font-medium text-slate-800 shadow-xs hover:bg-slate-50"
          >
            See suggestion
          </button>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))]">
            {sorted.map((p) => (
              <StockCard
                key={p.id}
                product={p}
                tipOpen={tipId === p.id}
                onToggleTip={() => setTipId(tipId === p.id ? null : p.id)}
              />
            ))}
          </div>
          <p className="mt-4 text-slate-500 dark:text-slate-400">
            The thin line on each bar marks your minimum.
          </p>
        </>
      )}
    </section>
  )
}
