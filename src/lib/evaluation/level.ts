import type { CalculatedLevel, EvaluationScores } from "@/types/database";

/** 인성(P/F) 제외 5점 척도 평균 → Lv1~Lv5 */
export function calculateLevel(scores: EvaluationScores): CalculatedLevel {
  const values = [
    ...Object.values(scores.interview_attitude),
    ...Object.values(scores.common_competency),
    ...Object.values(scores.job_competency),
    ...Object.values(scores.org_fit),
  ];

  const avg = values.reduce((sum, n) => sum + n, 0) / values.length;

  if (avg >= 4.5) return "Lv5";
  if (avg >= 3.5) return "Lv4";
  if (avg >= 2.5) return "Lv3";
  if (avg >= 1.5) return "Lv2";
  return "Lv1";
}
