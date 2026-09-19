import { capitalize, formatQty, formatTime } from '../format.js'
import { MinusIcon, PlusIcon } from './Icons.jsx'

export default function ActivityList({ history }) {
  return (
    <section aria-labelledby="activity-title">
      <h2 id="activity-title" className="text-3xl font-semibold tracking-tight">
        Recent activity
      </h2>

      {history.length === 0 ? (
        <p className="mt-5 text-lg text-slate-500 dark:text-slate-400">
          Nothing yet. Say or type what came in or went out, and it will show up here.
        </p>
      ) : (
        <ul className="glass mt-5 divide-y divide-slate-200/70 rounded-[1.75rem] dark:divide-white/10">
          {history.map((item) => {
            const added = item.action === 'ADD_STOCK'
            return (
              <li key={item.id} className="flex items-center gap-4 px-5 py-5 sm:gap-5 sm:px-8">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${
                    added
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
                      : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300'
                  }`}
                >
                  {added ? <PlusIcon className="size-5" /> : <MinusIcon className="size-5" />}
                </span>
                <p className="flex-1 text-lg">
                  {added ? 'Added' : 'Removed'} {formatQty(item.quantity)} {item.unit} of{' '}
                  <strong className="font-semibold">{capitalize(item.product)}</strong>
                </p>
                <time
                  dateTime={new Date(item.created_at).toISOString()}
                  className="shrink-0 text-base text-slate-500 dark:text-slate-400"
                >
                  {formatTime(item.created_at)}
                </time>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
