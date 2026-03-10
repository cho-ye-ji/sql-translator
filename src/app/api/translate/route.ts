import { NextRequest, NextResponse } from "next/server";

const BASE_PROMPT = `너는 자연어를 표준 SQL 쿼리로 변환해주는 전문 번역가야. 사용자가 질문을 하면 반드시 아래의 JSON 형식으로만 답변해. 다른 설명이나 인사말은 절대 하지 마.
{
  "sql": "생성된 SQL 문장",
  "explanation": "쿼리에 대한 짧은 한글 설명",
  "table_hint": "사용된 주요 테이블명"
}`;

const NO_SCHEMA_ADDITION = `

테이블 스키마 정보가 제공되지 않았으므로, 테이블명과 컬럼명은 반드시 <테이블명>, <컬럼명> 형식의 플레이스홀더로 작성해. 사용자가 실제 테이블명으로 직접 교체해야 함을 명확히 해줘.
예시: SELECT <컬럼명> FROM <테이블명> WHERE <조건컬럼> >= '값'`;

export async function POST(req: NextRequest) {
  const { input, schema } = await req.json();

  if (!input?.trim()) {
    return NextResponse.json({ error: "입력값이 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const systemPrompt = schema?.trim()
    ? `${BASE_PROMPT}\n\n아래 Java 엔티티 또는 스키마 정보를 반드시 참고해서 실제 테이블명과 컬럼명을 사용해. camelCase 필드는 SNAKE_CASE 컬럼명으로 변환해서 사용해:\n\n${schema}`
    : BASE_PROMPT + NO_SCHEMA_ADDITION;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      temperature: 0.2,
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return NextResponse.json({ error: `Groq API 오류: ${err}` }, { status: 502 });
  }

  const data = await groqRes.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "응답에서 JSON을 파싱할 수 없습니다." }, { status: 502 });
  }

  const result = JSON.parse(jsonMatch[0]);
  return NextResponse.json(result);
}
