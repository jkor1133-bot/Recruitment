/** PRD 섹션 5 기반 DB / 도메인 타입 */

export type UserRole = "HR_ADMIN" | "INTERVIEWER_1ST" | "INTERVIEWER_2ND";

export type ParseStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";

export type CalculatedLevel = "Lv1" | "Lv2" | "Lv3" | "Lv4" | "Lv5";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface BasicInfo {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  [key: string]: unknown;
}

export interface EducationItem {
  school?: string;
  major?: string;
  degree?: string;
  period?: string;
  [key: string]: unknown;
}

export interface CertificationItem {
  name?: string;
  issuer?: string;
  date?: string;
  [key: string]: unknown;
}

export interface ExperienceItem {
  company?: string;
  title?: string;
  period?: string;
  description?: string;
  [key: string]: unknown;
}

/** 당사 양식: 문항-답변 / 플랫폼 양식: 표준 키워드 태깅 */
export interface CoverLetter {
  form_type?: "company" | "platform";
  items?: Array<{
    question?: string;
    answer?: string;
    tag?: "지원동기" | "직무경험" | "문제해결" | "성격장단점" | string;
  }>;
  [key: string]: unknown;
}

export interface Applicant {
  id: string;
  basic_info: BasicInfo;
  education: EducationItem[];
  certifications: CertificationItem[];
  experiences: ExperienceItem[];
  cover_letter: CoverLetter;
  original_file_url: string | null;
  parse_status?: ParseStatus;
  parse_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** evaluations.scores JSONB 구조 */
export interface EvaluationScores {
  interview_attitude: {
    company_interest: number;
    question_understanding: number;
    answer_style: number;
  };
  common_competency: {
    problem_solving: number;
    initiative: number;
    collaboration: number;
    growth_learning: number;
  };
  job_competency: {
    job_understanding: number;
    practical_experience: number;
    job_fit_contribution: number;
  };
  org_fit: {
    culture_adaptation: number;
    value_alignment: number;
  };
}

export interface Evaluation {
  id: string;
  applicant_id: string;
  evaluator_id: string;
  scores: EvaluationScores;
  personality_pf: boolean | null;
  overall_comment: string | null;
  calculated_level: CalculatedLevel | null;
  created_at?: string;
  updated_at?: string;
}

export interface InterviewAssignment {
  id: string;
  applicant_id: string;
  interviewer_id: string;
  round: 1 | 2;
  assigned_at?: string;
}
