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
