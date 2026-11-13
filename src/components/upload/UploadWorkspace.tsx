"use client";

import { useMemo, useRef, useState } from "react";

type JobStatus = "대기" | "진행" | "완료" | "에러";

type UploadJob = {
  id: string;
  fileName: string;
  status: JobStatus;
  applicantId?: string;
  error?: string;
  name?: string;
};

type ApiItem = {
  applicantId?: string;
  fileName: string;
  status: "COMPLETED" | "ERROR" | "PENDING";
  error?: string;
  name?: string;
};

const ACCEPT =
  ".pdf,.docx,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip";

function statusBadgeClass(status: JobStatus) {
  switch (status) {
    case "대기":
      return "bg-zinc-100 text-zinc-700";
    case "진행":
      return "bg-amber-100 text-amber-800";
    case "완료":
      return "bg-emerald-100 text-emerald-800";
    case "에러":
      return "bg-rose-100 text-rose-800";
  }
}

function toJobStatus(status: ApiItem["status"]): JobStatus {
  if (status === "COMPLETED") return "완료";
  if (status === "ERROR") return "에러";
  return "대기";
}

export function UploadWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      total: jobs.length,
      done: jobs.filter((j) => j.status === "완료").length,
      error: jobs.filter((j) => j.status === "에러").length,
      running: jobs.filter((j) => j.status === "진행").length,
    };
  }, [jobs]);

  const progressPercent = summary.total
    ? Math.round(((summary.done + summary.error) / summary.total) * 100)
    : 0;

  async function uploadFiles(files: File[]) {
    const nextJobs: UploadJob[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      fileName: file.name,
      status: "진행" as const,
    }));

    setJobs((prev) => [...nextJobs, ...prev]);
    setUploading(true);
    setGlobalError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");

      const items = (data.items || []) as ApiItem[];
      const hasZip = files.some((f) => f.name.toLowerCase().endsWith(".zip"));

      setJobs((prev) => {
        const withoutBatch = prev.filter(
          (job) => !nextJobs.some((n) => n.id === job.id)
        );

        if (hasZip) {
          const expanded = items.map((item) => ({
            id: crypto.randomUUID(),
            fileName: item.fileName,
            status: toJobStatus(item.status),
            applicantId: item.applicantId,
            error: item.error,
            name: item.name,
          }));
          return [...expanded, ...withoutBatch];
        }

        const mapped = nextJobs.map((job) => {
          const item = items.find((i) => i.fileName === job.fileName);
          if (!item) {
            return { ...job, status: "에러" as const, error: "서버 응답에 결과가 없습니다." };
          }
          return {
            ...job,
            status: toJobStatus(item.status),
            applicantId: item.applicantId,
            error: item.error,
            name: item.name,
          };
        });

        return [...mapped, ...withoutBatch];
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "업로드 중 오류";
      setGlobalError(message);
      setJobs((prev) =>
        prev.map((job) =>
          nextJobs.some((n) => n.id === job.id)
            ? { ...job, status: "에러", error: message }
            : job
        )
      );
    } finally {
      setUploading(false);
    }
  }

  async function retryJob(job: UploadJob) {
    if (!job.applicantId) {
      setGlobalError("재시도할 지원자 ID가 없습니다. 파일을 다시 업로드해 주세요.");
      return;
    }

    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id ? { ...j, status: "진행", error: undefined } : j
      )
    );

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId: job.applicantId }),
      });
      const data = await res.json();

      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: data.status === "COMPLETED" ? "완료" : "에러",
                error: data.error || data.message,
                name: data.name,
              }
            : j
        )
      );
    } catch (err) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: "에러",
                error: err instanceof Error ? err.message : "재시도 실패",
              }
            : j
        )
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 bg-white"
        }`}
      >
        <p className="text-lg font-medium text-zinc-900">파일을 드래그 앤 드롭</p>
        <p className="mt-2 text-sm text-zinc-500">
          PDF, DOCX 단일/다중 업로드 또는 ZIP 일괄 업로드
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            파일 선택 (단일/다중)
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => zipInputRef.current?.click()}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            ZIP 업로드
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </section>

      {(uploading || jobs.length > 0) && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium text-zinc-900">파싱 진행 현황</h2>
              <p className="text-sm text-zinc-500">
                완료 {summary.done} / 전체 {summary.total}
                {summary.error > 0 ? ` · 실패 ${summary.error}` : ""}
                {summary.running > 0 ? ` · 진행 ${summary.running}` : ""}
              </p>
            </div>
            <span className="text-sm tabular-nums text-zinc-600">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-900 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>
      )}

      {globalError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {globalError}
        </p>
      )}

      {jobs.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{job.fileName}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {job.name ? `추출 이름: ${job.name}` : "대기/처리 중"}
                    {job.applicantId ? ` · ID ${job.applicantId.slice(0, 8)}…` : ""}
                  </p>
                  {job.error && (
                    <p className="mt-1 text-sm text-rose-600">{job.error}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(job.status)}`}
                  >
                    {job.status}
                  </span>
                  {job.status === "에러" && (
                    <button
                      type="button"
                      onClick={() => void retryJob(job)}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
