# 📄 작업 지시 — 틈새 인사이트 (Niche Insight) 신규 메뉴 추가

> 이 문서는 클로드 코드(Claude Code)에 직접 전달할 작업 지시문이다.  
> 반드시 본인 승인 받은 부분만 단계별로 구현하라.

---

## 1. 작업 개요

기존 서비스에 **틈새 인사이트(Niche Insight)** 라는 신규 메인 메뉴를 추가한다.

- **위치:** LV1 (최상위 탭) — 기존 "키워드 / 글감 / 프롬프트" 옆에 추가
- **목적:** 마이크로 니치 시장(웨딩, 재테크, 부업 등)에서 화제 키워드/페인포인트를 발굴해 블로그 글감으로 변환
- **차별화:** 일반 카테고리 17개 글감 발굴과 달리, 카테고리별 **전용 커뮤니티/카페** 데이터를 소스로 사용

---

## 2. UI 구조 (확정안)

### 2-1. LV1 변경
```
기존: 키워드 / 글감 / 프롬프트
변경: 키워드 / 글감 / 프롬프트 / 🔥 틈새 인사이트
```

### 2-2. LV2 (틈새 인사이트 진입 시) — "오늘의 핫 틈새 + 검색"

LV3 카테고리 카드를 만들지 않는다. **카테고리 무한 증식 방지가 핵심 설계 결정.**

```
┌────────────────────────────────────────────┐
│ 🔥 틈새 인사이트                            │
│ 지금 뜨고 있는 마이크로 니치 시장          │
├────────────────────────────────────────────┤
│                                            │
│ 📅 오늘의 핫 틈새 — 2026년 5월 27일       │
│ ────────────────────────────────────       │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ 🔥 #1 웨딩    +320%  화제글 47건  │    │
│ │ "스드메 거품 논란 폭발"            │    │
│ │ [📌 즐겨찾기] [상세보기 →]          │    │
│ └────────────────────────────────────┘    │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ 🔥 #2 재테크  +180%  화제글 32건  │    │
│ │ "30대 1억 모으기 vs 부동산 논쟁"   │    │
│ │ [📌 즐겨찾기] [상세보기 →]          │    │
│ └────────────────────────────────────┘    │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ 🔥 #3 다이어트 +90%  화제글 28건  │    │
│ │ "GLP-1 비만약 한국 출시 이슈"      │    │
│ └────────────────────────────────────┘    │
│                                            │
│ ────────────────────────────────────       │
│                                            │
│ 🔍 다른 틈새 찾기...                       │
│ [_______________________________] [검색]   │
│                                            │
│ 💡 자주 검색되는 틈새:                     │
│ #신혼여행 #부업 #미니멀라이프 #타로        │
│                                            │
│ ────────────────────────────────────       │
│                                            │
│ 💝 내 즐겨찾기                             │
│ ┌─────────┐ ┌─────────┐                   │
│ │💍 웨딩  │ │📈 재테크│                   │
│ └─────────┘ └─────────┘                   │
└────────────────────────────────────────────┘
```

### 2-3. LV3 (특정 틈새 클릭/검색 진입 시) — 5개 탭

```
┌────────────────────────────────────────────┐
│ ← 뒤로  💍 웨딩                            │
│                                            │
│ [🔥 화제글] [📊 키워드] [💡 페인포인트]    │
│ [💰 수익화] [✍️ AI 초안]                   │
│                                            │
│ ──────── (각 탭 내용은 아래 4-2 참조) ────│
└────────────────────────────────────────────┘
```

**MVP 범위:** 위 5개 탭 중 **#1 화제글, #3 페인포인트 2개만** 먼저 구현.  
나머지 3개 탭은 Phase 2 이후.

---

## 3. MVP 범위 (반드시 준수)

### 3-1. 카테고리
**웨딩 1개만**으로 시작. 다른 틈새 카테고리는 데이터 소스 패턴이 안정된 후 복제.

### 3-2. 탭
5개 중 **#1 화제글, #3 페인포인트 분석 2개만**.

### 3-3. 유료화
초기엔 전체 무료. 사용량 한도만 일 10회로 제한. (기존 다른 기능과 동일)

---

## 4. 기능 명세

### 4-1. LV2 화면 (오늘의 핫 틈새)

**API:** `GET /api/niche/today`

**응답:**
```json
{
  "date": "2026-05-27",
  "top_niches": [
    {
      "slug": "wedding",
      "name": "웨딩",
      "icon": "💍",
      "weekly_increase_pct": 320,
      "hot_post_count": 47,
      "headline": "스드메 거품 논란 폭발",
      "rank": 1
    }
  ],
  "popular_searches": ["신혼여행", "부업", "미니멀라이프", "타로"],
  "user_favorites": [
    { "slug": "wedding", "name": "웨딩", "icon": "💍" }
  ]
}
```

