import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron';
import { join } from 'path';
import { InferenceEngine } from './inference';
import { ImagePipeline } from './pipeline';
import { ProcessOptions, ProcessResult } from './types';

class MainApp {
  private mainWindow: BrowserWindow | null = null;
  private inferenceEngine: InferenceEngine | null = null;
  private imagePipeline: ImagePipeline | null = null;

  constructor() {
    this.setupApp();
    this.setupIPC();
  }

  private setupApp(): void {
    if (app && app.setAppUserModelId) {
      app.setAppUserModelId('com.saptaratna.electron-bgremove');
    }
    
    app.whenReady().then(() => {
      this.createWindow();
      this.initializeEngines();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: join(__dirname, '../preload/preload.js'),
        contentSecurityPolicy: "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      },
      icon: join(__dirname, '../../assets/icon.png'),
      titleBarStyle: 'default',
      show: false
    });

    // セキュリティ設定
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== 'http://localhost:5173') {
        event.preventDefault();
      }
    });

    this.mainWindow.webContents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });

    // 開発環境ではViteサーバー、本番では静的ファイル
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });
  }

  private async initializeEngines(): Promise<void> {
    try {
      this.inferenceEngine = new InferenceEngine();
      this.imagePipeline = new ImagePipeline();
      
      // 推論エンジンの初期化を試行（失敗してもアプリは継続）
      try {
        await this.inferenceEngine.initialize();
        console.log('推論エンジンが初期化されました');
      } catch (error) {
        console.warn('推論エンジンの初期化に失敗しましたが、アプリケーションは継続します:', error);
      }
    } catch (error) {
      console.error('エンジンの初期化に失敗しました:', error);
    }
  }

  private setupIPC(): void {
    // ファイル選択
    ipcMain.handle('bgremove:pickFiles', async (): Promise<string[]> => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        title: '画像ファイルを選択',
        filters: [
          { name: '画像ファイル', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
          { name: 'すべてのファイル', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      return result.canceled ? [] : result.filePaths;
    });

    // 出力ディレクトリ選択
    ipcMain.handle('bgremove:pickOutputDir', async (): Promise<string | null> => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        title: '出力ディレクトリを選択',
        properties: ['openDirectory', 'createDirectory']
      });

      return result.canceled ? null : result.filePaths[0];
    });

    // 画像処理
    ipcMain.handle('bgremove:processFiles', async (
      _event,
      filePaths: string[],
      options: ProcessOptions = {}
    ): Promise<ProcessResult> => {
      if (!this.inferenceEngine || !this.imagePipeline) {
        return {
          ok: false,
          results: filePaths.map(path => ({
            in: path,
            error: '推論エンジンが初期化されていません。ONNX Runtimeの読み込みに失敗した可能性があります。'
          }))
        };
      }

      const results = [];
      
      for (const filePath of filePaths) {
        try {
          console.log(`処理中: ${filePath}`);
          
          // 推論実行
          const mask = await this.inferenceEngine.processImage(filePath, {
            resizeLongEdge: options.resizeLongEdge || 0,
            threshold: options.threshold || 128,
            blurRadius: options.blurRadius || 2
          });

          // 画像合成と保存
          const outputPath = await this.imagePipeline.compositeAndSave(
            filePath,
            mask,
            {
              outDir: options.outDir,
              suffix: options.suffix || '_bg-removed'
            }
          );

          results.push({
            in: filePath,
            out: outputPath
          });

        } catch (error) {
          console.error(`処理失敗: ${filePath}`, error);
          results.push({
            in: filePath,
            error: error instanceof Error ? error.message : '不明なエラー'
          });
        }
      }

      return {
        ok: results.every(r => !r.error),
        results
      };
    });

    // モデル情報取得
    ipcMain.handle('bgremove:getModelInfo', async () => {
      if (!this.inferenceEngine) {
        return null;
      }
      return this.inferenceEngine.getModelInfo();
    });

    // 利用可能な実行プロバイダ取得
    ipcMain.handle('bgremove:getProviders', async () => {
      if (!this.inferenceEngine) {
        return [];
      }
      return this.inferenceEngine.getAvailableProviders();
    });

    // 画像プレビュー取得
    ipcMain.handle('bgremove:getImagePreview', async (_event, filePath: string, options?: { size?: number }) => {
      try {
        const targetSize = Math.min(Math.max(options?.size ?? 200, 32), 512);

        const image = nativeImage.createFromPath(filePath);
        if (image.isEmpty()) {
          return null;
        }

        const resized = image.resize({ width: targetSize, height: targetSize, quality: 'good' });
        const dataUrl = resized.toDataURL();
        return dataUrl;
      } catch (error) {
        console.error('画像プレビューの取得に失敗しました:', error);
        return null;
      }
    });

    // 処理結果用のサムネイル取得
    ipcMain.handle('bgremove:getImageThumbnail', async (_event, filePath: string, options?: { size?: number }) => {
      try {
        const targetSize = Math.min(Math.max(options?.size ?? 200, 32), 1024);

        const image = nativeImage.createFromPath(filePath);
        if (image.isEmpty()) {
          return null;
        }

        const resized = image.resize({ width: targetSize, height: targetSize, quality: 'good' });
        return resized.toDataURL();
      } catch (error) {
        console.error('出力サムネイルの取得に失敗しました:', error);
        return null;
      }
    });

    // パスを開く
    ipcMain.handle('bgremove:openPath', async (_event, targetPath: string) => {
      try {
        const result = await shell.openPath(targetPath);
        if (result) {
          console.error('パスを開けませんでした:', result);
        }
        return result;
      } catch (error) {
        console.error('パスを開く処理でエラーが発生しました:', error);
        return 'Failed to open path';
      }
    });
  }
}

// アプリケーション開始
new MainApp();
