import { useEffect, useState } from 'react'
import { resetDemo } from './api.js'
import ActivityList from './components/ActivityList.jsx'
import Header from './components/Header.jsx'
import StockSection from './components/StockSection.jsx'
import VoicePanel from './components/VoicePanel.jsx'
import { useInventory } from './hooks/useInventory.js'
import { LANGUAGES } from './languages.js'

function readSaved(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [dark, setDark] = useState(() => readSaved('vv-theme', 'light') === 'dark')
  const [languageId, setLanguageId] = useState(() => readSaved('vv-lang', LANGUAGES[0].id))
  const { products, history, loading, error, refresh } = useInventory()

  const language = LANGUAGES.find((l) => l.id === languageId) || LANGUAGES[0]

  // Keep <html class="dark"> and the saved choice in step with the toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('vv-theme', dark ? 'dark' : 'light')
    } catch {
      /* storage blocked: the choice just won't be remembered */
    }
  }, [dark])

  function handleLanguageChange(id) {
    setLanguageId(id)
    try {
      localStorage.setItem('vv-lang', id)
    } catch {
      /* ignore */
    }
  }

  async function handleReset() {
    if (!window.confirm('Reset all stock and activity back to the demo data?')) return
    try {
      await resetDemo()
    } catch {
      /* refresh below shows the offline message if the server is down */
    }
    await refresh()
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-8 lg:px-12">
      <Header
        languageId={languageId}
        onLanguageChange={handleLanguageChange}
        dark={dark}
        onSetDark={setDark}
      />

      <main className="mt-8 space-y-14">
        <VoicePanel speechLang={language.speech} onChanged={refresh} />
        <StockSection products={products} loading={loading} error={error} />
        <ActivityList history={history} />
      </main>

      <footer className="mt-10">
        <button
          type="button"
          onClick={handleReset}
          className="text-base text-brand-600 underline underline-offset-4 hover:text-brand-500 dark:text-blue-300"
        >
          Reset demo
        </button>
      </footer>
    </div>
  )
}
