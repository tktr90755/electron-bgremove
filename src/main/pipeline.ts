import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { basename, dirname, extname, join } from 'path';

// 動的インポートでSharpを読み込み
let sharp: any;

async function loadSharp() {
  if (!sharp) {
    const sharpModule = await import('sharp');
    sharp = sharpModule.default;
  }
  return sharp;
}

export interface CompositeOptions {
  outDir?: string;
  suffix?: string;
}

export class ImagePipeline {
  async compositeAndSave(
    inputPath: string,
    maskBuffer: Buffer,
    options: CompositeOptions = {}
  ): Promise<string> {
    try {
      const sharpLib = await loadSharp();
      
      // 出力パス生成
      const outputPath = this.generateOutputPath(inputPath, options);
      
      // 出力ディレクトリ作成
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // 元画像のメタデータ取得
      const inputImage = sharpLib(inputPath);
      const metadata = await inputImage.metadata();
      const { width, height } = metadata;

      if (!width || !height) {
        throw new Error('画像のサイズを取得できませんでした');
      }

      // マスクを元画像サイズにリサイズ（RAW 1chとして取得）
      const { data: resizedMaskData, info: maskInfo } = await sharpLib(maskBuffer, {
        raw: {
          width: 320, // U²Netの出力サイズ
          height: 320,
          channels: 1
        }
      })
      .resize(width, height, {
        kernel: sharpLib.kernel.lanczos3
      })
      .toColourspace('b-w')
      .raw()
      .toBuffer({ resolveWithObject: true });

      // デバッグ: マスクの統計情報
      const maskValues = Array.from(resizedMaskData) as number[];
      const whitePixels = maskValues.filter(v => v > 128).length;
      const blackPixels = maskValues.filter(v => v <= 128).length;
      console.log(`リサイズ後マスク - 白=${whitePixels}, 黒=${blackPixels}, サイズ=${maskInfo.width}x${maskInfo.height}`);

      // 元画像に推論マスクをアルファチャンネルとして適用
      // マスクをアルファチャンネルとして直接適用
      const finalImage = await sharpLib(inputPath)
        .rotate() // EXIF の向きを反映
        .ensureAlpha() // 既存アルファを保持/追加
        .joinChannel(resizedMaskData, {
          raw: {
            width: maskInfo.width,
            height: maskInfo.height,
            channels: 1
          }
        })
        .png({
          compressionLevel: 9,
          quality: 100,
          progressive: true
        })
        .toBuffer();

      // ファイル保存
      await sharpLib(finalImage).toFile(outputPath);

      console.log(`保存完了: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error('画像合成に失敗しました:', error);
      throw error;
    }
  }

  private generateOutputPath(inputPath: string, options: CompositeOptions): string {
    const suffix = options.suffix || '_bg-removed';
    const inputDir = dirname(inputPath);
    const inputName = basename(inputPath, extname(inputPath));
    const outputDir = options.outDir || inputDir;
    
    return join(outputDir, `${inputName}${suffix}.png`);
  }

  async createPreview(
    inputPath: string,
    maskBuffer: Buffer,
    size: number = 200
  ): Promise<Buffer> {
    try {
      const sharpLib = await loadSharp();
      
      // プレビュー用にリサイズ
      const previewImage = await sharpLib(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toBuffer();

      const previewMask = await sharpLib(maskBuffer, {
        raw: {
          width: 320,
          height: 320,
          channels: 1
        }
      })
      .resize(size, size, {
        kernel: sharpLib.kernel.lanczos3
      })
      .png()
      .toBuffer();

      // プレビュー画像にマスクを適用
      const previewWithMask = await sharpLib(previewImage)
        .ensureAlpha()
        .composite([
          {
            input: previewMask,
            blend: 'dest-in'
          }
        ])
        .png()
        .toBuffer();

      return previewWithMask;

    } catch (error) {
      console.error('プレビュー生成に失敗しました:', error);
      throw error;
    }
  }

  async validateImage(imagePath: string): Promise<boolean> {
    try {
      const sharpLib = await loadSharp();
      const metadata = await sharpLib(imagePath).metadata();
      return !!(metadata.width && metadata.height);
    } catch {
      return false;
    }
  }

  async getImageInfo(imagePath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    try {
      const sharpLib = await loadSharp();
      const metadata = await sharpLib(imagePath).metadata();
      const stats = await sharpLib(imagePath).stats();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: metadata.size || 0
      };
    } catch (error) {
      throw new Error(`画像情報の取得に失敗しました: ${error}`);
    }
  }
}
