type Props = {
  params: Promise<{ applicantId: string }>;
};

export default async function ResultsDetailPage({ params }: Props) {
  const { applicantId } = await params;

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">면접 결과 종합 리포트</h1>
      <p className="text-sm text-zinc-500">지원자 ID: {applicantId}</p>
      <section>
        <h2 className="font-medium">시각화</h2>
        <p className="text-sm text-zinc-500">Radar / Bar chart (구현 예정)</p>
      </section>
      <section>
        <h2 className="font-medium">종합의견 모아보기</h2>
        <p className="text-sm text-zinc-500">구현 예정</p>
      </section>
      <section>
        <h2 className="font-medium">면접관별 상세 (아코디언)</h2>
        <p className="text-sm text-zinc-500">A / B / C 개별 점수 (구현 예정)</p>
      </section>
    </main>
  );
}
