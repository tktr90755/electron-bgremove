# モデルファイル配置

このディレクトリには、背景除去に使用する ONNX モデルファイルを配置してください。

## 必要なファイル

### U²Net モデル

- **ファイル名**: `u2net.onnx`
- **サイズ**: 約 176MB
- **用途**: 高精度な背景除去

### 軽量版 (オプション)

- **ファイル名**: `u2netp.onnx`
- **サイズ**: 約 4.7MB
- **用途**: 高速処理、低メモリ使用量

## モデルの入手方法

### 方法1: ONNX Model Zoo からダウンロード

```bash
# U²Net モデルをダウンロード
wget https://github.com/onnx/models/raw/main/vision/body_analysis/u2net/model/u2net-12.onnx -O u2net.onnx

# 軽量版
wget https://github.com/onnx/models/raw/main/vision/body_analysis/u2net/model/u2netp-12.onnx -O u2netp.onnx
```

### 方法2: 公式リポジトリから変換

```bash
# U²Net 公式リポジトリをクローン
git clone https://github.com/xuebinqin/U-2-Net.git
cd U-2-Net

# PyTorch モデルを ONNX に変換
python convert_to_onnx.py
```

### 方法3: 事前変換済みモデル

- [Hugging Face Hub](https://huggingface.co/models?search=u2net)
- [ONNX Hub](https://github.com/microsoft/onnxruntime-extensions)

## ファイル配置

```
assets/models/
├── u2net.onnx      # メインモデル (推奨)
├── u2netp.onnx     # 軽量版 (オプション)
└── README.md       # このファイル
```

## 注意事項

1. **ファイルサイズ**: モデルファイルは大きいため、Git LFS を使用することを推奨
2. **ライセンス**: 使用するモデルのライセンスを確認してください
3. **バージョン**: ONNX Runtime の互換性を確認してください

## トラブルシューティング

### モデルが読み込めない場合

- ファイルパスが正しいか確認
- ファイルが破損していないか確認
- ONNX Runtime のバージョンを確認

### メモリ不足の場合

- 軽量版 (`u2netp.onnx`) を使用
- 事前リサイズを有効にする
- バッチサイズを小さくする
