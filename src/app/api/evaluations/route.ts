import { NextResponse } from "next/server";

/** 평가 저장/조회 엔드포인트 스텁 */
export async function GET() {
  return NextResponse.json(
    { message: "Not implemented: GET /api/evaluations" },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: "Not implemented: POST /api/evaluations" },
    { status: 501 }
  );
}
