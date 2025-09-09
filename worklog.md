# YaoSenjutsuChat 開発ログ

## プロジェクト概要
占星術チャットアプリケーション「YaoSenjutsuChat」の開発ログです。Spec-Driven Development（仕様駆動開発）を使用して開発を進めます。

## 開発履歴

### 2025-09-08

#### ✅ ルーティングロジックの大幅改善
- スコアリングシステムによるエンドポイント振り分け実装
  - ハイブリッドエンドポイント（yaonatal, yaotransits, yaosynastry）を優先
  - 重み付けによる優先順位制御（hybrid=10, individual=5）
- Deep Dive機能の実装
  - 「詳しく」キーワードで複数APIを並行呼び出し
  - Primary/Secondaryデータの階層管理
- セカンドパーソン情報抽出機能の追加
  - 相性診断用のパートナー情報自動抽出
  - 性別・名前の推定機能

#### ✅ 時刻処理とAPIレスポンスの修正
- **問題**: ハードコードされた時刻（23:27）と誤った月星座表示
- **修正内容**:
  - 時刻抽出パターンに`HH:MM`形式を追加
  - userInfoにdatetimeフィールドを追加
  - APIレスポンス構造に合わせたフォーマッター修正
- **結果**: 
  - 正確な時刻でAPIコール実行
  - 月星座が正しく魚座（Pisces）として表示
  - アセンダントが正しく天秤座（Libra）として表示

#### ✅ チャートフォーマッターの改善
- formatYaoNatal関数をAPIレスポンス構造に対応
- 基本情報（太陽・月・アセンダント）の明確な表示
- 本命宿オブジェクトの適切な処理

### 2025-01-27

#### ✅ Spec Kit セットアップ完了
- Spec Kitのインストールとプロジェクト初期化
- YaoSenjutsuChatプロジェクトの憲法（constitution.md）作成
- プロジェクトの基本構造を確立

#### ✅ TypeScriptエラー修正完了
- mastra-yaosenjutsu.tsファイルの型エラーをすべて修正
- MastraのAPI変更に対応した実装に更新
- ユーザー情報抽出機能の実装
- 都市名から座標への変換機能を追加

### 2025-01-09

#### ✅ ChatGPTスタイルインターフェースの実装とストリーミング対応
- **実装内容**:
  - ChatGPT風のチャットインターフェースを実装（ChatGPTInterface.tsx）
  - OpenAI APIストリーミング対応でリアルタイム表示を実現
  - 日本語IMEの入力中制御（compositionstart/end）を適切に処理
  - ReactMarkdownとremark-gfmでマークダウンレンダリング対応

#### ✅ コントロールイベント機能の実装
- **必要情報収集フォーム**:
  - `__CONTROL__`イベントパターンでフォーム表示制御
  - 生年月日、出生時刻、出生地の段階的収集
  - 相性占い用のセカンドパーソン情報収集対応
- **実装詳細**:
  - processMessageStreamメソッドでコントロールイベント送信
  - ChatGPTInterface側でフォーム表示とサブミット処理

#### ✅ mastra-yaosenjutsu.ts の大規模リファクタリング
- **コード品質改善**:
  - 環境変数検証（OPENAI_API_KEY必須チェック）
  - TypeScript型定義の追加（UserInfo, ChartRequest, ProcessingResult等）
  - エラーハンドリングの統一化（handleStreamErrorメソッド）
  - マジックナンバーの定数化（CONSTANTS オブジェクト）
  - 日付検証ロジックの共通化（validateDateメソッド）
- **定数定義**:
  ```typescript
  MAX_TOKENS: 2000 (800から増加)
  CACHE_DURATION_MS: 24時間
  DEFAULT_TIMEZONE: '+09:00'
  DEFAULT_LOCATION: '東京'
  ```

#### ✅ API連携の改善
- **自動チャート取得**:
  - ユーザー情報入力時に自動的にネイタルチャート取得
  - デフォルトでnatalエンドポイントを呼び出し
  - チャートデータをシステムプロンプトに含める
- **データ活用**:
  - ハウスカスプ、惑星位置、アスペクトの詳細表示
  - createChartSummaryForPromptで構造化されたデータ提供

#### 🔧 技術的課題と解決
- **問題1**: git checkoutによる変更喪失
  - 解決: ChatGPTInterface.tsxは保持、mastra-yaosenjutsu.tsのみ再実装
- **問題2**: ストリーミング表示の改行喪失
  - 解決: OpenAI APIストリーミングを直接使用
- **問題3**: APIデータが自動取得されない
  - 解決: prepareMessagesでデフォルトnatal取得を実装

### 2025-01-12

#### ✅ YaoSenjutsu API統合とMastraエージェント実装
- YaoSenjutsu API (https://api.yaosenjutsu.com) との統合完了
- Mastraフレームワークを使用した占星術エージェントの実装
- ネイタルチャート、トランジット、ホロスコープAPIの実装
- OpenAI GPT-4oとの統合による自然な日本語会話の実現

#### ✅ DeepChatコンポーネントの問題解決
- DeepChatのデモモード問題を修正
- カスタムリクエストハンドラーを実装してAPIと適切に接続
- チャットインターフェースが実際のAPIレスポンスを表示するように修正

#### ✅ ユーザー情報抽出機能の改善
- 生年月日と出生地の自動抽出機能を実装
- 座標変換はYaoSenjutsu APIに委任（APIが自動的に場所を座標に変換）
- エラーハンドリングとフォールバック処理の追加

#### 🔧 技術的な修正
- extractUserInfoツールのパラメータ渡し問題を修正
- Mastraツール実行方法の更新（tool.execute()を直接呼び出し）
- TypeScriptの型エラー解決

#### 📊 動作確認済み機能
- ネイタルチャート作成（太陽座、月座、その他の惑星配置を含む）
- 日本語での占星術アドバイス提供
- セッション管理（Firebase mock使用）
- プライバシー同意モーダル

#### ✅ Serena MCP導入完了
- Serena MCP（Semantic Retrieval & Editing noetic agent）を導入
- Claude Codeのパフォーマンス向上とコンテキスト理解力の改善
- uvxを使用した直接実行方式でセットアップ
- プロジェクト固有の設定ファイル（.serena/project.yml）を作成
- MCPサーバーが正常に接続・動作確認済み

#### 📋 次のステップ
- [ ] プロジェクトの仕様書作成（/specify コマンド使用）
- [ ] 技術実装計画の作成（/plan コマンド使用）
- [ ] タスク分解と実装計画（/tasks コマンド使用）
- [ ] アプリケーションのテストと動作確認

## 技術スタック（予定）
- **フロントエンド**: React/Vue.js + TypeScript
- **バックエンド**: Node.js/Express または Python/FastAPI
- **データベース**: PostgreSQL
- **占星術計算**: Swiss Ephemeris または類似ライブラリ
- **認証**: JWT + OAuth2

## 主要機能（予定）
1. **出生図作成**: 生年月日・出生地から出生図を生成
2. **トランジット分析**: 現在の天体配置の影響分析
3. **相性診断**: 複数人の出生図を比較した相性分析
4. **リアルタイムチャット**: 占星術に関する相談・議論
5. **ユーザー管理**: プロフィール・設定管理

## 開発原則
- 占星術計算の正確性を最優先
- すべての出力は日本語対応
- テスト駆動開発（TDD）の徹底
- モジュラー設計による保守性向上
- ユーザーデータの適切な保護

---
*このログは開発の進捗に応じて随時更新されます。*
