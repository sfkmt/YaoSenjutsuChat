'use client'

import { useState } from 'react'

interface ConsentModalProps {
  onConsent: (accepted: boolean) => void
}

export default function ConsentModal({ onConsent }: ConsentModalProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleAccept = () => {
    setIsOpen(false)
    onConsent(true)
  }

  const handleDecline = () => {
    setIsOpen(false)
    onConsent(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          プライバシーポリシーへの同意
        </h2>
        <div className="mb-6 text-gray-600 space-y-3">
          <p>
            当サービスでは、占星術の計算を行うために以下の情報をお預かりします：
          </p>
          <ul className="list-disc list-inside ml-2">
            <li>生年月日</li>
            <li>出生地（都市名）</li>
          </ul>
          <p>
            これらの情報は占星術チャートの作成にのみ使用され、セッション中のみ保持されます。
          </p>
          <p className="text-sm">
            詳細は
            <a href="/privacy" className="text-blue-600 hover:underline mx-1">
              プライバシーポリシー
            </a>
            をご確認ください。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            同意する
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            同意しない
          </button>
        </div>
      </div>
    </div>
  )
}