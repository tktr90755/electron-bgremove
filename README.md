# 🎭 Background Remover

AI を使用して画像の背景を自動除去する Electron デスクトップアプリケーション。

## ✨ 特徴

- **完全オフライン処理**: インターネット接続不要
- **U²Net モデル**: 高精度な背景除去
- **GPU 加速**: CUDA、DirectML、CoreML 対応
- **バッチ処理**: 複数ファイルの一括処理
- **高品質出力**: 透過 PNG での保存
- **メモリ効率**: 大きな画像の自動リサイズ

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- npm または yarn
- 対応 OS: Windows, macOS, Linux

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd electron-bgremove

# 依存関係のインストール
npm install

# 開発環境の起動
npm run dev
```

### モデルの配置

1. U²Net モデルファイルを `assets/models/` に配置

   ```
   assets/models/u2net.onnx
   ```

2. モデルファイルの入手方法:
   - [ONNX Model Zoo](https://github.com/onnx/models) から U²Net をダウンロード
   - または [U²Net 公式リポジトリ](https://github.com/xuebinqin/U-2-Net) から変換
   - または [u2net.onnx](https://drive.google.com/uc?export=download&id=1pDjgTn-9my55rkSICbMANHdVVzWJPo4s) からダウンロードし、modelディレクトリに格納してください。

## 📦 ビルド

### 開発ビルド

```bash
# 開発用ビルド
npm run build

# 開発サーバー起動
npm run dev
```

### 配布用ビルド

#### Windows用

```bash
# Windows用スタンドアロン実行ファイル作成
npm run build:win
```

#### macOS用

```bash
# macOS用スタンドアロンアプリ作成
npm run build:mac
```

#### Linux用

```bash
# Linux用スタンドアロン実行ファイル作成
npm run build:linux
```

#### 全プラットフォーム用

```bash
# 全プラットフォーム用パッケージ作成
npm run build:all
```

### ビルド成果物

ビルド完了後、以下のファイルが `dist/` ディレクトリに作成されます：

- **Windows**: `.exe` インストーラー、ポータブル版
- **macOS**: `.dmg` インストーラー、`.zip` アーカイブ
- **Linux**: `.AppImage`、`.deb` パッケージ

## 🧪 テスト

```bash
# サンプル画像でのテスト
npm run sample

# 型チェック
npm run typecheck

# リント
npm run lint
```

## 🚀 配布

### 前提条件

1. **アイコンファイルの配置**

   ```
   assets/
   ├── icon.icns    # macOS用（512x512px）
   ├── icon.ico     # Windows用（256x256px）
   └── icon.png     # Linux用（512x512px）
   ```

2. **モデルファイルの配置**
   ```
   assets/models/
   └── u2net.onnx   # U²Netモデル（約176MB）
   ```

### ビルド手順

1. **開発環境の準備**

   ```bash
   npm install
   ```

2. **プロジェクトのビルド**

   ```bash
   npm run build
   ```

3. **プラットフォーム別ビルド**

   ```bash
   # Windows用
   npm run build:win

   # macOS用
   npm run build:mac

   # Linux用
   npm run build:linux

   # 全プラットフォーム用
   npm run build:all
   ```

### 配布ファイル

ビルド完了後、`dist/` ディレクトリに以下のファイルが作成されます：

- **Windows**: `Background Remover Setup.exe`、`Background Remover.exe`
- **macOS**: `Background Remover.dmg`、`Background Remover.zip`
- **Linux**: `Background Remover.AppImage`、`background-remover.deb`

## 🎯 使用方法

### 基本的な使い方

1. **画像の選択**
   - ドラッグ&ドロップで画像を選択
   - または「ファイルを選択」ボタンを使用

2. **設定の調整**
   - **事前リサイズ**: 大きな画像のメモリ節約
   - **しきい値**: 背景除去の感度調整 (0-255)
   - **ぼかし半径**: エッジの滑らかさ調整

3. **処理の実行**
   - 「処理開始」ボタンをクリック
   - 進捗バーで処理状況を確認

4. **結果の確認**
   - 透過 PNG ファイルが出力ディレクトリに保存
   - エラーがある場合は詳細を表示

### 対応ファイル形式

- **入力**: JPG, PNG, WebP
- **出力**: PNG (透過)

### 推奨設定

| 画像サイズ       | 事前リサイズ | しきい値 | ぼかし半径 |
| ---------------- | ------------ | -------- | ---------- |
| 小 (1024px以下)  | 無効         | 128      | 2          |
| 中 (1024-2048px) | 1024         | 128      | 3          |
| 大 (2048px以上)  | 2048         | 130      | 4          |

## ⚙️ 設定

### 実行プロバイダ

アプリは以下の優先順位で実行プロバイダを自動選択します:

1. **DirectML** (Windows GPU)
2. **CUDA** (NVIDIA GPU)
3. **CoreML** (macOS GPU)
4. **WebAssembly** (ブラウザ互換)
5. **CPU** (フォールバック)

### 環境変数

```bash
# デバッグモード
NODE_ENV=development

