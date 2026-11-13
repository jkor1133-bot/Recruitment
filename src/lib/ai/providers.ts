import { createGeminiClient } from "@/lib/gemini/client";
import { createOpenAIClient } from "@/lib/openai/client";

export type AiProvider = "openai" | "gemini" | "none";

export type AiProviderConfig = {
  provider: AiProvider;
  model: string;
};

/**
 * AI_PROVIDER 우선순위:
 * - openai | gemini | auto(기본)
 * - auto: OPENAI_API_KEY → GEMINI_API_KEY 순으로 사용
 */
export function resolveAiProvider(): AiProviderConfig {
  const preferred = (process.env.AI_PROVIDER || "auto").toLowerCase();

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (preferred === "openai") {
    if (!hasOpenAI) return { provider: "none", model: "" };
    return {
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o",
    };
  }

  if (preferred === "gemini") {
    if (!hasGemini) return { provider: "none", model: "" };
    return {
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    };
  }

  // auto
  if (hasOpenAI) {
    return {
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o",
    };
  }
  if (hasGemini) {
    return {
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    };
  }

  return { provider: "none", model: "" };
}

export async function generateStructuredJson(params: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ provider: Exclude<AiProvider, "none">; content: string }> {
  const { provider, model } = resolveAiProvider();

  if (provider === "none") {
    throw new Error("등록된 AI 키가 없습니다. OPENAI_API_KEY 또는 GEMINI_API_KEY를 설정하세요.");
  }

  if (provider === "openai") {
    const openai = createOpenAIClient();
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI 응답이 비어 있습니다.");
    return { provider, content };
  }

  const genAI = createGeminiClient();
  const geminiModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const result = await geminiModel.generateContent([
    { text: params.systemPrompt },
    { text: params.userPrompt },
  ]);
  const content = result.response.text();
  if (!content) throw new Error("Gemini 응답이 비어 있습니다.");
  return { provider, content };
}
