export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          プライバシーポリシー
        </h1>
        
        <div className="space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              1. 収集する情報
            </h2>
            <p>
              当サービスでは、占星術チャートの作成のために以下の情報を収集します：
            </p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>生年月日</li>
              <li>出生地（都市名）</li>
              <li>会話履歴</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              2. 情報の利用目的
            </h2>
            <p>
              収集した情報は以下の目的でのみ使用されます：
            </p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>占星術チャートの計算</li>
              <li>パーソナライズされたアドバイスの提供</li>
              <li>会話の継続性の維持</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              3. 情報の保管
            </h2>
            <p>
              お客様の情報はセッション中のみ保持され、以下の条件で管理されます：
            </p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>暗号化されたデータベースに保存</li>
              <li>30日間の自動削除設定</li>
              <li>第三者への提供は一切行いません</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              4. Cookieの使用
            </h2>
            <p>
              当サービスでは、プライバシー同意状態の保存のためにローカルストレージを使用します。
              これは技術的に必要な最小限の使用に限定されています。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-700">
              5. お問い合わせ
            </h2>
            <p>
              プライバシーに関するご質問やご懸念がございましたら、
              サポートまでお問い合わせください。
            </p>
          </section>

          <section className="pt-6 border-t">
            <p className="text-sm text-gray-500">
              最終更新日: 2025年9月8日
            </p>
          </section>
        </div>

        <div className="mt-8">
          <a 
            href="/"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  )
}