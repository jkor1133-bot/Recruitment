import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type SupportedMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function detectMimeFromFileName(fileName: string): SupportedMime | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

export function isSupportedDocumentName(fileName: string): boolean {
  return detectMimeFromFileName(fileName) !== null;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: SupportedMime
): Promise<string> {
  if (mime === "application/pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text || "").trim();
    } finally {
      await parser.destroy();
    }
  }

  const result = await mammoth.extractRawText({ buffer });
  return (result.value || "").trim();
}
