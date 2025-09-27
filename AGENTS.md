# Agent Playbook

このリポジトリで作業するエージェント向けの簡易ハンドブックです。最新の実装状況は `README.md` も参照してください。

## プロジェクト概要
- Electron + Vite + TypeScript 製のデスクトップアプリ
- U²Net (`u2net.onnx`) を ONNX Runtime で推論し、Sharp で透過 PNG を生成
- ドラッグ & ドロップ UI、後処理スライダー、結果プレビューを実装済み
- メインプロセス (`src/main`) とレンダラー (`src/renderer`)、プリロード (`src/preload`) に明確に分離

## 重要ディレクトリ
- `src/main/main.ts`: ウィンドウ生成と IPC ハンドラ
- `src/main/inference.ts`: 推論エンジン、プロバイダーの自動選択と前後処理
- `src/main/pipeline.ts`: マスク合成・プレビュー生成
- `src/preload/preload.ts`: `window.bgremove` API を公開
- `src/renderer/index.ts`: UI 状態・イベント・IPC 呼び出し
- `assets/models/u2net.onnx`: 背景除去モデル（Git 管理対象外）

## 依存関係と実行
```bash
npm install     # 依存導入
npm run dev     # Electron + Vite 開発モード
npm run build   # out/ へ本番ビルド
npm run preview # レンダラー単体プレビュー
```

## 品質チェック
```bash
npm run typecheck  # TypeScript 型検査
npm run lint       # ESLint
npm run sample     # out/ を利用した E2E サンプル処理（事前に npm run build が必要）
```

## パッケージング
- `npm run dist`: 現プラットフォームのインストーラー作成（electron-builder）
- `npm run build:win|mac|linux|all`: `scripts/` 配下のラッパーを利用
- 出力は `dist/`、`assets/icon.*` と `electron-builder.json` のパス整合に注意

## 開発メモ
- 推論プロバイダーは `dml → cuda → coreml → wasm → cpu` の優先度で自動選択
- マスクはシグモイド→閾値→モルフォロジー→ガウシアンブラーで後処理
- レンダラーでは画像のプレビューと結果サムネイルを `nativeImage` で生成
- `npm run sample` はビルド成果物 (`out/main`) の CommonJS を利用するため、開発中に差分がある場合は再ビルドが必要

## 運用ルール
- 大容量モデルはコミット禁止。README にダウンロード手順を記載済み
- ログは `logs/` に生成されるため、不要ならクリーンアップ
- PR 作成前に `typecheck` / `lint` / 必要に応じて `sample` の実行結果を共有する
- 変更時は `README.md` / `AGENTS.md` の記述が実装と乖離していないかセルフチェック

## 参考資料
- Electron セキュリティベストプラクティス: [https://www.electronjs.org/docs/latest/tutorial/security](https://www.electronjs.org/docs/latest/tutorial/security)
- ONNX Runtime GPU Provider Docs: [https://onnxruntime.ai/docs/execution-providers/](https://onnxruntime.ai/docs/execution-providers/)
- Sharp API: [https://sharp.pixelplumbing.com/api](https://sharp.pixelplumbing.com/api)
