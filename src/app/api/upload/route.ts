import { NextResponse } from "next/server";
import pLimit from "p-limit";
import {
  detectMimeFromFileName,
  isSupportedDocumentName,
} from "@/lib/parsing/extract";
import {
  createApplicantAndUpload,
  parseApplicantById,
} from "@/lib/parsing/process";
import { extractDocumentsFromZip } from "@/lib/parsing/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadItemResult = {
  applicantId?: string;
  fileName: string;
  status: "COMPLETED" | "ERROR" | "PENDING";
  error?: string;
  name?: string;
};

const CONCURRENCY = 3;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((v): v is File => v instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
    }

    const documents: { fileName: string; buffer: Buffer; mime: string }[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const lower = file.name.toLowerCase();

      if (lower.endsWith(".zip") || file.type === "application/zip") {
        const extracted = extractDocumentsFromZip(buffer);
        if (extracted.length === 0) {
          return NextResponse.json(
            { error: `${file.name} 안에 유효한 PDF/DOCX가 없습니다.` },
            { status: 400 }
          );
        }
        for (const doc of extracted) {
          const mime = detectMimeFromFileName(doc.fileName)!;
          documents.push({ fileName: doc.fileName, buffer: doc.buffer, mime });
        }
        continue;
      }

      if (!isSupportedDocumentName(file.name)) {
        return NextResponse.json(
          { error: `지원하지 않는 형식: ${file.name} (PDF, DOCX, ZIP만 가능)` },
          { status: 400 }
        );
      }

      const mime = detectMimeFromFileName(file.name)!;
      documents.push({ fileName: file.name, buffer, mime });
    }

    const limit = pLimit(CONCURRENCY);
    const results = await Promise.all(
      documents.map((doc) =>
        limit(async (): Promise<UploadItemResult> => {
          try {
            const { applicantId } = await createApplicantAndUpload(doc);
            const parsed = await parseApplicantById(applicantId);
            return {
              applicantId,
              fileName: doc.fileName,
              status: parsed.status,
              error: parsed.error,
              name: parsed.name,
            };
          } catch (err) {
            return {
              fileName: doc.fileName,
              status: "ERROR",
              error: err instanceof Error ? err.message : "업로드 실패",
            };
          }
        })
      )
    );

    return NextResponse.json({
      total: results.length,
      completed: results.filter((r) => r.status === "COMPLETED").length,
      failed: results.filter((r) => r.status === "ERROR").length,
      items: results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 처리 중 오류" },
      { status: 500 }
    );
  }
}
