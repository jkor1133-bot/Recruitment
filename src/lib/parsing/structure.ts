import { generateStructuredJson, resolveAiProvider } from "@/lib/ai/providers";
import type { Applicant, CoverLetter } from "@/types/database";

export type StructuredApplicant = Pick<
  Applicant,
  "basic_info" | "education" | "certifications" | "experiences" | "cover_letter"
>;

const STRUCTURE_PROMPT = `당신은 채용 서류 파서입니다. 이력서/자기소개서 원문에서 JSON만 반환하세요.
스키마:
{
  "basic_info": { "name": "", "email": "", "phone": "", "position": "" },
  "education": [{ "school": "", "major": "", "degree": "", "period": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "" }],
  "experiences": [{ "company": "", "title": "", "period": "", "description": "" }],
  "cover_letter": {
    "form_type": "company" | "platform",
    "items": [{ "question": "", "answer": "", "tag": "지원동기|직무경험|문제해결|성격장단점|기타" }]
  }
}
규칙:
- 당사 양식처럼 문항 제목이 분명하면 form_type=company, question/answer로 추출
- 사람인/잡코리아 등이면 form_type=platform, tag로 표준 키워드 분류
- 없는 값은 빈 문자열/빈 배열
- JSON 외 텍스트는 출력하지 마세요`;

function heuristicStructure(rawText: string, fileName: string): StructuredApplicant {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const emailMatch = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = rawText.match(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/);

  const qaItems: CoverLetter["items"] = [];
  const questionRegex =
    /^(?:\d+[\.)]\s*|Q\d+[.:)\s]|문항\s*\d+|지원동기|직무경험|문제해결|성격\s*장단점|입사후\s*포부)/i;

  let currentQuestion: string | null = null;
  let currentAnswer: string[] = [];

  const flush = () => {
    if (!currentQuestion) return;
    qaItems!.push({
      question: currentQuestion,
      answer: currentAnswer.join("\n").trim(),
      tag: guessTag(currentQuestion),
    });
    currentQuestion = null;
    currentAnswer = [];
  };

  for (const line of lines) {
    if (questionRegex.test(line)) {
      flush();
      currentQuestion = line;
      continue;
    }
    if (currentQuestion) currentAnswer.push(line);
  }
  flush();

  const provisionalName =
    lines.find((line) => line.length >= 2 && line.length <= 20 && !line.includes("@")) ||
    fileName.replace(/\.[^.]+$/, "");

  return {
    basic_info: {
      name: provisionalName,
      email: emailMatch?.[0] || "",
      phone: phoneMatch?.[0] || "",
      position: "",
      source_file: fileName,
    },
    education: [],
    certifications: [],
    experiences: [],
    cover_letter: {
      form_type: qaItems.length > 0 ? "company" : "platform",
      items:
        qaItems.length > 0
          ? qaItems
          : [
              {
                question: "원문 요약",
                answer: rawText.slice(0, 4000),
                tag: "기타",
              },
            ],
      raw_excerpt: rawText.slice(0, 2000),
    },
  };
}

function guessTag(question: string): string {
  if (/동기|지원\s*이유/.test(question)) return "지원동기";
  if (/직무|경험|경력/.test(question)) return "직무경험";
  if (/문제|갈등|해결/.test(question)) return "문제해결";
  if (/성격|장단|강점|약점/.test(question)) return "성격장단점";
  return "기타";
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

export async function structureApplicantData(
  rawText: string,
  fileName = "document"
): Promise<StructuredApplicant> {
  if (!rawText.trim()) {
    throw new Error("추출된 텍스트가 비어 있습니다.");
  }

  const { provider } = resolveAiProvider();
  if (provider === "none") {
    return heuristicStructure(rawText, fileName);
  }

  try {
    const { content } = await generateStructuredJson({
      systemPrompt: STRUCTURE_PROMPT,
      userPrompt: `파일명: ${fileName}\n\n원문:\n${rawText.slice(0, 12000)}`,
    });

    const parsed = JSON.parse(extractJson(content)) as StructuredApplicant;
    return {
      basic_info: {
        ...(parsed.basic_info || {}),
        source_file: fileName,
        ai_provider: provider,
      },
      education: parsed.education || [],
      certifications: parsed.certifications || [],
      experiences: parsed.experiences || [],
      cover_letter: parsed.cover_letter || { form_type: "platform", items: [] },
    };
  } catch {
    return heuristicStructure(rawText, fileName);
  }
}