**큐레이션 로직:**
```
각 활성 틈새에 대해:
  점수 = (이번주 화제글 수) × 0.4
        + (전주 대비 증가율 %) × 0.4
        + (관련 키워드 검색량 증가율) × 0.2

→ 상위 3개 노출
```

배치로 매일 새벽 6시 계산하여 `niche_daily_curation` 테이블 저장. 화면은 그걸 조회만.

---

### 4-2. LV3 화면 (특정 틈새 상세)

#### 탭 1: 🔥 실시간 화제글 (MVP에 포함)

**API:** `GET /api/niche/{slug}/hot-posts?limit=20`

**응답:**
```json
{
  "niche": "wedding",
  "posts": [
    {
      "source": "direct_wedding",
      "source_label": "다이렉트결혼준비",
      "title": "스드메 800에 했는데 친구는 1500... 거품인가요?",
      "url": "https://...",
      "engagement": { "comments": 234, "views": null },
      "collected_at": "2026-05-27T03:00:00Z",
      "suggested_idea": "스드메 가격 거품의 진실"
    }
  ]
}
```

UI에서 각 화제글 옆에 [글감 생성] 버튼 → suggested_idea 클릭 시 기존 글감 생성 플로우로 이동.

---

#### 탭 3: 💡 페인포인트 분석 (MVP에 포함)

**핵심 차별화 기능.**

**API:** `GET /api/niche/{slug}/pain-points`

**응답:**
```json
{
  "niche": "wedding",
  "week_start": "2026-05-25",
  "pain_points": [
    {
      "rank": 1,
      "pain_point": "스드메 견적 비교 어려움",
      "mention_count": 312,
      "related_keywords": ["스드메 견적", "스드메 비교"],
      "suggested_idea": "스드메 견적표 양식 무료 배포",
      "sample_quotes": [
        "견적표가 너무 복잡해서...",
        "업체마다 포함 사항이 달라요"
      ]
    }
  ]
}
```

**처리 흐름:**
1. 매일 새벽 1시 배치로 화제글 50건씩 수집
2. 매주 월요일 새벽 2시 Claude (Haiku 4.5) 호출
3. 50건 제목 + 일부 본문을 Claude에 던져서 페인포인트 클러스터링
4. TOP 5 페인포인트 + 글감 추천 추출
5. `niche_pain_points` 테이블 저장

---

#### 탭 2, 4, 5 (MVP 이후)

| 탭 | 기능 | 우선순위 |
|----|------|---------|
| 📊 트렌드 키워드 | 이번주 검색량 급상승 키워드 + 경쟁강도 | Phase 2 |
| 💰 수익화 글감 | 광고/제휴 단가 기반 키워드 추천 | Phase 3 |
| ✍️ AI 초안 | 글감 → 블로그 초안 생성 (기존 프롬프트와 연동) | Phase 4 |

---

## 5. 데이터 소스 — 웨딩 카테고리

### 5-1. 1차 소스 (필수)

| 소스 | URL | 비고 |
|------|-----|------|
| 다이렉트결혼준비 카페 | cafe.naver.com/directwedding | 비회원 공개글만 |
| 맥마웨 카페 | cafe.naver.com/lovedongtanstory | 비회원 공개글만 |
| 네이버 검색 API (뉴스) | openapi.naver.com/v1/search/news.json | 키워드: "웨딩", "결혼준비", "스드메" |

### 5-2. 백업 폴백
네이버 카페 크롤링 차단 시 → 네이버 검색 API (블로그/뉴스)만으로 폴백.  
**반드시 graceful fallback 구현. 일부 소스 실패해도 서비스 죽지 않도록.**

### 5-3. 크롤링 주의사항
- User-Agent 로테이션 필수
- 같은 IP에서 5분당 1회 미만 호출
- 결과는 DB 캐싱, 매 요청 시 재크롤링 금지
- 차단 감지 시 자동 대기 + 폴백

---

## 6. DB 스키마 (추가)

