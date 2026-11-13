type Props = {
  params: Promise<{ applicantId: string }>;
};

export default async function InterviewWorkspacePage({ params }: Props) {
  const { applicantId } = await params;

  return (
    <main className="grid flex-1 grid-cols-1 md:grid-cols-2">
      <section className="border-r border-zinc-200 p-6">
        <h2 className="text-lg font-semibold">서류 뷰어</h2>
        <p className="mt-1 text-sm text-zinc-500">
          지원자 ID: {applicantId} — 기본/학력/경력/자소서 탭 (구현 예정)
        </p>
      </section>
      <section className="p-6">
        <h2 className="text-lg font-semibold">평가 폼</h2>
        <p className="mt-1 text-sm text-zinc-500">
          5점 척도 · 인성 P/F · 종합의견 (구현 예정)
        </p>
      </section>
    </main>
  );
}
