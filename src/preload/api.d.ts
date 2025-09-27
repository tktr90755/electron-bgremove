export interface BgRemoveAPI {
  pickFiles(): Promise<string[]>;
  pickOutputDir(): Promise<string | null>;
  processFiles(
    paths: string[], 
    opts?: {
      resizeLongEdge?: number;
      threshold?: number;
      blurRadius?: number;
      outDir?: string;
      suffix?: string;
      batch?: boolean;
    }
  ): Promise<{
    ok: boolean;
    results: Array<{
      in: string;
      out?: string;
      error?: string;
    }>;
  }>;
  getModelInfo(): Promise<{
    name: string;
    path: string;
    inputSize: number;
    description: string;
  } | null>;
  getProviders(): Promise<string[]>;
  getImagePreview(path: string, options?: { size?: number }): Promise<string | null>;
  getImageThumbnail(path: string, options?: { size?: number }): Promise<string | null>;
  openPath(path: string): Promise<string>;
}

declare global {
  interface Window {
    bgremove: BgRemoveAPI;
  }
}
