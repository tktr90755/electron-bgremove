import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { InferenceOptions, ModelConfig } from './types';

// 動的インポートでSharpを読み込み
let sharp: any;

async function loadSharp() {
  if (!sharp) {
    const sharpModule = await import('sharp');
    sharp = sharpModule.default;
  }
  return sharp;
}

// 遅延requireでONNX Runtimeを読み込み
let ortModule: any;
let InferenceSession: any;
let Tensor: any;

function loadOnnxRuntime() {
  if (!ortModule) {
    try {
      ortModule = eval('require')('onnxruntime-node');
      console.log('ONNX Runtimeが正常に読み込まれました');
      console.log('ONNX Runtime version:', ortModule.version || 'unknown');
    } catch (error) {
      console.warn('ONNX Runtimeの読み込みに失敗しました:', error);
      // ダミーの実装を提供
      ortModule = {
        InferenceSession: {
          create: () => Promise.reject(new Error('ONNX Runtime is not available'))
        },
        Tensor: class DummyTensor {
          constructor() {
            throw new Error('ONNX Runtime is not available');
          }
        },
        getAvailableProviders: async () => ['cpu']
      };
    }

    InferenceSession = ortModule.InferenceSession;
    Tensor = ortModule.Tensor;
  }

  return { ort: ortModule, InferenceSession, Tensor };
}

export class InferenceEngine {
  private session: any | null = null;
  private modelConfig: ModelConfig | null = null;
  private availableProviders: string[] = [];
  private providersReady: Promise<void> | null = null;

  constructor() {
    // プロバイダの初期化
    this.providersReady = this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    // 実行プロバイダの優先度設定
    const preferredProviders = [
      'dml',      // DirectML (Windows GPU)
      'cuda',     // CUDA (NVIDIA GPU)
      'coreml',   // CoreML (macOS GPU)
      'wasm',     // WebAssembly
      'cpu'       // CPU (フォールバック)
    ];

    try {
      const { ort } = loadOnnxRuntime();

      if (!ort || typeof ort.getAvailableProviders !== 'function') {
        console.warn('利用可能な実行プロバイダを取得できません。CPUフォールバックを使用します。');
        this.availableProviders = ['cpu'];
        return;
      }

      // ONNX Runtimeの利用可能なプロバイダを取得
      const providers = await Promise.resolve(ort.getAvailableProviders());
      console.log('ONNX Runtime利用可能プロバイダ:', providers);

      this.availableProviders = preferredProviders.filter(provider => 
        Array.isArray(providers) && providers.includes(provider)
      );

      if (this.availableProviders.length === 0) {
        this.availableProviders = ['cpu'];
      }

      console.log('選択された実行プロバイダ:', this.availableProviders);
    } catch (error) {
      console.warn('プロバイダの初期化に失敗、CPUのみ使用:', error);
      this.availableProviders = ['cpu'];
    }
  }