```sql
-- 활성 틈새 카테고리 마스터
CREATE TABLE niche_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,       -- 'wedding', 'finance' 등
  name TEXT NOT NULL,              -- '웨딩', '재테크'
  icon TEXT,                       -- '💍'
  is_active BOOLEAN DEFAULT true,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인서트 초기 데이터 (MVP는 wedding 1개만)
INSERT INTO niche_categories (slug, name, icon, display_order)
VALUES ('wedding', '웨딩', '💍', 1);

-- 화제글 원본 (크롤링 결과)
CREATE TABLE niche_raw_posts (
  id SERIAL PRIMARY KEY,
  niche_slug TEXT NOT NULL,
  source TEXT NOT NULL,             -- 'direct_wedding', 'mac_mawe', 'naver_search'
  source_label TEXT,                -- '다이렉트결혼준비'
  title TEXT NOT NULL,
  content_snippet TEXT,             -- 본문 일부 (페인포인트 분석용)
  url TEXT,
  comment_count INT,
  view_count INT,
  collected_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, url)
);

CREATE INDEX idx_niche_raw_recent 
ON niche_raw_posts(niche_slug, collected_at DESC);

-- 매일 큐레이션 결과 (LV2 화면용)
CREATE TABLE niche_daily_curation (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  niche_slug TEXT NOT NULL,
  rank INT NOT NULL,
  weekly_increase_pct INT,
  hot_post_count INT,
  headline TEXT,                    -- AI 생성, 또는 최고 인기 화제글 제목
  score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, niche_slug)
);

-- 페인포인트 분석 결과 (탭 3용)
CREATE TABLE niche_pain_points (
  id SERIAL PRIMARY KEY,
  niche_slug TEXT NOT NULL,
  week_start DATE NOT NULL,
  rank INT NOT NULL,
  pain_point TEXT NOT NULL,
  mention_count INT,
  related_keywords TEXT[],
  suggested_idea TEXT,
  sample_quotes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(niche_slug, week_start, rank)
);

-- 사용자 즐겨찾기
CREATE TABLE niche_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  niche_slug TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, niche_slug)
);

-- 사용자 검색 로그 (인기 검색어 도출용)
CREATE TABLE niche_search_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  query TEXT,
  matched_slug TEXT,                -- 매칭된 niche가 있으면 저장
  searched_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Vercel Cron 작업 추가

```json
{
  "crons": [
    {
      "path": "/api/cron/niche/collect-posts",
      "schedule": "0 1 * * *",
      "description": "매일 01:00 - 웨딩 카페/뉴스 화제글 수집"
    },
    {
      "path": "/api/cron/niche/analyze-pain-points",
      "schedule": "0 2 * * 1",
      "description": "매주 월 02:00 - 페인포인트 클러스터링"
    },
    {
      "path": "/api/cron/niche/daily-curation",
      "schedule": "0 6 * * *",
      "description": "매일 06:00 - 오늘의 핫 틈새 큐레이션"
    }
  ]
}
```

---

## 8. Claude API 사용 (Haiku 4.5)

### 8-1. 페인포인트 분석 프롬프트

```
당신은 한국 블로그 시장 분석 전문가입니다.

[입력]
- 카테고리: {niche_name}
- 최근 일주일 화제글 50건의 제목과 일부 본문:
{posts_data}

[작업]
이 글들에서 사람들이 반복적으로 토로하는 고민/페인포인트 TOP 5를 추출하세요.

각 페인포인트마다:
1. pain_point: 한 줄로 요약된 고민
2. mention_count: 50건 중 몇 건에서 언급됐는지 추정
3. related_keywords: 관련 검색 키워드 2~3개
4. suggested_idea: 이 고민을 풀어주는 블로그 글 제목 1개
5. sample_quotes: 실제 글에서 발췌한 짧은 문구 1~2개

[출력 형식]
JSON만, 다른 설명 없이.
{ "pain_points": [...] }
```

### 8-2. 일일 헤드라인 생성 프롬프트

```
[입력]
- 카테고리: {niche_name}
- 오늘 화제글 TOP 5 제목:
{titles}

[작업]
이 화제글들의 공통 흐름을 한 줄(15자 이내)로 요약하세요. 
호기심 유발 + 클릭 욕구를 자극하는 톤.

예시: "스드메 거품 논란 폭발"

