import { NextResponse, type NextRequest } from "next/server";

/** 역할 기반 라우트 가드 스텁 — Supabase Auth 연동 후 구현 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/interview/:path*",
    "/results/:path*",
  ],
};
