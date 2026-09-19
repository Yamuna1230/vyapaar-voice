import { LANGUAGES } from '../languages.js'
import { GlobeIcon, MicIcon } from './Icons.jsx'

const OWNER_INITIALS = 'LK'

export default function Header({ languageId, onLanguageChange, dark, onSetDark }) {
  const toggleBase = 'rounded-full px-4 py-2 text-base font-medium transition-colors'
  const on = 'bg-brand-500 text-white shadow-sm'
  const off = 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'

  return (
    <header className="glass sticky top-4 z-20 flex items-center justify-between gap-3 rounded-3xl px-4 py-3 sm:px-7 sm:py-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-500 text-white">
          <MicIcon className="size-5" />
        </span>
        <span className="text-xl font-semibold tracking-tight sm:text-2xl">VyapaarVoice</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <label className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 focus-within:ring-2 focus-within:ring-brand-500 dark:bg-white/10">
          <GlobeIcon className="size-5 shrink-0 text-slate-600 dark:text-slate-300" />
          <span className="sr-only">Speaking language</span>
          <select
            value={languageId}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="max-w-[9.5rem] cursor-pointer appearance-none truncate bg-transparent text-base font-medium outline-hidden sm:max-w-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} className="text-slate-900">
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <div
          role="group"
          aria-label="Theme"
          className="flex rounded-full bg-white/70 p-1 dark:bg-white/10"
        >
          <button
            type="button"
            aria-pressed={dark}
            onClick={() => onSetDark(true)}
            className={`${toggleBase} ${dark ? on : off}`}
          >
            Dark
          </button>
          <button
            type="button"
            aria-pressed={!dark}
            onClick={() => onSetDark(false)}
            className={`${toggleBase} ${!dark ? on : off}`}
          >
            Light
          </button>
        </div>

        <span
          title="Shop owner"
          className="hidden size-12 place-items-center rounded-full bg-white text-sm font-bold shadow-sm sm:grid dark:bg-white/15"
        >
          {OWNER_INITIALS}
        </span>
      </div>
    </header>
  )
}
