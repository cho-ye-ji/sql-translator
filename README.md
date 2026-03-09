# SQL Translator

자연어(한국어)를 표준 SQL 쿼리로 변환해주는 AI 번역기입니다.

---

## 주요 기능

- **자연어 → SQL 변환**: 한국어로 데이터 요청을 입력하면 SQL로 변환
- **테이블 컨텍스트**: Java 엔티티 또는 스키마를 등록해두면 실제 컬럼명 기반 SQL 생성
- **SQL 복사 버튼**: 클릭 한 번으로 클립보드에 복사
- **SQL 문법 하이라이팅**: 가독성 높은 코드 표시
- **키보드 단축키**: `⌘ + Enter` (Mac) / `Ctrl + Enter` (Windows)
- **분할 화면 레이아웃**: 입력과 결과를 한 화면에서 동시에 확인

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | [Next.js 16](https://nextjs.org/) (App Router) |
| 언어 | TypeScript |
| 스타일링 | [Tailwind CSS v4](https://tailwindcss.com/) |
| AI 호출 | Next.js API Route → [Groq API](https://groq.com/) (서버사이드, 키 보안) |
| AI 모델 | llama-3.3-70b-versatile (Groq 무료 tier) |
| UI 아이콘 | [Lucide React](https://lucide.dev/) |
| 코드 하이라이팅 | [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) |

---

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. Groq API 키 발급

[console.groq.com](https://console.groq.com) → 무료 가입 → API Keys → Create API Key

### 3. 환경변수 설정

`.env.local` 파일에 키 입력:

```
GROQ_API_KEY=gsk_여기에_발급받은_키_입력
```

> `.env.local`은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

---

## 테이블 컨텍스트 사용법

**선택사항입니다.** 설정하지 않으면 AI가 테이블명을 자유롭게 추측합니다.

### 테이블 추가 방법

화면 왼쪽 상단 `+ 테이블 추가` 클릭 후 아래 두 가지 형식 중 하나로 입력합니다.

**형식 1 — Java 엔티티 코드 그대로 붙여넣기**

```java
@Table(schema = "PLUSCMS", name = "TA_BILLING")
public class BillingRoot {
    private String clamStdUiqNo;
    private String billTitle;
    private LocalDate billDt;
    private Long billAmt;
}
```

**형식 2 — 스키마 직접 입력**

```
PLUSCMS.TA_BILLING(CLAM_STD_UIQ_NO, BILL_TITLE, BILL_DT, BILL_AMT)
```

> AI가 camelCase 필드명을 자동으로 SNAKE_CASE 컬럼명으로 변환합니다.

### 저장 및 선택

- 저장된 테이블은 브라우저 `localStorage`에 유지됩니다 (새로고침해도 남음)
- 검색창에서 이름으로 필터링 후 클릭하여 선택
- 선택된 테이블이 파란 칩으로 표시되며, 해당 스키마 기반으로 SQL 생성

---

## 배포 (Vercel)

```bash
# Vercel CLI로 배포
npx vercel
```

Vercel 대시보드 → Settings → Environment Variables에서 `GROQ_API_KEY` 등록 필요

---

## 프로젝트 구조

```
sql-translator/
├── src/
│   └── app/
│       ├── api/
│       │   └── translate/
│       │       └── route.ts  # Groq API 호출 (서버사이드)
│       ├── layout.tsx
│       ├── page.tsx          # 메인 UI
│       └── globals.css
├── .env.local                # API 키 (git 제외)
├── package.json
└── README.md
```
