"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Database, Sparkles, TableProperties,
  Copy, Check, ChevronDown, ChevronUp, Plus, X, Save,
} from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

SyntaxHighlighter.registerLanguage("sql", sql);

interface SqlResult {
  sql: string;
  explanation: string;
  table_hint: string;
}

interface TableEntry {
  id: string;
  label: string;
  content: string; // Java 엔티티 코드 or 직접 입력 스키마
}

const STORAGE_KEY = "sql-translator-tables";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SqlResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 테이블 컨텍스트
  const [tables, setTables] = useState<TableEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contextOpen, setContextOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTables(JSON.parse(saved));
  }, []);

  function saveTables(updated: TableEntry[]) {
    setTables(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function handleAddTable() {
    if (!newLabel.trim() || !newContent.trim()) return;
    const entry: TableEntry = {
      id: Date.now().toString(),
      label: newLabel.trim(),
      content: newContent.trim(),
    };
    saveTables([...tables, entry]);
    setNewLabel("");
    setNewContent("");
    setAddOpen(false);
    setSelectedIds((prev) => [...prev, entry.id]);
  }

  function handleDeleteTable(id: string) {
    saveTables(tables.filter((t) => t.id !== id));
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }

  function buildSchema() {
    return tables
      .filter((t) => selectedIds.includes(t.id))
      .map((t) => `// ${t.label}\n${t.content}`)
      .join("\n\n");
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleTranslate() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, schema: buildSchema() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "알 수 없는 오류가 발생했습니다.");
      setResult(data);
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

  const SqlBlock = ({ sqlText }: { sqlText: string }) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">SQL</span>
        <button
          onClick={() => handleCopy(sqlText)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
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
        {sqlText}
      </SyntaxHighlighter>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <Database size={18} className="text-blue-400" />
        <span className="font-semibold text-white">SQL Translator</span>
        <span className="text-zinc-600 text-sm">자연어 → SQL</span>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 입력 패널 */}
        <div className="flex flex-col w-full md:w-1/2 border-r border-zinc-800 p-6 gap-4 overflow-y-auto">

          {/* 테이블 컨텍스트 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <button
              onClick={() => setContextOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TableProperties size={14} className="text-zinc-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  테이블 컨텍스트
                </span>
                {selectedIds.length > 0 && (
                  <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">
                    {selectedIds.length}
                  </span>
                )}
              </div>
              {contextOpen ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
            </button>

            {contextOpen && (
              <div className="px-4 pb-4 flex flex-col gap-3 border-t border-zinc-800">

                {/* 저장된 테이블 없을 때 */}
                {tables.length === 0 && !addOpen && (
                  <p className="text-xs text-zinc-600 pt-3">
                    저장된 테이블이 없습니다. 아래에서 추가하세요.
                  </p>
                )}

                {/* 저장된 테이블 칩 */}
                {tables.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3">
                    {tables.map((t) => (
                      <div key={t.id} className="flex items-center gap-1">
                        <button
                          onClick={() => toggleSelect(t.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selectedIds.includes(t.id)
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {t.label}
                        </button>
                        <button
                          onClick={() => handleDeleteTable(t.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 추가 폼 */}
                {addOpen ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <textarea
                      className="rounded-lg bg-zinc-950 border border-zinc-700 p-3 text-zinc-300 placeholder-zinc-600 resize-none text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows={6}
                      placeholder={"Java 엔티티 또는 스키마 직접 입력\n\n예시 1 (Java 엔티티):\n@Table(schema=\"PLUSCMS\", name=\"TA_BILLING\")\npublic class BillingRoot {\n  private String clamStdUiqNo;\n  private String billTitle;\n}\n\n예시 2 (직접):\nta.member(member_id, name, email, join_dt)"}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="테이블 이름 (예: 청구)"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                      <button
                        onClick={handleAddTable}
                        disabled={!newLabel.trim() || !newContent.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-xs font-medium transition-colors"
                      >
                        <Save size={12} />
                        저장
                      </button>
                      <button
                        onClick={() => { setAddOpen(false); setNewLabel(""); setNewContent(""); }}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-1"
                  >
                    <Plus size={13} />
                    테이블 추가
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 자연어 입력 */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">자연어 입력</span>
            <p className="text-zinc-500 text-xs">
              {selectedIds.length > 0
                ? `선택된 테이블 기준으로 SQL을 생성합니다.`
                : "테이블 미선택 시 AI가 테이블명을 추측합니다."}
            </p>
          </div>

          <textarea
            className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed min-h-[160px]"
            placeholder={"예: 지난 30일간 청구 금액이 100만원 이상인\n목록을 최근 날짜 순으로 보여줘"}
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
              <SqlBlock sqlText={result.sql} />
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
                <SqlBlock sqlText={result.sql} />
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
