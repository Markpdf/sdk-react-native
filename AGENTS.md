# AGENTS.md — @markpdf/react-native

Guidance for AI agents generating or modifying code that uses this package.

## What this is

Standalone client for React Native (Expo or bare RN). **Does not depend on `@markpdf/sdk`** — it has its own `MarkpdfClient` because handling local files in RN (`{ uri, name, type }`) differs from Node/browser (`Blob`/`File`).

## Layout

```
src/
  client.ts          # MarkpdfClient — uses RN's native fetch
  useConvertFile.ts   # hook with progress, uses XMLHttpRequest (RN implements it globally)
  types.ts             # ConvertOptions, LocalFile, Job, JsonResult, ConvertResult
  errors.ts             # MarkpdfError hierarchy + errorForStatus()
  index.ts              # public exports
```

## Public surface

- `new MarkpdfClient({ apiKey, baseUrl? })`
- `client.convertLocalFile({ uri, name, mimeType }, options)` → `POST /convert` multipart. **Don't read the file into memory first** (don't use `expo-file-system` to read bytes) — RN's fetch uploads directly from the `uri` natively.
- `client.convertFromUrl(url, filename, options)`
- `client.pdfIndex(url, filename)` / `client.getJob(jobId)` / `client.waitForJob(jobId, options)`
- `useConvertFile(client)` → hook with `{ convert, status, progress, markdown, json, error, reset }`, same shape as `@markpdf/react`.

## Rules when generating code with this SDK

1. **`LocalFile` is `{ uri, name, mimeType? }`**, not a web `File`/`Blob` object — don't try to pass a `Blob` to `convertLocalFile`.
2. **The `uri` normally comes from a picker** (`expo-document-picker`, `expo-image-picker`, `react-native-document-picker`). If the agent needs to pick a file, integrate one of these, not `<input type="file">` (doesn't exist in RN).
3. **RN's `FormData` accepts the shape `{ uri, name, type }`** as if it were a `Blob` — this is RN-specific, doesn't work the same in plain browser code. Don't "fix" that code thinking it's mistyped.
4. **`useConvertFile` does NOT auto-poll 202** (same reason as `@markpdf/react`: uses raw XHR for progress). Use `client.convertLocalFile` directly (which does auto-poll by default) if you don't need a progress bar.
5. **No streaming support** (`/convert/stream`) in this package.
6. **Requires storage/media permissions** depending on the platform and picker used — that's handled by the picker, not this SDK.

## Commands

```bash
npm install
npm run build   # tsup
```

## Full reference

Public docs: https://docs.markpdf.tech/docs/sdks/react-native
