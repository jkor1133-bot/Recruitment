import Link from "next/link";
import { UploadWorkspace } from "@/components/upload/UploadWorkspace";

export default function AdminUploadPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            <Link href="/admin" className="underline-offset-2 hover:underline">
              HR 관리
            </Link>
            {" / "}
            서류 업로드
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            서류 업로드
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            PDF·DOCX 단일/다중 업로드와 ZIP 일괄 업로드를 지원합니다. 업로드 후 자동 파싱되며,
            실패 항목은 Retry로 다시 시도할 수 있습니다.
          </p>
        </div>
      </div>

      <UploadWorkspace />
    </main>
  );
}
