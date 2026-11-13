import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">HR 관리</h1>
      <nav className="flex flex-col gap-2 text-sm">
        <Link className="underline" href="/admin/upload">
          서류 업로드
        </Link>
        <Link className="underline" href="/admin/candidates">
          지원자 목록 / 면접관 배정
        </Link>
      </nav>
    </main>
  );
}
