export type InputFormat = "auto" | "pdf" | "docx" | "csv" | "txt" | "html" | "xlsx" | "pptx" | "zip";
export type Mode = "fast" | "ultra_fast" | "balanced" | "quality" | "auto";
export type ResponseFormat = "markdown" | "json";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface ConvertOptions {
  inputFormat?: InputFormat;
  mode?: Mode;
  clean?: boolean;
  ocr?: boolean;
  imageOcr?: boolean;
  hybridOcr?: boolean;
  responseFormat?: ResponseFormat;
  slim?: boolean;
  /** 1-based page ranges, PDF only. Example: "1,3,5-10". */
  pages?: string;
  /** Auto-poll `/jobs/{id}` when the API returns 202. Default true. */
  autoPoll?: boolean;
  pollIntervalMs?: number;
}

export interface JsonResult {
  filename: string;
  input_format: string;
  markdown: string;
  engine: string;
  size_bytes: number;
  markdown_bytes: number;
  token_saved_estimate?: number;
  timings: Record<string, number>;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  body?: string | JsonResult;
  error?: string;
}

export type ConvertResult = string | JsonResult | Job;

/** A local file as returned by expo-image-picker / expo-document-picker / react-native-document-picker. */
export interface LocalFile {
  uri: string;
  name: string;
  mimeType?: string;
}
