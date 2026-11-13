-- =============================================================================
-- 채용 관리 및 면접 평가 시스템 - Supabase 초기 스키마 (재실행 가능)
-- PRD.md 섹션 5 기반
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums (이미 있으면 건너뜀)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'HR_ADMIN',
    'INTERVIEWER_1ST',
    'INTERVIEWER_2ND'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.parse_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'INTERVIEWER_1ST',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS '시스템 사용자 (HR 관리자 / 1·2차 면접관)';
COMMENT ON COLUMN public.users.role IS 'HR_ADMIN | INTERVIEWER_1ST | INTERVIEWER_2ND';

-- applicants
CREATE TABLE IF NOT EXISTS public.applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basic_info JSONB NOT NULL DEFAULT '{}'::JSONB,
  education JSONB NOT NULL DEFAULT '[]'::JSONB,
  certifications JSONB NOT NULL DEFAULT '[]'::JSONB,
  experiences JSONB NOT NULL DEFAULT '[]'::JSONB,
  cover_letter JSONB NOT NULL DEFAULT '{}'::JSONB,
  original_file_url TEXT,
  parse_status public.parse_status NOT NULL DEFAULT 'PENDING',
  parse_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.applicants IS '지원자 정형화 데이터 및 원본 파일 참조';
COMMENT ON COLUMN public.applicants.basic_info IS '이름, 연락처, 이메일, 지원직무 등';
COMMENT ON COLUMN public.applicants.education IS '학력 배열';
COMMENT ON COLUMN public.applicants.certifications IS '자격증 배열';
COMMENT ON COLUMN public.applicants.experiences IS '경력 배열';
COMMENT ON COLUMN public.applicants.cover_letter IS '문항-답변 세트 또는 표준 키워드 태깅 결과';
COMMENT ON COLUMN public.applicants.original_file_url IS 'Supabase Storage 원본 PDF/DOCX URL';

-- evaluations
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants (id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}'::JSONB,
  personality_pf BOOLEAN,
  overall_comment TEXT,
  calculated_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluations_applicant_evaluator_unique UNIQUE (applicant_id, evaluator_id),
  CONSTRAINT evaluations_calculated_level_check CHECK (
    calculated_level IS NULL
    OR calculated_level IN ('Lv1', 'Lv2', 'Lv3', 'Lv4', 'Lv5')
  )
);

COMMENT ON TABLE public.evaluations IS '면접관별 평가 점수 및 종합의견';
COMMENT ON COLUMN public.evaluations.scores IS '면접태도/공통역량/직무역량/조직적합성 5점 척도 JSON';
COMMENT ON COLUMN public.evaluations.personality_pf IS '인성 Pass(true) / Fail(false)';
COMMENT ON COLUMN public.evaluations.calculated_level IS '인성 제외 평균 기반 자동 등급 Lv1~Lv5';

-- interview_assignments
CREATE TABLE IF NOT EXISTS public.interview_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants (id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  round SMALLINT NOT NULL DEFAULT 1 CHECK (round IN (1, 2)),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_assignments_unique UNIQUE (applicant_id, interviewer_id, round)
);

COMMENT ON TABLE public.interview_assignments IS '지원자-면접관 배정 (1차/2차)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applicants_parse_status ON public.applicants (parse_status);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at ON public.applicants (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_applicant_id ON public.evaluations (applicant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator_id ON public.evaluations (evaluator_id);
CREATE INDEX IF NOT EXISTS idx_interview_assignments_interviewer ON public.interview_assignments (interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interview_assignments_applicant ON public.interview_assignments (applicant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_applicants_updated_at ON public.applicants;
CREATE TRIGGER trg_applicants_updated_at
  BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_evaluations_updated_at ON public.evaluations;
CREATE TRIGGER trg_evaluations_updated_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auth.users → public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email, 'Unknown'),
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'INTERVIEWER_1ST'::public.user_role
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Policies (있으면 삭제 후 재생성)
DROP POLICY IF EXISTS "users_select_own_or_hr" ON public.users;
CREATE POLICY "users_select_own_or_hr"
  ON public.users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.current_user_role() = 'HR_ADMIN'
  );

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_hr_manage" ON public.users;
CREATE POLICY "users_hr_manage"
  ON public.users FOR ALL TO authenticated
  USING (public.current_user_role() = 'HR_ADMIN')
  WITH CHECK (public.current_user_role() = 'HR_ADMIN');

DROP POLICY IF EXISTS "applicants_hr_all" ON public.applicants;
CREATE POLICY "applicants_hr_all"
  ON public.applicants FOR ALL TO authenticated
  USING (public.current_user_role() = 'HR_ADMIN')
  WITH CHECK (public.current_user_role() = 'HR_ADMIN');

DROP POLICY IF EXISTS "applicants_interviewer_select_assigned" ON public.applicants;
CREATE POLICY "applicants_interviewer_select_assigned"
  ON public.applicants FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('INTERVIEWER_1ST', 'INTERVIEWER_2ND')
    AND EXISTS (
      SELECT 1
      FROM public.interview_assignments ia
      WHERE ia.applicant_id = applicants.id
        AND ia.interviewer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "applicants_2nd_select_all" ON public.applicants;
CREATE POLICY "applicants_2nd_select_all"
  ON public.applicants FOR SELECT TO authenticated
  USING (public.current_user_role() = 'INTERVIEWER_2ND');

DROP POLICY IF EXISTS "evaluations_hr_select" ON public.evaluations;
CREATE POLICY "evaluations_hr_select"
  ON public.evaluations FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('HR_ADMIN', 'INTERVIEWER_2ND'));

DROP POLICY IF EXISTS "evaluations_own_select" ON public.evaluations;
CREATE POLICY "evaluations_own_select"
  ON public.evaluations FOR SELECT TO authenticated
  USING (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "evaluations_own_insert" ON public.evaluations;
CREATE POLICY "evaluations_own_insert"
  ON public.evaluations FOR INSERT TO authenticated
  WITH CHECK (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "evaluations_own_update" ON public.evaluations;
CREATE POLICY "evaluations_own_update"
  ON public.evaluations FOR UPDATE TO authenticated
  USING (evaluator_id = auth.uid())
  WITH CHECK (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "assignments_hr_all" ON public.interview_assignments;
CREATE POLICY "assignments_hr_all"
  ON public.interview_assignments FOR ALL TO authenticated
  USING (public.current_user_role() = 'HR_ADMIN')
  WITH CHECK (public.current_user_role() = 'HR_ADMIN');

DROP POLICY IF EXISTS "assignments_interviewer_select_own" ON public.interview_assignments;
CREATE POLICY "assignments_interviewer_select_own"
  ON public.interview_assignments FOR SELECT TO authenticated
  USING (interviewer_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'applicant-documents',
  'applicant-documents',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_hr_upload" ON storage.objects;
CREATE POLICY "storage_hr_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'applicant-documents'
    AND public.current_user_role() = 'HR_ADMIN'
  );

DROP POLICY IF EXISTS "storage_hr_update" ON storage.objects;
CREATE POLICY "storage_hr_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'applicant-documents'
    AND public.current_user_role() = 'HR_ADMIN'
  );

DROP POLICY IF EXISTS "storage_authenticated_read" ON storage.objects;
CREATE POLICY "storage_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'applicant-documents');

DROP POLICY IF EXISTS "storage_hr_delete" ON storage.objects;
CREATE POLICY "storage_hr_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'applicant-documents'
    AND public.current_user_role() = 'HR_ADMIN'
  );
