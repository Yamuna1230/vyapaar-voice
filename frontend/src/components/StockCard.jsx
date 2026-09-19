import { capitalize, formatQty, reorderQuantity } from '../format.js'

const ICONS = { oil: '🛢️', biscuits: '🍪', rice: '🌾' }

export default function StockCard({ product, tipOpen, onToggleTip }) {
  const { name, unit, current_quantity: qty, minimum_quantity: min, low_stock: low } = product

  // The bar shows stock against a scale that always has room for the minimum marker
  const scale = Math.max(qty, min * 2, 1)
  const fill = Math.min(100, (qty / scale) * 100)
  const marker = Math.min(100, (min / scale) * 100)
  const tipId = 'reorder-tip-' + product.id

  return (
    <article
      className={`glass rounded-[1.75rem] p-6 ${low ? 'border-[1.5px] border-red-500' : ''}`}
    >
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-xs dark:bg-white/10">
          {ICONS[name] || '📦'}
        </span>
        <div>
          <h3 className="text-2xl font-semibold">{capitalize(name)}</h3>
          <p
            className={`text-base ${
              low ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {low ? 'Below minimum of' : 'Minimum'} {formatQty(min)} {unit}
          </p>
        </div>
      </div>

      <p className="mt-5 flex items-baseline gap-2">
        <span className="text-6xl font-semibold tracking-tight">{formatQty(qty)}</span>
        <span className="text-xl text-slate-500 dark:text-slate-400">{unit}</span>
      </p>

      <div
        className="relative mt-5 flex h-5 items-center"
        role="img"
        aria-label={`${formatQty(qty)} ${unit} in stock, minimum ${formatQty(min)}`}
      >
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className={`h-full rounded-full ${low ? 'bg-red-600' : 'bg-green-700'}`}
            style={{ width: fill + '%' }}
          />
        </div>
        <span
          className="absolute top-0 h-5 w-0.5 rounded-full bg-slate-700 dark:bg-slate-200"
          style={{ left: marker + '%' }}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span
          className={`whitespace-nowrap rounded-full border px-4 py-2 text-base font-medium ${
            low
              ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300'
              : 'border-green-300 bg-green-50 text-green-800 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-300'
          }`}
        >
          {low ? 'Low stock' : 'In stock'}
        </span>
        {low && (
          <button
            type="button"
            onClick={onToggleTip}
            aria-expanded={tipOpen}
            aria-controls={tipId}
            className="whitespace-nowrap rounded-full bg-white px-5 py-2 text-base font-medium shadow-xs hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/20"
          >
            Reorder tip
          </button>
        )}
      </div>

      {low && tipOpen && (
        <p
          id={tipId}
          className="mt-4 rounded-2xl bg-brand-50 p-4 text-base text-brand-600 dark:bg-brand-500/10 dark:text-blue-200"
        >
          Order about {formatQty(reorderQuantity(product))} {unit} of {name} to get back to twice
          your minimum ({formatQty(min * 2)} {unit}).
        </p>
      )}
    </article>
  )
}