# ログレベル
LOG_LEVEL=info
```

## 🏗️ アーキテクチャ

```
src/
├── main/           # メインプロセス
│   ├── main.ts     # Electron アプリケーション
│   ├── inference.ts # ONNX 推論エンジン
│   ├── pipeline.ts  # 画像処理パイプライン
│   └── types.d.ts   # 型定義
├── preload/        # プリロードスクリプト
│   ├── preload.ts  # IPC ブリッジ
│   └── api.d.ts    # API 型定義
└── renderer/       # レンダラープロセス
    ├── index.html  # UI
    ├── style.css   # スタイル
    └── index.ts    # フロントエンド
```

## 🔧 開発

### 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# 型チェック
npm run typecheck

# リント
npm run lint
```

### 新しいモデルの追加

1. `src/main/inference.ts` でモデル設定を追加
2. `assets/models/` にモデルファイルを配置
3. 必要に応じて前処理・後処理を調整

### カスタマイズ

- **UI**: `src/renderer/` を編集
- **処理ロジック**: `src/main/` を編集
- **設定**: `src/main/types.d.ts` で型定義を更新

## 🐛 トラブルシューティング

### よくある問題

1. **モデルファイルが見つからない**

   ```
   エラー: モデルファイルが見つかりません
   ```

   - `assets/models/u2net.onnx` が存在するか確認
   - ファイルパスが正しいか確認

2. **メモリ不足エラー**

   ```
   エラー: JavaScript heap out of memory
   ```

   - 事前リサイズを有効にする
   - より小さな画像サイズを指定

3. **GPU が認識されない**
   - ドライバーが最新か確認
   - CPU モードで動作するか確認

### ログの確認

```bash
# 開発者ツールでコンソールログを確認
# または logs/ ディレクトリのログファイルを確認
```

## 📊 パフォーマンス

### ベンチマーク (参考値)

| 画像サイズ | CPU (Intel i7) | GPU (RTX 3060) |
| ---------- | -------------- | -------------- |
| 512x512    | 2-3秒          | 0.5-1秒        |
| 1024x1024  | 8-12秒         | 1-2秒          |
| 2048x2048  | 30-45秒        | 3-5秒          |

### メモリ使用量

- **最小**: 500MB (CPU モード)
- **推奨**: 2GB+ (GPU モード)
- **最大**: 4GB+ (大きな画像処理時)

## 🤝 貢献

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🙏 謝辞

- [U²Net](https://github.com/xuebinqin/U-2-Net) - 背景除去モデル
- [ONNX Runtime](https://onnxruntime.ai/) - 推論エンジン
- [Sharp](https://sharp.pixelplumbing.com/) - 画像処理
- [Electron](https://electronjs.org/) - デスクトップアプリフレームワーク

## 📞 サポート

問題や質問がある場合は、[Issues](https://github.com/your-repo/issues) で報告してください。

---

**注意**: このアプリケーションは教育・研究目的で作成されています。商用利用の場合は、使用するモデルのライセンスを確認してください。
