"use client";

import { useState } from "react";
import { Loader2, Database, Sparkles, TableProperties } from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

SyntaxHighlighter.registerLanguage("sql", sql);

interface SqlResult {
  sql: string;
  explanation: string;
  table_hint: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SqlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTranslate() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: `너는 자연어를 표준 SQL 쿼리로 변환해주는 전문 번역가야. 사용자가 질문을 하면 반드시 아래의 JSON 형식으로만 답변해. 다른 설명이나 인사말은 절대 하지 마.\n{\n  "sql": "생성된 SQL 문장",\n  "explanation": "쿼리에 대한 짧은 한글 설명",\n  "table_hint": "사용된 주요 테이블명"\n}` },
            { role: "user", content: input },
          ],
          temperature: 0.2,
        }),
      });

      if (!groqRes.ok) {
        const err = await groqRes.text();
        throw new Error(`Groq API 오류: ${err}`);
      }

      const data = await groqRes.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("응답에서 JSON을 파싱할 수 없습니다.");

      setResult(JSON.parse(jsonMatch[0]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleTranslate();
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <Database size={18} className="text-blue-400" />
        <span className="font-semibold text-white">SQL Translator</span>
        <span className="text-zinc-600 text-sm">자연어 → SQL</span>
      </header>

      {/* Main: 좌우 분할 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 입력 패널 */}
        <div className="flex flex-col w-full md:w-1/2 border-r border-zinc-800 p-6 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">자연어 입력</span>
            <p className="text-zinc-500 text-xs">한국어로 원하는 데이터를 설명해주세요.</p>
          </div>

          <textarea
            className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed min-h-[200px]"
            placeholder={"예: 지난 30일간 주문 금액이 100만원 이상인\n고객 목록을 최근 주문일 순으로 보여줘"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            onClick={handleTranslate}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-3 text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "변환 중..." : "변환하기"}
            {!loading && <span className="text-xs text-blue-300 ml-1">⌘ Enter</span>}
          </button>
        </div>

        {/* 오른쪽: 결과 패널 (데스크탑) */}
        <div className="hidden md:flex flex-col w-1/2 p-6 gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">변환 결과</span>
            <p className="text-zinc-500 text-xs">생성된 SQL 쿼리가 여기에 표시됩니다.</p>
          </div>

          {!result && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-700">
              <Database size={36} strokeWidth={1} />
              <p className="text-sm">왼쪽에 자연어를 입력하고 변환하기를 눌러주세요.</p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 size={28} className="animate-spin text-blue-500" />
              <p className="text-sm">SQL을 생성하고 있습니다...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">SQL</span>
                <SyntaxHighlighter
                  language="sql"
                  style={atomOneDark}
                  customStyle={{
                    borderRadius: "0.75rem",
                    padding: "1rem 1.25rem",
                    fontSize: "0.8125rem",
                    background: "#18181b",
                    border: "1px solid #27272a",
                    margin: 0,
                  }}
                  wrapLongLines
                >
                  {result.sql}
                </SyntaxHighlighter>
              </div>

              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">설명</span>
                <p className="text-sm text-zinc-200 leading-relaxed">{result.explanation}</p>
              </div>

              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex items-center gap-3">
                <TableProperties size={15} className="text-zinc-500 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">주요 테이블</span>
                  <p className="text-sm text-zinc-200 font-mono">{result.table_hint}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 모바일: 결과를 입력 아래에 표시 */}
        {(result || error) && (
          <div className="md:hidden w-full border-t border-zinc-800 p-6 flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">변환 결과</span>

            {error && (
              <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {result && (
              <>
                <SyntaxHighlighter
                  language="sql"
                  style={atomOneDark}
                  customStyle={{
                    borderRadius: "0.75rem",
                    padding: "1rem 1.25rem",
                    fontSize: "0.8125rem",
                    background: "#18181b",
                    border: "1px solid #27272a",
                    margin: 0,
                  }}
                  wrapLongLines
                >
                  {result.sql}
                </SyntaxHighlighter>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">설명</span>
                  <p className="text-sm text-zinc-200 mt-1">{result.explanation}</p>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">주요 테이블</span>
                  <p className="text-sm text-zinc-200 font-mono mt-1">{result.table_hint}</p>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
