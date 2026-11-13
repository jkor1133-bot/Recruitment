import { NextResponse } from "next/server";

/** 서류 파싱(재시도 포함) 엔드포인트 스텁 */
export async function POST() {
  return NextResponse.json(
    { message: "Not implemented: POST /api/parse" },
    { status: 501 }
  );
}