[출력]
JSON: { "headline": "..." }
```

---

## 9. 환경변수 (추가 없음)

기존 환경변수 그대로 사용:
- `NAVER_API_CUSTOMER_ID`, `NAVER_API_ACCESS_LICENSE`, `NAVER_API_SECRET_KEY`
- `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`
- Supabase 키들

**네이버 검색 API 키는 별도로 발급 후 추가 필요:**
```
NAVER_SEARCH_CLIENT_ID=
NAVER_SEARCH_CLIENT_SECRET=
```

---

## 10. 파일 구조

```
/app
  /dashboard
    /niche
      /page.tsx                    # LV2 화면 (오늘의 핫 틈새 + 검색)
      /[slug]/page.tsx             # LV3 화면 (특정 틈새 상세, 5개 탭)
  /api
    /niche
      /today/route.ts              # 오늘의 핫 틈새 조회
      /[slug]
        /hot-posts/route.ts        # 탭 1: 화제글
        /pain-points/route.ts      # 탭 3: 페인포인트
      /search/route.ts             # 틈새 검색
      /favorites/route.ts          # 즐겨찾기 CRUD
    /cron
      /niche
        /collect-posts/route.ts    # 화제글 수집 배치
        /analyze-pain-points/route.ts  # 페인포인트 분석 배치
        /daily-curation/route.ts   # 오늘의 핫 틈새 큐레이션
/lib
  /niche
    /sources
      /direct-wedding.ts           # 다이렉트결혼준비 카페 크롤러
      /mac-mawe.ts                 # 맥마웨 카페 크롤러
      /naver-search.ts             # 네이버 검색 API 래퍼
    /pain-point-analyzer.ts        # Claude로 페인포인트 추출
    /curator.ts                    # 큐레이션 점수 계산
```

---

## 11. 단계별 작업 순서 (반드시 준수)

```
Step 1: DB 스키마 마이그레이션
  - 6번에 정의된 테이블 5개 생성
  - 초기 데이터 (niche_categories: wedding 1개) 입력
  → 완료 후 본인 확인

Step 2: 네이버 검색 API 래퍼 구현
  - /lib/niche/sources/naver-search.ts
  - 키워드로 뉴스/블로그 검색 → 정규화된 post 객체 반환
  → 완료 후 본인 확인

Step 3: 다이렉트결혼준비 카페 크롤러 구현
  - /lib/niche/sources/direct-wedding.ts
  - 비회원 공개글만 수집
  - 차단 감지 + 폴백 처리
  → 완료 후 본인 확인 (실제 데이터 잘 들어오는지)

Step 4: 화제글 수집 배치 cron 구현
  - /api/cron/niche/collect-posts
  - 위 소스들 호출 → niche_raw_posts 저장
  → 1회 수동 실행 후 본인 확인

Step 5: LV3 화면 - 탭 1 (화제글) 구현
  - /api/niche/[slug]/hot-posts
  - /dashboard/niche/[slug] 페이지
  → 완료 후 본인 확인

Step 6: 페인포인트 분석 배치 구현
  - /api/cron/niche/analyze-pain-points
  - Claude Haiku 4.5 호출
  → 1회 수동 실행 후 본인 확인

Step 7: LV3 화면 - 탭 3 (페인포인트) 구현
  - /api/niche/[slug]/pain-points
  → 완료 후 본인 확인

Step 8: 일일 큐레이션 배치 구현
  - /api/cron/niche/daily-curation
  → 1회 수동 실행 후 본인 확인

Step 9: LV2 화면 (오늘의 핫 틈새) 구현
  - /api/niche/today
  - /dashboard/niche 페이지
  - 검색창 + 즐겨찾기 + 인기 검색어
  → 완료 후 본인 확인

Step 10: LV1 탭에 "틈새 인사이트" 추가
  - 기존 대시보드 네비게이션에 추가
  → 완료 후 본인 확인
```

---

## 12. ⚠️ 절대 하지 말 것

1. **MVP 범위 초과 금지** — 탭 5개 다 만들지 말 것. 화제글 + 페인포인트 2개만.
2. **카테고리 추가 금지** — wedding 외에 다른 카테고리 추가 금지. 패턴 확립 후 결정.
3. **Playwright 직접 실행 금지** — Vercel 환경에서 못 씀. 기존 크롤러 서버(localhost:3001) 활용 또는 단순 fetch.
4. **기존 기능 손대지 말 것** — 키워드 분석, 글감 발굴, 프롬프트 기능 그대로 유지.
5. **유료화 로직 추가 금지** — 초기엔 사용량 한도(일 10회)만.
6. **단계 건너뛰기 금지** — Step 1 → 10 순서대로. 각 단계 본인 확인 후 다음.

---

## 13. 본인 검수 체크리스트

각 단계 완료 시 다음 확인:

- [ ] 다이렉트결혼준비 카페에서 실제 데이터 들어오는가
- [ ] 차단 시 폴백 동작하는가
- [ ] 페인포인트 결과가 의미 있는가 (헛소리 아닌가)
- [ ] 오늘의 핫 틈새 헤드라인이 자연스러운가
- [ ] LV2 → LV3 → 글감 생성 플로우 막힘 없는가
- [ ] 모바일 화면에서도 깨지지 않는가
