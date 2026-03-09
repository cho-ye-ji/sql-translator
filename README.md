# SQL Translator

자연어(한국어)를 표준 SQL 쿼리로 변환해주는 AI 번역기입니다.
별도의 백엔드나 API 키 없이, 브라우저에서 직접 Claude AI를 호출합니다.

---

## 주요 기능

- **자연어 → SQL 변환**: 한국어로 데이터 요청을 입력하면 SELECT, JOIN, WHERE 등 표준 SQL로 변환
- **설명 제공**: 생성된 쿼리에 대한 한글 설명과 주요 테이블명을 함께 표시
- **SQL 문법 하이라이팅**: `react-syntax-highlighter`를 이용한 가독성 높은 코드 표시
- **키보드 단축키**: `⌘ + Enter` (Mac) / `Ctrl + Enter` (Windows)로 빠른 변환
- **분할 화면 레이아웃**: 입력과 결과를 한 화면에서 동시에 확인

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | [Next.js 16](https://nextjs.org/) (App Router) |
| 언어 | TypeScript |
| 스타일링 | [Tailwind CSS v4](https://tailwindcss.com/) |
| AI 호출 | [Puter.js](https://puter.com/) — 프론트엔드 전용, 별도 API 키 불필요 |
| AI 모델 | Claude 3.5 Sonnet (Anthropic) |
| UI 아이콘 | [Lucide React](https://lucide.dev/) |
| 코드 하이라이팅 | [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) |

---

## Puter.js란?

[Puter.js](https://puter.com/)는 브라우저에서 직접 AI 모델(Claude, GPT 등)을 호출할 수 있는 라이브러리입니다.
별도의 서버나 API 키 없이 `<script>` 태그 하나로 Claude를 사용할 수 있습니다.

- CDN: `https://js.puter.com/v2/`
- 최초 AI 호출 시 Puter 계정 로그인 팝업이 나타날 수 있습니다 (무료 계정으로 사용 가능)

---

## 시스템 프롬프트 구조

AI에게 다음 형식의 JSON만 반환하도록 지시합니다:

```json
{
  "sql": "생성된 SQL 문장",
  "explanation": "쿼리에 대한 짧은 한글 설명",
  "table_hint": "사용된 주요 테이블명"
}
```

---

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 바로 사용할 수 있습니다.

---

## 사용 예시

**입력**
```
지난 30일간 주문 금액이 100만원 이상인 고객 목록을 최근 주문일 순으로 보여줘
```

**출력 (SQL)**
```sql
SELECT c.customer_id, c.name, c.email, MAX(o.order_date) AS last_order_date
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.customer_id, c.name, c.email
HAVING SUM(o.total_amount) >= 1000000
ORDER BY last_order_date DESC;
```

**설명**: 최근 30일 내 총 주문 금액이 100만원 이상인 고객을 최근 주문일 기준 내림차순 정렬

**주요 테이블**: customers, orders

---

## 프로젝트 구조

```
sql-translator/
├── src/
│   └── app/
│       ├── layout.tsx    # Puter.js CDN 스크립트 로드
│       ├── page.tsx      # 메인 UI + AI 호출 로직
│       └── globals.css
├── public/
├── package.json
└── README.md
```

---

## 배포

Vercel을 이용한 배포가 가장 간단합니다.
백엔드가 없는 순수 프론트엔드 앱이므로 별도 환경변수 설정 없이 바로 배포 가능합니다.

```bash
npx vercel
```
