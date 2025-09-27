// UI状態管理
interface AppState {
  selectedFiles: string[];
  isProcessing: boolean;
  currentProgress: number;
  totalFiles: number;
  results: Array<{
    in: string;
    out?: string;
    error?: string;
  }>;
  previews: Record<string, string | null>;
  resultPreviews: Record<string, string | null>;
}

class BackgroundRemoverApp {
  private state: AppState = {
    selectedFiles: [],
    isProcessing: false,
    currentProgress: 0,
    totalFiles: 0,
    results: [],
    previews: {},
    resultPreviews: {}
  };

  private elements = {
    dropZone: document.getElementById('dropZone') as HTMLElement,
    selectFilesBtn: document.getElementById('selectFilesBtn') as HTMLButtonElement,
    selectOutputDirBtn: document.getElementById('selectOutputDirBtn') as HTMLButtonElement,
    filesSection: document.getElementById('filesSection') as HTMLElement,
    fileList: document.getElementById('fileList') as HTMLElement,
    processBtn: document.getElementById('processBtn') as HTMLButtonElement,
    clearBtn: document.getElementById('clearBtn') as HTMLButtonElement,
    progressSection: document.getElementById('progressSection') as HTMLElement,
    progressFill: document.getElementById('progressFill') as HTMLElement,
    progressText: document.getElementById('progressText') as HTMLElement,
    progressDetail: document.getElementById('progressDetail') as HTMLElement,
    resultsSection: document.getElementById('resultsSection') as HTMLElement,
    resultsList: document.getElementById('resultsList') as HTMLElement,
    openOutputBtn: document.getElementById('openOutputBtn') as HTMLButtonElement,
    newProcessBtn: document.getElementById('newProcessBtn') as HTMLButtonElement,
    resizeInput: document.getElementById('resizeInput') as HTMLInputElement,
    thresholdInput: document.getElementById('thresholdInput') as HTMLInputElement,
    thresholdValue: document.getElementById('thresholdValue') as HTMLElement,
    blurInput: document.getElementById('blurInput') as HTMLInputElement,
    blurValue: document.getElementById('blurValue') as HTMLElement,
    outputDir: document.getElementById('outputDir') as HTMLInputElement,
    modelInfo: document.getElementById('modelInfo') as HTMLElement,
    providerInfo: document.getElementById('providerInfo') as HTMLElement
  };

