import { errorForStatus, JobFailedError } from "./errors.js";
import type { ConvertOptions, ConvertResult, Job, JsonResult, LocalFile } from "./types.js";

export interface MarkpdfClientOptions {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.markpdf.tech";

function buildQuery(options: ConvertOptions): URLSearchParams {
  const params = new URLSearchParams({
    input_format: options.inputFormat ?? "auto",
    mode: options.mode ?? "fast",
    clean: String(options.clean ?? true),
    ocr: String(options.ocr ?? false),
    image_ocr: String(options.imageOcr ?? false),
    hybrid_ocr: String(options.hybridOcr ?? false),
    response_format: options.responseFormat ?? "markdown",
    slim: String(options.slim ?? false),
  });
  if (options.pages) params.set("pages", options.pages);
  return params;
}

async function parseConversionResponse(res: Response): Promise<ConvertResult> {
  if (res.status === 202) {
    return (await res.json()) as Job;
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status >= 400) {
    const detail = contentType.includes("application/json") ? await res.json() : await res.text();
    throw errorForStatus(res.status, detail);
  }
  if (contentType.includes("application/json")) {
    return (await res.json()) as JsonResult;
  }
  return res.text();
}

/**
 * React Native client for the markpdf API. Uses RN's native `fetch`/`FormData`
 * support for `{ uri, name, type }` file parts, so local files picked with
 * `expo-document-picker` or `react-native-document-picker` upload directly
 * without reading them into JS memory first.
 *
 * ```ts
 * const client = new MarkpdfClient({ apiKey: "..." });
 * const markdown = await client.convertLocalFile({ uri: pickedFile.uri, name: pickedFile.name });
 * ```
 */
export class MarkpdfClient {
  readonly apiKey: string;
  readonly baseUrl: string;

  constructor(options: MarkpdfClientOptions) {
    if (!options.apiKey) {
      throw new Error("Missing API key. Pass { apiKey }.");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { "x-api-key": this.apiKey, ...extra };
  }

  private async maybePoll(result: ConvertResult, options: ConvertOptions): Promise<ConvertResult> {
    const autoPoll = options.autoPoll ?? true;
    if (autoPoll && typeof result === "object" && result !== null && "job_id" in result) {
      return this.waitForJob((result as Job).job_id, { pollIntervalMs: options.pollIntervalMs });
    }
    return result;
  }

  /** Upload a local file (picked via a document/image picker) via `POST /convert` (multipart/form-data). */
  async convertLocalFile(file: LocalFile, options: ConvertOptions = {}): Promise<ConvertResult> {
    const form = new FormData();
    // React Native's fetch accepts this shape for local file uploads.
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as unknown as Blob);

    const query = buildQuery(options);
    const res = await fetch(`${this.baseUrl}/convert?${query.toString()}`, {
      method: "POST",
      headers: this.headers(),
      body: form,
    });
    const result = await parseConversionResponse(res);
    return this.maybePoll(result, options);
  }

  /** Convert a document the API fetches itself from a pre-signed URL via `POST /convert/from-url`. */
  async convertFromUrl(url: string, filename?: string, options: ConvertOptions = {}): Promise<ConvertResult> {
    const body = {
      url,
      filename,
      input_format: options.inputFormat ?? "auto",
      mode: options.mode ?? "fast",
      clean: options.clean ?? true,
      ocr: options.ocr ?? false,
      image_ocr: options.imageOcr ?? false,
      hybrid_ocr: options.hybridOcr ?? false,
      response_format: options.responseFormat ?? "markdown",
      slim: options.slim ?? false,
      pages: options.pages,
    };
    const res = await fetch(`${this.baseUrl}/convert/from-url`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify(body),
    });
    const result = await parseConversionResponse(res);
    return this.maybePoll(result, options);
  }

  /** Fetch a compact structural index of a PDF (`POST /pdf/index`) without converting it. */
  async pdfIndex(url: string, filename?: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/pdf/index`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify({ url, filename }),
    });
    if (res.status >= 400) {
      throw errorForStatus(res.status, await res.json().catch(() => ({})));
    }
    return (await res.json()) as Record<string, unknown>;
  }

  /** Poll the status of an auto-queued conversion (`GET /jobs/{id}`). */
  async getJob(jobId: string): Promise<Job> {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, { headers: this.headers() });
    if (res.status >= 400) {
      throw errorForStatus(res.status, await res.json().catch(() => ({})));
    }
    return (await res.json()) as Job;
  }

  /** Block until a queued job reaches `completed` or `failed`. */
  async waitForJob(jobId: string, options: { pollIntervalMs?: number; timeoutMs?: number } = {}): Promise<Job> {
    const pollIntervalMs = options.pollIntervalMs ?? 5000;
    const deadline = options.timeoutMs ? Date.now() + options.timeoutMs : undefined;
    while (true) {
      const job = await this.getJob(jobId);
      if (job.status === "completed") return job;
      if (job.status === "failed") throw new JobFailedError(job.error ?? "Job failed", undefined, job);
      if (deadline && Date.now() >= deadline) {
        throw new Error(`Job ${jobId} did not finish within ${options.timeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}
