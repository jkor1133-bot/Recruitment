/**
 * OpenAI GPT-4o 기반 서류 정형화 스텁
 * - 당사 양식: 문항-답변 세트
 * - 플랫폼 양식: 표준 키워드 태깅
 */

import type { Applicant } from "@/types/database";

export async function structureApplicantData(
  _rawText: string
): Promise<
  Pick<
    Applicant,
    "basic_info" | "education" | "certifications" | "experiences" | "cover_letter"
  >
> {
  // TODO: OpenAI GPT-4o 호출
  throw new Error("Not implemented: structureApplicantData");
}
