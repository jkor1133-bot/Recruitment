import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          채용 관리 및 면접 평가 시스템
        </h1>
        <p className="mt-2 text-zinc-500">
          서류 정형화 · 면접 평가 · 결과 대시보드
        </p>
      </div>
      <nav className="flex flex-wrap justify-center gap-4 text-sm">
        <Link className="underline" href="/login">
          로그인
        </Link>
        <Link className="underline" href="/admin">
          HR 관리
        </Link>
        <Link className="underline" href="/interview">
          면접 Workspace
        </Link>
        <Link className="underline" href="/results">
          결과 대시보드
        </Link>
      </nav>
    </main>
  );
}