  async initialize(modelPath?: string): Promise<void> {
    try {
      if (this.providersReady) {
        await this.providersReady;
      }

      const { InferenceSession: Session } = loadOnnxRuntime();
      
      const defaultModelPath = resolveModelPath('u2net.onnx');
      const targetModelPath = modelPath || defaultModelPath;

      const isDevelopment = process.env.NODE_ENV === 'development';

      if (isDevelopment) {
        console.log('開発環境: モデルファイルの存在確認をスキップします（モデルは読み込みます）');
      } else {
        // モデルファイルの存在確認
        try {
          await readFile(targetModelPath);
        } catch (error) {
          throw new Error(`モデルファイルが見つかりません: ${targetModelPath}`);
        }
      }

      // セッション作成
      const sessionOptions: any = {
        executionProviders: this.availableProviders.length > 0 ? this.availableProviders : ['cpu'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true
      };

      this.session = await Session.create(targetModelPath, sessionOptions);
      
      // モデル設定
      this.modelConfig = {
        name: isDevelopment ? 'U²Net (開発)' : 'U²Net',
        path: targetModelPath,
        inputSize: 320, // U²Netの標準入力サイズ
        description: 'U²Net background removal model'
      };

      console.log('推論エンジンが初期化されました');
      console.log('使用プロバイダ:', this.session.executionProviders);
    } catch (error) {
      console.error('推論エンジンの初期化に失敗しました:', error);
      // エラーが発生してもアプリケーションは継続動作
      console.warn('ONNX Runtimeが利用できません。アプリケーションはUIのみで動作します。');
    }
  }

  async processImage(
    imagePath: string, 
    options: Partial<InferenceOptions> = {}
  ): Promise<Buffer> {
    if (!this.session || !this.modelConfig) {
      throw new Error('推論エンジンが初期化されていません');
    }

    try {
      // 画像の前処理
      const inputTensor = await this.preprocessImage(imagePath, options);
      
      // 推論実行
      const feeds: Record<string, any> = {};
      const inputName = Array.isArray((this.session as any).inputNames) && (this.session as any).inputNames.length > 0
        ? (this.session as any).inputNames[0]
        : 'input';
      feeds[inputName] = inputTensor;

      const outputs = await this.session.run(feeds);

      const outputTensor = this.extractOutputTensor(outputs);
      if (!outputTensor) {
        throw new Error('推論結果が取得できませんでした');
      }

      // 後処理
      const mask = this.postprocessMask(outputTensor, options);
      return mask;
    } catch (error) {
      console.error('画像処理に失敗しました:', error);
      throw error;
    }
  }

  private async preprocessImage(
    imagePath: string, 
    options: any
  ): Promise<any> {
    const sharpLib = await loadSharp();
    const inputSize = this.modelConfig!.inputSize;
    const resizeLongEdge = options.resizeLongEdge || 0;

    // 画像読み込みとリサイズ
    let image = sharpLib(imagePath);
    const metadata = await image.metadata();

    // 必要に応じて事前リサイズ（メモリ節約）
    if (resizeLongEdge > 0 && (metadata.width! > resizeLongEdge || metadata.height! > resizeLongEdge)) {
      image = image.resize(resizeLongEdge, resizeLongEdge, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // モデル用にリサイズ
    const processedImage = await image
      .resize(inputSize, inputSize, { fit: 'fill' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer();

    // Float32Arrayに変換し、ImageNet正規化を適用
    const floatArray = new Float32Array(processedImage.length);
    for (let i = 0; i < processedImage.length; i++) {
      floatArray[i] = processedImage[i] / 255.0;
    }
    
    // ImageNet正規化: (pixel/255.0 - 0.485) / 0.229
    const mean = 0.485;
    const std = 0.229;
    for (let i = 0; i < floatArray.length; i++) {
      floatArray[i] = (floatArray[i] - mean) / std;
    }

    // NCHW形式に変換 [1, 3, H, W]
    const tensorData = new Float32Array(1 * 3 * inputSize * inputSize);
    for (let h = 0; h < inputSize; h++) {
      for (let w = 0; w < inputSize; w++) {
        const pixelIndex = h * inputSize + w;
        tensorData[0 * inputSize * inputSize + pixelIndex] = floatArray[pixelIndex * 3 + 0]; // R
        tensorData[1 * inputSize * inputSize + pixelIndex] = floatArray[pixelIndex * 3 + 1]; // G
        tensorData[2 * inputSize * inputSize + pixelIndex] = floatArray[pixelIndex * 3 + 2]; // B
      }
    }

    const { Tensor: TensorClass } = await loadOnnxRuntime();
    return new TensorClass('float32', tensorData, [1, 3, inputSize, inputSize]);
  }

  private extractOutputTensor(outputs: Record<string, any>): any | null {
    if (!outputs) {
      return null;
    }

    const outputKeys = Object.keys(outputs);
    if (outputKeys.length === 0) {
      return null;
    }

    const preferredKey = outputKeys.find(key => key.toLowerCase().includes('mask') || key.toLowerCase().includes('output'));
    if (preferredKey) {
      return outputs[preferredKey];
    }

    return outputs[outputKeys[0]];
  }

  private postprocessMask(
    outputTensor: any, 
    options: any
  ): Buffer {
    const threshold = options.threshold || 128;
    const blurRadius = options.blurRadius || 2;

    // 出力テンソルを取得
    const outputData = outputTensor.data as Float32Array;
    const dims = outputTensor.dims as number[] | undefined;

    if (!outputData || !dims || dims.length < 2) {
      throw new Error('推論結果の形式が不正です');
    }

    const height = dims[dims.length - 2];
    const width = dims[dims.length - 1];
    
    // デバッグ: 推論結果の詳細情報
    console.log(`推論結果 - サイズ: ${width}x${height}, データ範囲: ${Math.min(...outputData)} ~ ${Math.max(...outputData)}`);

    // Sigmoid適用
    const pixelCount = width * height;
    const sigmoidData = new Float32Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      sigmoidData[i] = 1 / (1 + Math.exp(-outputData[i]));
    }
    
    // デバッグ: Sigmoid後の統計
    console.log(`Sigmoid後 - 範囲: ${Math.min(...sigmoidData)} ~ ${Math.max(...sigmoidData)}`);

    // Uint8Arrayに変換（0-255）
    const uint8Data = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      uint8Data[i] = Math.round(sigmoidData[i] * 255);
    }

    // しきい値適用
    const thresholdedData = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      thresholdedData[i] = uint8Data[i] > threshold ? 255 : 0;
    }
    
    // デバッグ: マスクの統計情報を出力
    const whitePixels = thresholdedData.filter(p => p === 255).length;
    const blackPixels = thresholdedData.filter(p => p === 0).length;
    console.log(`マスク統計: 白=${whitePixels}, 黒=${blackPixels}, しきい値=${threshold}`);

    // モルフォロジー処理（erode + dilate）
    const morphedData = this.applyMorphology(thresholdedData, width, height, 3);

    // ガウシアンブラー適用
    const blurredData = this.applyGaussianBlur(morphedData, width, height, blurRadius);

    // Bufferに変換
    return Buffer.from(blurredData);
  }

  private applyMorphology(data: Uint8Array, width: number, height: number, kernelSize: number): Uint8Array {
    const result = new Uint8Array(data.length);
    const halfKernel = Math.floor(kernelSize / 2);

    // Erosion
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minVal = 255;
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              minVal = Math.min(minVal, data[ny * width + nx]);
            }
          }
        }
        result[y * width + x] = minVal;
      }
    }

    // Dilation
    const dilated = new Uint8Array(result.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxVal = 0;
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              maxVal = Math.max(maxVal, result[ny * width + nx]);
            }
          }
        }
        dilated[y * width + x] = maxVal;
      }
    }

    return dilated;
  }

  private applyGaussianBlur(data: Uint8Array, width: number, height: number, radius: number): Uint8Array {
    if (radius <= 0) return data;

    const result = new Uint8Array(data.length);
    const sigma = radius / 3.0;
    const kernelSize = Math.ceil(radius * 2) + 1;
    const halfKernel = Math.floor(kernelSize / 2);

    // ガウシアンカーネル生成
    const kernel = new Float32Array(kernelSize);
    let kernelSum = 0;
    for (let i = 0; i < kernelSize; i++) {
      const x = i - halfKernel;
      kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernelSum += kernel[i];
    }
    for (let i = 0; i < kernelSize; i++) {
      kernel[i] /= kernelSum;
    }

    // 水平方向ブラー
    const temp = new Uint8Array(data.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let k = 0; k < kernelSize; k++) {
          const nx = x + k - halfKernel;
          if (nx >= 0 && nx < width) {
            sum += data[y * width + nx] * kernel[k];
          }
        }
        temp[y * width + x] = Math.round(sum);
      }
    }

    // 垂直方向ブラー
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let k = 0; k < kernelSize; k++) {
          const ny = y + k - halfKernel;
          if (ny >= 0 && ny < height) {
            sum += temp[ny * width + x] * kernel[k];
          }
        }
        result[y * width + x] = Math.round(sum);
      }
    }

    return result;
  }

  getModelInfo(): ModelConfig | null {
    return this.modelConfig;
  }

  getAvailableProviders(): string[] {
    return this.availableProviders;
  }

  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
}
function resolveModelPath(modelFileName: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    return join(__dirname, '../../assets/models', modelFileName);
  }

  const resourcesModelPath = join(process.resourcesPath, 'models', modelFileName);
  if (existsSync(resourcesModelPath)) {
    return resourcesModelPath;
  }

  // フォールバック: asar 内パス（開発・デバッグ用）
  return join(__dirname, '../../assets/models', modelFileName);
}
