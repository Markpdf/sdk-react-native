# @markpdf/react-native

React Native SDK for the [markpdf](https://markpdf.tech) API. Works with Expo and bare React Native, using local file `uri`s from `expo-document-picker` / `react-native-document-picker` directly — no manual file reading.

## Install

```bash
npm install @markpdf/react-native
```

## Quickstart

```ts
import { MarkpdfClient } from "@markpdf/react-native";
import * as DocumentPicker from "expo-document-picker";

const client = new MarkpdfClient({ apiKey: "YOUR_API_KEY" });

const picked = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
if (picked.assets?.[0]) {
  const markdown = await client.convertLocalFile({
    uri: picked.assets[0].uri,
    name: picked.assets[0].name,
    mimeType: picked.assets[0].mimeType,
  });
  console.log(markdown);
}
```

## Upload with progress

```tsx
import { useConvertFile } from "@markpdf/react-native";

const { convert, status, progress, markdown, error } = useConvertFile(client);
await convert({ uri: picked.assets[0].uri, name: picked.assets[0].name });
```

Full documentation: https://docs.markpdf.tech

## API guide

`convertLocalFile` uploads `{ uri, name, mimeType? }` directly without loading the whole document into JavaScript memory. Use `convertFromUrl` for signed remote files, `pdfIndex` to select relevant pages, and `getJob`/`waitForJob` for queued work. The progress hook does not auto-poll `202` jobs; the direct client does by default.

Always narrow `ConvertResult` before rendering. Pickers may return temporary URIs, so convert or copy the file while that URI is still valid.

## Mobile security

- Never ship a valuable unrestricted API key in an app bundle; mobile secrets can be extracted. Prefer an authenticated backend that issues scoped access or proxies conversion.
- Ask only for picker permissions you need, validate size/type before upload, and avoid copying documents into long-lived public storage.
- Redact file URIs, signed URLs, API keys, document text and conversion responses from crash reports and analytics.
- Treat returned Markdown as untrusted. Sanitize it before WebView/HTML rendering and isolate it from trusted instructions when used by an AI agent.
- Add rate limits, user quotas and request-size limits to the backend proxy.

## For coding agents

Read [`AGENTS.md`](./AGENTS.md), [`SKILL.md`](./SKILL.md), and [`SECURITY.md`](./SECURITY.md). Preserve the React Native `{ uri, name, type }` upload shape, do not replace it with a browser `File`, and do not invent streaming support.

## Troubleshooting

- Upload cannot read the URI: ensure the picker result has not expired and permissions are still valid.
- Progress finishes but conversion is queued: use the direct client or poll the returned job.
- `401`: verify the environment/backend supplied a valid key; do not print it during diagnosis.
- `413`/`429`: enforce local limits and bounded backoff instead of immediate repeated uploads.

## S3/R2 uploads, downloads and database optimization

For production workloads, upload large files directly from the client to a private S3 or Cloudflare R2 bucket with a short-lived presigned `PUT` URL. Then call this SDK's URL-conversion method so the application server never buffers the full document. Large Markdown results can be written straight back to object storage with the SDK's output URL option where supported.

Recommended flow:

1. Authenticate and authorize the user.
2. Create a database row with a server-generated conversion ID and `uploading` status.
3. Generate a random tenant-scoped object key and a short-lived presigned upload URL.
4. Upload directly to private storage and verify object size/checksum server-side.
5. Reuse a completed conversion only when tenant, input SHA-256 and canonical options hash all match.
6. Convert from a signed input URL; use a signed output URL for large results.
7. Store status and object metadata in the database, while keeping large Markdown bodies in S3/R2.
8. Authorize downloads and return a short-lived signed `GET` URL or a hardened attachment response.
9. Expire temporary objects, abandoned multipart uploads and stale database rows automatically.

Do not use filenames, object URLs or multipart ETags as content identity. Use a verified checksum, normalize every output-affecting conversion option into the cache key, and isolate deduplication by tenant. Keep database indexes focused on tenant history, active jobs and expiry cleanup.

See [`STORAGE.md`](./STORAGE.md) for the full SQL model, partial indexes, idempotent state transitions, cache-key rules, S3/R2 permissions, CORS, multipart uploads, lifecycle policies, secure download headers and AI/RAG protections.
