/**
 * 텍스트 추출 스텁 (pdf-parse / mammoth 연동 예정)
 * - PDF → pdf-parse
 * - DOCX → mammoth
 */

export type SupportedMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractTextFromBuffer(
  _buffer: Buffer,
  _mime: SupportedMime
): Promise<string> {
  // TODO: pdf-parse / mammoth 연동
  throw new Error("Not implemented: extractTextFromBuffer");
}
