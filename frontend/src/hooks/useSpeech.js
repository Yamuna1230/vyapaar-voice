import { useCallback, useEffect, useRef, useState } from 'react'

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined

const ERRORS = {
  'not-allowed': 'Microphone access is blocked. Allow it in the address bar, then tap the mic again.',
  'service-not-allowed': 'Microphone access is blocked. Allow it in the address bar, then tap the mic again.',
  'no-speech': "I didn't hear anything. Tap the mic and try again.",
  'audio-capture': 'No microphone found. Connect one, or type below.',
  network: 'Voice needs an internet connection. You can type below instead.',
}

// Browser speech-to-text (works in Chrome and Edge).
// onFinal(text) is called once, when the person stops speaking.
export function useSpeech({ lang, onFinal }) {
  const recRef = useRef(null)
  const onFinalRef = useRef(onFinal)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  // Stop the microphone if the component goes away
  useEffect(() => {
    return () => {
      if (recRef.current) recRef.current.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (!Recognition) return
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    let finalText = ''
    rec.onresult = (event) => {
      let live = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const part = event.results[i]
        if (part.isFinal) finalText += part[0].transcript
        else live += part[0].transcript
      }
      setInterim((finalText + live).trim())
    }
    rec.onerror = (event) => {
      if (event.error === 'aborted') return
      setError(ERRORS[event.error] || 'Voice input failed. You can type below instead.')
    }
    rec.onend = () => {
      recRef.current = null
      setListening(false)
      setInterim('')
      const spoken = finalText.trim()
      if (spoken && onFinalRef.current) onFinalRef.current(spoken)
    }

    setError('')
    setInterim('')
    try {
      rec.start()
      recRef.current = rec
      setListening(true)
    } catch {
      setError('Voice input failed. You can type below instead.')
    }
  }, [lang])

  const stop = useCallback(() => {
    if (recRef.current) recRef.current.stop()
  }, [])

  return { supported: Boolean(Recognition), listening, interim, error, start, stop }
}
