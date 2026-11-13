import { NextResponse } from "next/server";

/** 단일/다중/ZIP 업로드 엔드포인트 스텁 */
export async function POST() {
  return NextResponse.json(
    { message: "Not implemented: POST /api/upload" },
    { status: 501 }
  );
}
