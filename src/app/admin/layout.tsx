import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3 text-sm">
          <Link href="/admin" className="font-semibold tracking-tight">
            HR 관리
          </Link>
          <nav className="flex gap-4 text-zinc-600">
            <Link href="/admin/upload" className="hover:text-zinc-900">
              서류 업로드
            </Link>
            <Link href="/admin/candidates" className="hover:text-zinc-900">
              지원자 DB
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
