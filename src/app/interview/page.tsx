import Link from "next/link";

export default function InterviewHomePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">면접 Workspace</h1>
      <Link className="text-sm underline" href="/interview/list">
        배정된 면접 대상자 목록
      </Link>
    </main>
  );
}
