'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import ConsentModal from './components/ConsentModal'

const ChatGPTInterface = dynamic(() => import('./components/ChatGPTInterface'), {
  ssr: false,
})

export default function Home() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null)
  const [threadId, setThreadId] = useState<string>('')

  useEffect(() => {
    // Check for existing consent
    const consent = localStorage.getItem('privacyConsent')
    setHasConsent(consent === 'true')

    // Get thread ID from URL or generate new one
    const params = new URLSearchParams(window.location.search)
    const urlThreadId = params.get('threadId')
    if (urlThreadId) {
      setThreadId(urlThreadId)
    } else {
      const newThreadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setThreadId(newThreadId)
      params.set('threadId', newThreadId)
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
    }
  }, [])

  const handleConsent = (accepted: boolean) => {
    setHasConsent(accepted)
    if (accepted) {
      localStorage.setItem('privacyConsent', 'true')
    }
  }

  if (hasConsent === null) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">読み込み中...</div>
    </div>
  }

  return (
    <main className="min-h-screen">
      {!hasConsent && <ConsentModal onConsent={handleConsent} />}
      {hasConsent && threadId && (
        <ChatGPTInterface threadId={threadId} />
      )}
    </main>
  )
}