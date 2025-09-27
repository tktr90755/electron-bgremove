# 🎭 Background Remover

Electron と ONNX Runtime を組み合わせた、ローカル専用の AI 背景除去アプリです。U²Net モデルで人物や被写体を切り抜き、Electron レンダラーでプレビューしながら一括処理できます。

## ✨ 主な機能
- **ローカル推論**: ネットワーク不要、モデルは端末内で完結
- **プロバイダー自動選択**: DirectML / CUDA / CoreML / WASM / CPU の順で利用可能な実行プロバイダーを採用
- **ドラッグ & ドロップ UI**: 複数画像の一括投入とプレビュー表示に対応
- **調整可能な後処理**: しきい値・ぼかし半径・事前リサイズを UI から調整
- **柔軟な出力**: 出力先ディレクトリとファイル名サフィックスを指定可能、透過 PNG で保存
- **結果プレビュー**: 処理結果をサムネイルで確認し、出力フォルダをすぐにオープン

## 🔧 動作環境
- Node.js 18 以上
- npm (または互換マネージャー)
- Windows / macOS / Linux
- 約 200MB の空き容量（U²Net モデル + 依存パッケージ）

## 🚀 セットアップ
```bash
# リポジトリの取得
git clone <repository-url>
cd electron-bgremove

# 依存関係のインストール
npm install
```

