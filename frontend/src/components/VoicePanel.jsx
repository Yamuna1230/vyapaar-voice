import { useCallback, useRef, useState } from 'react'
import { sendCommand } from '../api.js'
import { getGreeting } from '../format.js'
import { useSpeech } from '../hooks/useSpeech.js'
import { CheckIcon, AlertIcon, MicIcon, StopIcon } from './Icons.jsx'

const EXAMPLES = ['20 bags rice vachindi', 'Rice stock entha undi?', 'Remove 50 bags of rice']

const TONES = {
  success:
    'border-green-200 bg-green-50 text-green-900 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-200',
  info: 'border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-blue-200',
  confirm:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200',
}

function ResultCard({ result, onConfirm, onCancel }) {
  const Icon = result.kind === 'success' ? CheckIcon : AlertIcon
  return (
    <div
      className={`mx-auto max-w-xl rounded-2xl border px-5 py-4 text-left ${TONES[result.kind]}`}
    >
      {result.heard && (
        <p className="mb-1 text-sm opacity-70">Heard: “{result.heard}”</p>
      )}
      <p className="flex items-start gap-3 text-lg font-medium">
        {result.kind !== 'info' && <Icon className="mt-1 size-5 shrink-0" />}
        <span>{result.message}</span>
      </p>
      {result.kind === 'confirm' && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-amber-600 px-5 py-2 text-base font-semibold text-white hover:bg-amber-700"
          >
            Yes, continue
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white px-5 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-200"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default function VoicePanel({ speechLang, onChanged }) {
  const [greeting] = useState(getGreeting)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  // Send one command to the backend and show what happened
  const run = useCallback(
    async (command, { source, force = false }) => {
      setBusy(true)
      try {
        const res = await sendCommand(command, { source, force })
        if (res.status === 'done') {
          const isCheck = res.intent === 'CHECK_STOCK'
          setResult({ kind: isCheck ? 'info' : 'success', message: res.message, heard: command })
          if (!isCheck) onChanged()
        } else if (res.status === 'needs_confirmation') {
          setResult({ kind: 'confirm', message: res.message, heard: command, source })
        } else {
          setResult({ kind: 'error', message: res.message, heard: command })
        }
      } catch {
        setResult({
          kind: 'error',
          message: "Can't reach the server. Make sure the backend is running.",
          heard: command,
        })
      } finally {
        setBusy(false)
      }
    },
    [onChanged],
  )

  const handleSpoken = useCallback(
    (spoken) => {
      run(spoken, { source: 'voice' })
    },
    [run],
  )

  const { supported, listening, interim, error, start, stop } = useSpeech({
    lang: speechLang,
    onFinal: handleSpoken,
  })

  function handleMic() {
    if (listening) {
      stop()
      return
    }
    setResult(null)
    start()
  }

  function handleSubmit(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    setText('')
    setResult(null)
    run(value, { source: 'typed' })
  }

  function fillExample(example) {
    setText(example)
    if (inputRef.current) inputRef.current.focus()
  }

  let status = 'Tap to speak'
  if (listening) status = 'Listening… tap to stop'
  else if (busy) status = 'Updating your stock…'

  return (
    <section className="glass rounded-[2rem] px-5 py-10 text-center sm:px-12 sm:py-12">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Talk to your inventory.</h1>
      <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
        {greeting}. Say what came in or went out.
      </p>

      <div className="mt-9 flex justify-center">
        <div
          className={`relative grid size-56 place-items-center rounded-full border border-brand-500/15 bg-white/40 sm:size-68 dark:bg-white/5 ${
            listening ? 'is-listening' : ''
          }`}
        >
          <span className="mic-ring" />
          <span className="mic-ring" />
          <span className="absolute size-44 rounded-full bg-brand-500/10 ring-1 ring-brand-500/10 sm:size-52" />
          <button
            type="button"
            onClick={handleMic}
            disabled={!supported || busy}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Start speaking'}
            className="relative grid size-36 place-items-center rounded-full bg-linear-to-b from-[#3d6bee] to-[#2748c9] text-white shadow-[0_18px_40px_-10px_rgba(39,72,201,0.7)] transition-transform hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:size-42"
          >
            {listening ? <StopIcon className="size-12" /> : <MicIcon className="size-14" />}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xl font-medium text-slate-600 dark:text-slate-300" aria-live="polite">
        {status}
      </p>

      <div className="mt-6 min-h-24" aria-live="polite">
        {listening && (
          <p className="text-xl text-slate-500 dark:text-slate-400">
            {interim ? `“${interim}”` : 'Say something like “20 bags rice vachindi”'}
          </p>
        )}
        {!listening && error && (
          <ResultCard result={{ kind: 'error', message: error }} />
        )}
        {!listening && !error && !supported && (
          <ResultCard
            result={{
              kind: 'info',
              message: "Voice input isn't available in this browser. Use Chrome or Edge, or type below.",
            }}
          />
        )}
        {!listening && !error && result && (
          <ResultCard
            result={result}
            onConfirm={() => run(result.heard, { source: result.source, force: true })}
            onCancel={() => setResult({ kind: 'info', message: 'Cancelled. Your stock was not changed.' })}
          />
        )}
      </div>

      <p className="mt-6 text-slate-500 dark:text-slate-400">Try saying</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => fillExample(example)}
            className="rounded-full bg-white/80 px-5 py-3 text-base text-slate-700 shadow-xs transition-colors hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
          >
            {example}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex items-center gap-3 rounded-2xl bg-white/80 p-2 pl-6 dark:bg-white/10"
      >
        <label htmlFor="typed-command" className="sr-only">
          Type what came in or went out
        </label>
        <input
          id="typed-command"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or type here"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-3 text-lg outline-hidden placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-2xl bg-brand-500 px-7 py-3.5 text-lg font-semibold text-white shadow-[0_10px_24px_-8px_rgba(47,93,224,0.8)] transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  )
}
