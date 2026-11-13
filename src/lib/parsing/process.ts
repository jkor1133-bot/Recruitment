import { createAdminClient } from "@/lib/supabase/admin";
import {
  detectMimeFromFileName,
  extractTextFromBuffer,
} from "@/lib/parsing/extract";
import { structureApplicantData } from "@/lib/parsing/structure";

export type ProcessResult = {
  applicantId: string;
  fileName: string;
  status: "COMPLETED" | "ERROR";
  error?: string;
  name?: string;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\uac00-\ud7a3-]+/g, "_");
}

export async function createApplicantAndUpload(params: {
  fileName: string;
  buffer: Buffer;
  mime: string;
}): Promise<{ applicantId: string; storagePath: string }> {
  const supabase = createAdminClient();
  const safeName = sanitizeFileName(params.fileName);

  const { data: applicant, error: insertError } = await supabase
    .from("applicants")
    .insert({
      basic_info: { source_file: params.fileName, name: params.fileName.replace(/\.[^.]+$/, "") },
      parse_status: "PENDING",
      parse_error: null,
    })
    .select("id")
    .single();

  if (insertError || !applicant) {
    throw new Error(insertError?.message || "지원자 레코드 생성 실패");
  }

  const storagePath = `${applicant.id}/${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("applicant-documents")
    .upload(storagePath, params.buffer, {
      contentType: params.mime,
      upsert: true,
    });

  if (uploadError) {
    await supabase
      .from("applicants")
      .update({
        parse_status: "ERROR",
        parse_error: `스토리지 업로드 실패: ${uploadError.message}`,
      })
      .eq("id", applicant.id);
    throw new Error(`스토리지 업로드 실패: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from("applicant-documents")
    .getPublicUrl(storagePath);

  await supabase
    .from("applicants")
    .update({
      original_file_url: publicData.publicUrl || storagePath,
      parse_status: "PENDING",
    })
    .eq("id", applicant.id);

  return { applicantId: applicant.id, storagePath };
}

export async function parseApplicantById(applicantId: string): Promise<ProcessResult> {
  const supabase = createAdminClient();

  const { data: applicant, error } = await supabase
    .from("applicants")
    .select("id, basic_info, original_file_url")
    .eq("id", applicantId)
    .single();

  if (error || !applicant) {
    throw new Error(error?.message || "지원자를 찾을 수 없습니다.");
  }

  const fileName =
    (applicant.basic_info as { source_file?: string } | null)?.source_file ||
    "document.pdf";

  await supabase
    .from("applicants")
    .update({ parse_status: "PROCESSING", parse_error: null })
    .eq("id", applicantId);

  try {
    const storagePath = applicant.original_file_url?.includes(applicantId)
      ? extractStoragePath(applicant.original_file_url, applicantId)
      : `${applicantId}/${sanitizeFileName(fileName)}`;

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("applicant-documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || "원본 파일 다운로드 실패");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mime = detectMimeFromFileName(fileName);
    if (!mime) throw new Error("지원하지 않는 파일 형식입니다. (PDF, DOCX만 가능)");

    const rawText = await extractTextFromBuffer(buffer, mime);
    const structured = await structureApplicantData(rawText, fileName);

    const { error: updateError } = await supabase
      .from("applicants")
      .update({
        ...structured,
        parse_status: "COMPLETED",
        parse_error: null,
      })
      .eq("id", applicantId);

    if (updateError) throw new Error(updateError.message);

    return {
      applicantId,
      fileName,
      status: "COMPLETED",
      name: String(structured.basic_info.name || ""),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "파싱 중 알 수 없는 오류";
    await supabase
      .from("applicants")
      .update({ parse_status: "ERROR", parse_error: message })
      .eq("id", applicantId);

    return {
      applicantId,
      fileName,
      status: "ERROR",
      error: message,
    };
  }
}

function extractStoragePath(urlOrPath: string, applicantId: string) {
  if (!urlOrPath.startsWith("http")) return urlOrPath;
  const marker = `/applicant-documents/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx >= 0) return decodeURIComponent(urlOrPath.slice(idx + marker.length));
  return `${applicantId}/${urlOrPath.split("/").pop()}`;
}