  constructor() {
    this.initializeEventListeners();
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      // モデル情報取得
      const modelInfo = await window.bgremove.getModelInfo();
      if (modelInfo) {
        this.elements.modelInfo.textContent = `モデル: ${modelInfo.name}`;
      }

      // プロバイダ情報取得
      const providers = await window.bgremove.getProviders();
      if (providers.length > 0) {
        this.elements.providerInfo.textContent = `プロバイダ: ${providers[0]}`;
      }
    } catch (error) {
      console.error('アプリ初期化エラー:', error);
    }
  }

  private initializeEventListeners(): void {
    // ウィンドウ全体へのドロップでブラウザがファイルを開こうとするのを抑止
    ['dragover', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (event) => {
        event.preventDefault();
      });
    });

    // ファイル選択
    this.elements.selectFilesBtn.addEventListener('click', () => this.selectFiles());
    this.elements.selectOutputDirBtn.addEventListener('click', () => this.selectOutputDir());

    // ドラッグ&ドロップ
    this.elements.dropZone.addEventListener('click', () => this.selectFiles());
    this.elements.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.elements.dropZone.addEventListener('dragleave', () => this.handleDragLeave());
    this.elements.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

    // 処理ボタン
    this.elements.processBtn.addEventListener('click', () => this.processFiles());
    this.elements.clearBtn.addEventListener('click', () => this.clearFiles());
    this.elements.newProcessBtn.addEventListener('click', () => this.resetApp());

    // 設定スライダー
    this.elements.thresholdInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.elements.thresholdValue.textContent = target.value;
    });

    this.elements.blurInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.elements.blurValue.textContent = target.value;
    });

    // 出力フォルダを開く
    this.elements.openOutputBtn.addEventListener('click', () => this.openOutputFolder());
  }

  private async selectFiles(): Promise<void> {
    try {
      const files = await window.bgremove.pickFiles();
      if (files.length > 0) {
        this.addFiles(files);
      }
    } catch (error) {
      this.showError('ファイル選択に失敗しました', error);
    }
  }

  private async selectOutputDir(): Promise<void> {
    try {
      const dir = await window.bgremove.pickOutputDir();
      if (dir) {
        this.elements.outputDir.value = dir;
      }
    } catch (error) {
      this.showError('出力ディレクトリ選択に失敗しました', error);
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    this.elements.dropZone.classList.add('dragover');
  }

  private handleDragLeave(): void {
    this.elements.dropZone.classList.remove('dragover');
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.elements.dropZone.classList.remove('dragover');

    const files = Array.from(e.dataTransfer?.files || []);
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (imageFiles.length > 0) {
      const filePaths = imageFiles.map(file => file.path);
      this.addFiles(filePaths);
    } else {
      this.showError('サポートされていないファイル形式です。JPG、PNG、WebPファイルを選択してください。');
    }
  }

  private addFiles(filePaths: string[]): void {
    const uniquePaths = filePaths.filter(filePath => !this.state.selectedFiles.includes(filePath));
    this.state.selectedFiles = [...this.state.selectedFiles, ...uniquePaths];

    uniquePaths.forEach(filePath => {
      if (!(filePath in this.state.previews)) {
        this.state.previews[filePath] = null;
        void this.loadPreview(filePath);
      }
    });

    this.updateFileList();
    this.elements.filesSection.style.display = 'block';
    this.elements.processBtn.disabled = false;
  }

  private updateFileList(): void {
    this.elements.fileList.innerHTML = '';

    this.state.selectedFiles.forEach((filePath) => {
      const fileName = filePath.split('/').pop() || filePath;
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item fade-in';
      const preview = this.state.previews[filePath];
      fileItem.innerHTML = `
        <div class="file-preview">
          ${preview ? `<img src="${preview}" alt="${fileName}">` : '<span class="file-preview-icon">📷</span>'}
        </div>
        <div class="file-name">${fileName}</div>
      `;
      this.elements.fileList.appendChild(fileItem);
    });
  }

  private async loadPreview(filePath: string): Promise<void> {
    try {
      const dataUrl = await window.bgremove.getImagePreview(filePath, { size: 200 });
      if (dataUrl) {
        this.state.previews[filePath] = dataUrl;
        this.updateFileList();
      }
    } catch (error) {
      console.error('プレビューの取得に失敗しました:', error);
    }
  }

  private async processFiles(): Promise<void> {
    if (this.state.selectedFiles.length === 0) return;

    this.state.isProcessing = true;
    this.state.currentProgress = 0;
    this.state.totalFiles = this.state.selectedFiles.length;
    this.state.results = [];

    this.elements.processBtn.disabled = true;
    this.elements.progressSection.style.display = 'block';
    this.elements.resultsSection.style.display = 'none';

    try {
      const options = {
        resizeLongEdge: parseInt(this.elements.resizeInput.value) || 0,
        threshold: parseInt(this.elements.thresholdInput.value),
        blurRadius: parseFloat(this.elements.blurInput.value),
        outDir: this.elements.outputDir.value || undefined,
        suffix: '_bg-removed'
      };

      const result = await window.bgremove.processFiles(this.state.selectedFiles, options);
      
      this.state.results = result.results;
      this.updateProgress(100, '処理完了');

      result.results.forEach(item => {
        if (item.out) {
          this.state.resultPreviews[item.out] = null;
          void this.loadResultPreview(item.out);
        }
      });

      setTimeout(() => {
        this.showResults();
      }, 500);

    } catch (error) {
      this.showError('処理中にエラーが発生しました', error);
    } finally {
      this.state.isProcessing = false;
      this.elements.processBtn.disabled = false;
    }
  }

  private updateProgress(percentage: number, detail: string): void {
    this.elements.progressFill.style.width = `${percentage}%`;
    this.elements.progressText.textContent = `${this.state.currentProgress} / ${this.state.totalFiles}`;
    this.elements.progressDetail.textContent = detail;
  }

  private showResults(): void {
    this.elements.progressSection.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';
    this.elements.resultsList.innerHTML = '';

    this.state.results.forEach((result, index) => {
      const resultItem = document.createElement('div');
      resultItem.className = `result-item ${result.error ? 'error' : 'success'} fade-in`;
      
      const fileName = result.in.split('/').pop() || result.in;
      const outputFileName = result.out ? result.out.split('/').pop() : '';
      
      const preview = result.out ? this.state.resultPreviews[result.out] : null;

      resultItem.innerHTML = `
        <div class="result-preview">
          ${result.error ? '❌' : preview ? `<img src="${preview}" alt="${outputFileName || fileName}">` : '<span class="file-preview-icon">✅</span>'}
        </div>
        <div class="result-info">
          <div class="file-name">${fileName}${result.out ? `<span class="file-output">→ ${outputFileName}</span>` : ''}</div>
          ${result.error ? `<div class="result-error">${result.error}</div>` : ''}
        </div>
      `;
      
      this.elements.resultsList.appendChild(resultItem);
    });
  }

  private async loadResultPreview(filePath: string): Promise<void> {
    try {
      const dataUrl = await window.bgremove.getImageThumbnail(filePath, { size: 260 });
      if (dataUrl) {
        this.state.resultPreviews[filePath] = dataUrl;
        this.showResults();
      }
    } catch (error) {
      console.error('結果プレビューの取得に失敗しました:', error);
    }
  }

  private clearFiles(): void {
    this.state.selectedFiles = [];
    this.state.previews = {};
    this.state.resultPreviews = {};
    this.elements.fileList.innerHTML = '';
    this.elements.filesSection.style.display = 'none';
    this.elements.processBtn.disabled = true;
  }

  private resetApp(): void {
    this.clearFiles();
    this.elements.resultsSection.style.display = 'none';
    this.elements.progressSection.style.display = 'none';
    this.state.results = [];
  }

  private openOutputFolder(): void {
    // 最初の成功した結果の出力ディレクトリを開く
    const successfulResult = this.state.results.find(r => r.out);
    if (successfulResult && successfulResult.out) {
      const outputDir = successfulResult.out.substring(0, successfulResult.out.lastIndexOf('/'));
      void window.bgremove.openPath(outputDir);
    }
  }

  private showError(message: string, error?: any): void {
    console.error(message, error);
    // 簡単なアラート表示（実際のアプリではより良いエラー表示を実装）
    alert(message);
  }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
  new BackgroundRemoverApp();
});