### モデルの準備
1. `assets/models/` ディレクトリを作成（存在しない場合）
2. U²Net の ONNX 版 (`u2net.onnx`) を配置
   - [ONNX Model Zoo](https://github.com/onnx/models/tree/main/vision/object_detection_segmentation/u2net) などからダウンロード
   - `assets/models/u2net.onnx` という構成になるように配置
3. モデルは大容量のため Git には含めません。必要なら README へのリンクやダウンロードスクリプトを追加してください。

```
assets/
├── icon.png
└── models/
    └── u2net.onnx
```

## 🧑‍💻 開発フロー
| コマンド | 概要 |
| --- | --- |
| `npm run dev` | Vite + Electron のホットリロード環境を起動（ポート 5173） |
| `npm run build` | メイン・プリロード・レンダラーの本番ビルドを `out/` に生成 |
| `npm run preview` | レンダラーの静的ビルドをブラウザで確認 |
| `npm run typecheck` | TypeScript の型チェック（ノンエミット） |
| `npm run lint` | ESLint によるスタイル・バグ検出 |
| `npm run rebuild` | Electron ネイティブモジュールの再ビルド |
| `npm run sample` | `out/` のビルド済み成果物を使った E2E サンプル処理（後述） |

> `npm run sample` を実行する前に `npm run build` を行い、`out/main` にトランスパイル済みコードを出力してください。

## 📦 パッケージング
| コマンド | 説明 |
| --- | --- |
| `npm run dist` | electron-builder で現在のプラットフォーム向けインストーラーを作成 |
| `npm run build:win` | Windows (NSIS + Portable) 向けビルドスクリプト |
| `npm run build:mac` | macOS (Universal) 向けビルドスクリプト |
| `npm run build:linux` | Linux (AppImage / deb) 向けビルド |
| `npm run build:all` | 3 プラットフォーム分をまとめてキックするラッパー |

ビルド成果物は `dist/` に出力されます。アイコン (`assets/icon.(ico|icns|png)`) やモデルパスは `electron-builder.json` の設定と一致していることを確認してください。

## 🗂️ ディレクトリ構成
```
src/
├── main/               # Electron メインプロセス
│   ├── main.ts         # ウィンドウ生成・IPC・推論パイプライン制御
│   ├── inference.ts    # ONNX Runtime を使ったマスク生成
│   ├── pipeline.ts     # Sharp での合成・保存・プレビュー生成
│   └── types.d.ts      # IPC/推論オプションの型定義
├── preload/            # コンテキスト分離されたブリッジ
│   ├── preload.ts      # IPC を安全にラップしてレンダラーへ公開
│   └── api.d.ts        # レンダラー側で使う型定義
└── renderer/           # Vite + TypeScript の UI 層
    ├── index.html      # UI レイアウト
    ├── index.ts        # UI ロジック・状態管理
    └── style.css       # テーマ・アニメーション

scripts/                # ビルド／サンプル自動化スクリプト
assets/                 # モデル・アイコンなどの共有アセット
out/                    # `npm run build` の成果物（コミット対象外）
dist/                   # electron-builder の配布物
logs/                   # 実行ログ（レビュー不要なら削除）
```

## 🖥️ アプリの使い方
1. アプリを起動し、画像をドラッグ & ドロップするか `ファイルを選択` を押して読み込む
2. 任意で以下を調整
   - **事前リサイズ**: 指定ピクセルを長辺に収まるよう縮小（0 で無効）
   - **しきい値**: マスクのバイナリ化閾値 (0–255)
   - **ぼかし半径**: アルファ境界の平滑化 (0–10)
   - **出力ディレクトリ**: 省略時は入力と同じ場所に `_bg-removed.png` を出力
3. `処理開始` で一括処理、進捗バーに現在件数が表示
4. 結果画面でサムネイルを確認し、`出力フォルダを開く` で出力先を Finder / Explorer で開く

入力は JPG / PNG / WebP、出力は透過 PNG 固定です。

## 🧠 推論パイプラインの概要
- `InferenceEngine` (`src/main/inference.ts`)
  - ONNX Runtime を遅延ロードし、利用可能な実行プロバイダーを列挙
  - U²Net モデルをロード（開発モードでは存在チェックを緩和）
  - Sharp で画像を 320×320 に整形 → Float32 テンソル化 → 推論
  - 出力マスクにシグモイド適用・閾値処理・モルフォロジー + ガウシアンブラーを実施
- `ImagePipeline` (`src/main/pipeline.ts`)
  - マスクを入力画像サイズへリサイズし、アルファチャンネルとして合成
  - 透過 PNG に書き出し、必要ならディレクトリを作成
  - プレビューやサムネイル生成にも Sharp を利用
- IPC (`src/preload/preload.ts`)
  - ファイル選択、出力先選択、処理依頼、プレビュー取得などを `window.bgremove` API としてレンダラーに公開
- レンダラー (`src/renderer/index.ts`)
  - ドロップ／選択したファイルのプレビュー描画、処理オプション入力、進捗表示、結果一覧生成を担当

## 🧪 サンプルテスト (`npm run sample`)
1. `npm run build` で `out/` を作成
2. `assets/sample.jpg` にテスト画像を配置（任意）
3. `npm run sample`
   - `InferenceEngine` と `ImagePipeline` を通しで実行し、`out/sample_test-result.png` を生成
   - 推論時間や利用プロバイダーをログに出力

## 🐛 トラブルシューティング
- **モデルが見つからない**: `assets/models/u2net.onnx` のパスとファイル名を確認
- **ONNX Runtime がロードできない**: `npm install` の完了と、`onnxruntime-node` をサポートするプラットフォームか確認。失敗時は CPU プロバイダーでの再試行が行われます。
- **メモリ不足**: 事前リサイズ値を下げるか、処理対象画像を分割してください。
- **ネイティブモジュールエラー**: Node/Electron のバージョンを更新した場合は `npm run rebuild` を実行

## 🤝 コントリビュート
1. フォークし、フィーチャーブランチを作成
2. 目的に応じて小さくコミット（`Add GPU mode toggle` のような命令形サブジェクト）
3. `npm run typecheck` / `npm run lint` / 必要なら `npm run sample` で挙動を確認
4. PR ではユーザー向けの変更点・スクリーンショット・関連 Issue を記載

## 📄 ライセンス
MIT License（詳細は `LICENSE` を参照）

## 🙏 謝辞
- [U²Net](https://github.com/xuebinqin/U-2-Net)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Sharp](https://sharp.pixelplumbing.com/)
- [Electron](https://www.electronjs.org/)
