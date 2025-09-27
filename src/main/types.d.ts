export interface ProcessOptions {
  resizeLongEdge?: number;
  threshold?: number;
  blurRadius?: number;
  outDir?: string;
  suffix?: string;
  batch?: boolean;
}

export interface ProcessResult {
  ok: boolean;
  results: Array<{
    in: string;
    out?: string;
    error?: string;
  }>;
}

export interface InferenceOptions {
  modelPath: string;
  inputSize: number;
  threshold: number;
  blurRadius: number;
}

export interface ModelConfig {
  name: string;
  path: string;
  inputSize: number;
  description: string;
}
