---
name: markpdf-react-native
description: Best practices for @markpdf/react-native (Expo/bare RN client and useConvertFile hook). Use when integrating document conversion into a React Native app — file pickers, progress, permissions, key safety.
---

# Best practices — @markpdf/react-native

## Picking and uploading a file

Always go through a picker library to get a `LocalFile`-shaped object — don't try to construct `{ uri, name, mimeType }` from scratch:

```ts
import * as DocumentPicker from "expo-document-picker";

const picked = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
if (picked.assets?.[0]) {
  const markdown = await client.convertLocalFile({
    uri: picked.assets[0].uri,
    name: picked.assets[0].name,
    mimeType: picked.assets[0].mimeType,
  });
}
```

Don't read the file into a buffer first (`expo-file-system` `readAsStringAsync`, etc.) before calling `convertLocalFile` — that defeats the point of this client, which streams directly from the `uri`.

## `convertLocalFile` vs `useConvertFile`

- **`convertLocalFile`**: fire-and-await, auto-polls 202 by default. Use for background/non-interactive conversions.
- **`useConvertFile(client)`**: when the UI needs a progress bar. Does not auto-poll 202 — if you expect large documents, call `client.waitForJob` manually after `convert()` resolves with a queued job.

## Error handling

```ts
try {
  const markdown = await client.convertLocalFile(file);
} catch (err) {
  if (err instanceof RateLimitError) {
    // exponential backoff, retry
  } else if (err instanceof MarkpdfError) {
    Alert.alert("Conversion failed", err.message);
  } else {
    throw err;
  }
}
```

## Key safety

- This client calls the API directly from the app — the key ships inside the bundle (extractable from the compiled binary). Only ship a key you're comfortable being public (rate-limited, scoped), or proxy through your own backend if it must stay private.

## Platform notes

- Storage/media permissions are the picker's responsibility (`expo-document-picker`, `react-native-document-picker`), not this SDK's — request them per that library's docs before invoking the picker.
- Bare RN vs Expo: the client and hook work identically in both; only the picker library setup differs.

## Resources

- Docs: https://docs.markpdf.tech/docs/sdks/react-native
- See `AGENTS.md` in this folder.
