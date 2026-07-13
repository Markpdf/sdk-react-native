import { useCallback, useState } from "react";
import { errorForStatus, MarkpdfError } from "./errors.js";
import type { MarkpdfClient } from "./client.js";
import type { ConvertOptions, ConvertResult, JsonResult, LocalFile } from "./types.js";

export type ConvertStatus = "idle" | "uploading" | "converting" | "success" | "error";

export interface UseConvertFileState {
  status: ConvertStatus;
  progress: number;
  markdown: string | null;
  json: JsonResult | null;
  error: MarkpdfError | null;
}

const initialState: UseConvertFileState = {
  status: "idle",
  progress: 0,
  markdown: null,
  json: null,
  error: null,
};

/**
 * Upload a local file with progress reporting, using RN's built-in
 * `XMLHttpRequest` (RN's `fetch` does not expose upload progress events).
 *
 * ```tsx
 * const { convert, status, progress, markdown, error } = useConvertFile(client);
 * convert({ uri: pickedFile.uri, name: pickedFile.name });
 * ```
 */
export function useConvertFile(client: MarkpdfClient) {
  const [state, setState] = useState<UseConvertFileState>(initialState);

  const reset = useCallback(() => setState(initialState), []);

  const convert = useCallback(
    (file: LocalFile, options: ConvertOptions = {}) =>
      new Promise<ConvertResult | undefined>((resolve, reject) => {
        setState({ ...initialState, status: "uploading" });

        const form = new FormData();
        form.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? "application/octet-stream",
        } as unknown as Blob);

        const params = new URLSearchParams({
          input_format: options.inputFormat ?? "auto",
          mode: options.mode ?? "fast",
          clean: String(options.clean ?? true),
          ocr: String(options.ocr ?? false),
          image_ocr: String(options.imageOcr ?? false),
          hybrid_ocr: String(options.hybridOcr ?? false),
          response_format: options.responseFormat ?? "markdown",
          slim: String(options.slim ?? false),
          ...(options.pages ? { pages: options.pages } : {}),
        });

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${client.baseUrl}/convert?${params.toString()}`);
        xhr.setRequestHeader("x-api-key", client.apiKey);

        xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
          if (event.lengthComputable) {
            setState((prev) => ({ ...prev, progress: Math.round((event.loaded / event.total) * 100) }));
          }
        };

        xhr.onloadstart = () => setState((prev) => ({ ...prev, status: "converting" }));

        xhr.onload = () => {
          const contentType = xhr.getResponseHeader("content-type") ?? "";
          if (xhr.status >= 400) {
            const detail = contentType.includes("application/json") ? JSON.parse(xhr.responseText) : xhr.responseText;
            const err = errorForStatus(xhr.status, detail);
            setState((prev) => ({ ...prev, status: "error", error: err }));
            reject(err);
            return;
          }
          if (contentType.includes("application/json")) {
            const json = JSON.parse(xhr.responseText) as JsonResult;
            setState((prev) => ({ ...prev, status: "success", progress: 100, json }));
            resolve(json);
          } else {
            setState((prev) => ({ ...prev, status: "success", progress: 100, markdown: xhr.responseText }));
            resolve(xhr.responseText);
          }
        };

        xhr.onerror = () => {
          const err = new MarkpdfError("Network error while uploading");
          setState((prev) => ({ ...prev, status: "error", error: err }));
          reject(err);
        };

        xhr.send(form);
      }),
    [client],
  );

  return { ...state, convert, reset };
}
