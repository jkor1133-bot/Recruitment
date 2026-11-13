import { NextResponse } from "next/server";
import { parseApplicantById } from "@/lib/parsing/process";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { applicantId?: string };
    if (!body.applicantId) {
      return NextResponse.json({ error: "applicantId가 필요합니다." }, { status: 400 });
    }

    const result = await parseApplicantById(body.applicantId);
    return NextResponse.json(result, {
      status: result.status === "ERROR" ? 422 : 200,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "재파싱 실패" },
      { status: 500 }
    );
  }
}
