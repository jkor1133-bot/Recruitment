import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR 관리</h1>
        <p className="mt-2 text-sm text-zinc-500">
          서류 업로드와 지원자·면접관 배정을 관리합니다.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/upload"
          className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
        >
          <h2 className="font-medium">서류 업로드</h2>
          <p className="mt-1 text-sm text-zinc-500">
            PDF/DOCX 단일·다중·ZIP 업로드 및 자동 파싱
          </p>
        </Link>
        <Link
          href="/admin/candidates"
          className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
        >
          <h2 className="font-medium">지원자 DB</h2>
          <p className="mt-1 text-sm text-zinc-500">지원자 목록 및 면접관 배정 (다음 구현)</p>
        </Link>
      </div>
    </main>
  );
}
