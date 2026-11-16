export interface TextItem {
  text: string;
  x0: number;
  x1: number;
  y: number;
  page: number;
}

export interface ExtractedDoc {
  pages: number;
  items: TextItem[];
  meta: {
    source: 'pdf' | 'csv' | 'txt' | 'excel';
    filenameHint?: string;
  };
}

export interface WorkerExtractRequest {
  type: 'extract';
  fileData: ArrayBuffer;
  filename: string;
  password?: string;
}

export interface WorkerPasswordRequest {
  type: 'need_password';
  filename: string;
  isRetry: boolean;
}

export interface WorkerSuccessResponse {
  type: 'success';
  doc: ExtractedDoc;
}

export interface WorkerErrorResponse {
  type: 'error';
  error: string;
}

export type WorkerMessage = WorkerPasswordRequest | WorkerSuccessResponse | WorkerErrorResponse;
