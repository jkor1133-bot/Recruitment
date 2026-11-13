# 채용 관리 및 면접 평가 시스템

요구사항은 [`PRD.md`](./PRD.md)를 참고하세요.

## 기술 스택

- Next.js (App Router)
- Supabase (PostgreSQL / Auth / Storage)
- OpenAI / Google Gemini (서류 정형화, `AI_PROVIDER`로 선택)
- Tailwind CSS

## 시작하기

```bash
cp .env.example .env.local
# .env.local 에 Supabase / OpenAI·Gemini 키 입력

npm install
npm run dev
```

## DB 마이그레이션

Supabase SQL Editor 또는 CLI에서 실행:

```text
supabase/migrations/001_initial_schema.sql
```

## 라우트

| 경로 | 설명 |
|------|------|
| `/login` | 로그인 |
| `/admin/upload` | 서류 업로드·파싱 |
| `/admin/candidates` | 지원자·면접관 배정 |
| `/interview/list` | 배정 면접 목록 |
| `/interview/[applicantId]` | 면접 Workspace (50:50) |
| `/results/[applicantId]` | 종합 리포트 |
