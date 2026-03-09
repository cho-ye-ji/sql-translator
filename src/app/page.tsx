"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, Database, Sparkles, TableProperties,
  Copy, Check, Plus, X, Save, Search, HelpCircle,
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
  tableName: string; // 표시용 테이블명 (예: PLUSCMS.TA_BILLING)
  content: string;   // Java 엔티티 or 스키마 원문
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newContent, setNewContent] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTables(JSON.parse(saved));
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      tableName: newTableName.trim() || newLabel.trim(),
      content: newContent.trim(),
    };
    saveTables([...tables, entry]);
    setNewLabel("");
    setNewTableName("");
    setNewContent("");
    setAddOpen(false);
    setSelectedIds((prev) => [...prev, entry.id]);
  }

  function handleDeleteTable(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    saveTables(tables.filter((t) => t.id !== id));
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  }

  function handleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
    setDropdownOpen(false);
    setSearchQuery("");
  }

  function removeSelected(id: string) {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  }

  const filtered = tables.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.label.toLowerCase().includes(q) ||
      t.tableName.toLowerCase().includes(q)
    );
  });

  function buildSchema() {
    return tables
      .filter((t) => selectedIds.includes(t.id))
      .map((t) => `// ${t.label} (${t.tableName})\n${t.content}`)
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
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTranslate();
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  테이블 컨텍스트
                </span>
                <div className="relative group">
                  <HelpCircle size={13} className="text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors" />
                  <div className="absolute left-0 top-full mt-2 w-64 hidden group-hover:block z-20">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl text-xs text-zinc-300 leading-relaxed">
                      <div className="absolute left-3 bottom-full w-2 h-2 bg-zinc-800 border-l border-t border-zinc-700 rotate-45 -mb-1" />
                      <p className="font-semibold text-zinc-100 mb-1">테이블 컨텍스트란?</p>
                      <p className="text-zinc-400 mb-2">선택사항입니다. 선택하지 않으면 AI가 테이블명을 자유롭게 추측합니다.</p>
                      <ol className="flex flex-col gap-1 text-zinc-400">
                        <li><span className="text-zinc-200">① 추가</span> — Java 엔티티 또는 스키마를 저장</li>
                        <li><span className="text-zinc-200">② 검색</span> — 이름으로 검색 후 클릭하여 선택</li>
                        <li><span className="text-zinc-200">③ 변환</span> — 선택된 테이블 기준으로 정확한 SQL 생성</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setAddOpen((v) => !v); setDropdownOpen(false); }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Plus size={12} />
                테이블 추가
              </button>
            </div>

            {/* 선택된 칩 */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedIds.map((id) => {
                  const t = tables.find((t) => t.id === id);
                  if (!t) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-600 border border-blue-500 text-white"
                    >
                      {t.label}
                      <span className="opacity-60 font-mono">{t.tableName}</span>
                      <button onClick={() => removeSelected(id)} className="hover:text-blue-200 transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* 검색창 + 드롭다운 */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500">
                <Search size={13} className="text-zinc-500 shrink-0" />
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                  placeholder={tables.length === 0 ? "저장된 테이블 없음 — 오른쪽 상단에서 추가" : "테이블 검색..."}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  disabled={tables.length === 0}
                />
              </div>

              {dropdownOpen && tables.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-zinc-600">검색 결과 없음</p>
                  ) : (
                    filtered.map((t) => {
                      const isSelected = selectedIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-zinc-800 transition-colors ${isSelected ? "opacity-40" : ""}`}
                          onClick={() => !isSelected && handleSelect(t.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-200">{t.label}</span>
                            <span className="text-xs text-zinc-500 font-mono">{t.tableName}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteTable(t.id, e)}
                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 테이블 추가 폼 */}
            {addOpen && (
              <div className="flex flex-col gap-2 rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="이름 (예: 청구)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                  <input
                    type="text"
                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="테이블명 (예: PLUSCMS.TA_BILLING)"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                  />
                </div>
                <textarea
                  className="rounded-lg bg-zinc-950 border border-zinc-700 p-3 text-zinc-300 placeholder-zinc-600 resize-none text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={5}
                  placeholder={"Java 엔티티 또는 스키마 직접 입력\n\n예시 1 (Java 엔티티):\n@Table(schema=\"PLUSCMS\", name=\"TA_BILLING\")\npublic class BillingRoot {\n  private String clamStdUiqNo;\n  private String billTitle;\n}\n\n예시 2 (직접):\nta.member(member_id, name, email, join_dt)"}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setAddOpen(false); setNewLabel(""); setNewTableName(""); setNewContent(""); }}
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddTable}
                    disabled={!newLabel.trim() || !newContent.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-xs font-medium transition-colors"
                  >
                    <Save size={12} />
                    저장
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 자연어 입력 */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">자연어 입력</span>
            <p className="text-zinc-500 text-xs">
              {selectedIds.length > 0
                ? `선택된 테이블 기준으로 SQL을 생성합니다.`
                : "테이블 미선택 시 AI가 테이블명을 자유롭게 생성합니다."}
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
