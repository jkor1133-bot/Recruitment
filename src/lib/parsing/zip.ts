import AdmZip from "adm-zip";
import { isSupportedDocumentName } from "@/lib/parsing/extract";

export type ExtractedDocument = {
  fileName: string;
  buffer: Buffer;
};

export function extractDocumentsFromZip(zipBuffer: Buffer): ExtractedDocument[] {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const documents: ExtractedDocument[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const rawName = entry.entryName.replace(/\\/g, "/");
    if (rawName.includes("__MACOSX/") || rawName.split("/").pop()?.startsWith(".")) {
      continue;
    }

    const fileName = rawName.split("/").pop() || rawName;
    if (!isSupportedDocumentName(fileName)) continue;

    documents.push({
      fileName,
      buffer: entry.getData(),
    });
  }

  return documents;
}
