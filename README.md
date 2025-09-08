# YaoSenjutsu AI Chat

占星術AIチャットボット - Mastraフレームワークを使用した占星術コーチングアプリケーション

## 概要

YaoSenjutsu AI Chatは、ユーザーの悩みに寄り添い、占星術の知見を基にパーソナライズされたコーチングを提供するAIチャットボットです。

## 機能

- 🌟 自然な会話形式での相談
- 🔮 生年月日と出生地から占星術チャートを自動生成
- 💬 日本語でのわかりやすいアドバイス
- 📱 モバイル・デスクトップ対応のレスポンシブデザイン
- 🔒 プライバシーに配慮したデータ管理
- 💾 会話履歴の保存と継続

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Node.js, Mastra Framework
- **AI**: OpenAI GPT-4o, YaoSenjutsu API
- **データベース**: Firebase Realtime Database
- **デプロイ**: Vercel

## セットアップ

### 必要条件

- Node.js 18以上
- npm または yarn
- OpenAI APIキー
- YaoSenjutsu APIキー
- Firebase プロジェクト

### インストール

1. リポジトリをクローン
```bash
git clone [repository-url]
cd YaoSenjutsuChat
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定
`.env.local`ファイルを作成し、以下の環境変数を設定:
```
OPENAI_API_KEY=your_openai_api_key
YAOSENJUTSU_API_KEY=your_yaosenjutsu_api_key
YAOSENJUTSU_API_URL=https://api.yaosenjutsu.com
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_DATABASE_URL=your_firebase_database_url
```

4. 開発サーバーを起動
```bash
npm run dev
```

5. ブラウザで http://localhost:3000 を開く

## デプロイ

Vercelへのデプロイ:

```bash
npm run build
vercel deploy
```

## プロジェクト構造

```
├── app/
│   ├── api/
│   │   └── chat/          # チャットAPIエンドポイント
│   ├── components/        # Reactコンポーネント
│   ├── lib/              # ユーティリティとライブラリ
│   │   ├── firebase.ts   # Firebase設定
│   │   ├── mastra-agent.ts # Mastraエージェント
│   │   └── yaosenjutsu.ts # YaoSenjutsu API
│   ├── privacy/          # プライバシーポリシーページ
│   ├── layout.tsx        # アプリケーションレイアウト
│   └── page.tsx          # ホームページ
├── public/              # 静的ファイル
├── specs/              # 仕様書
└── package.json        # プロジェクト設定
```

## ライセンス

ISC

## サポート

問題や質問がある場合は、Issueを作成してください。