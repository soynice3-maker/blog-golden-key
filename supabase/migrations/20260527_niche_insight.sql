-- ============================================================
-- 틈새 인사이트 (Niche Insight) 테이블 마이그레이션
-- ============================================================

-- 1. 활성 틈새 카테고리 마스터
CREATE TABLE niche_categories (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  icon          TEXT,
  is_active     BOOLEAN DEFAULT true,
  display_order INT,
  created_at    TIMESTAMP DEFAULT NOW()
);

INSERT INTO niche_categories (slug, name, icon, display_order)
VALUES ('wedding', '웨딩', 'Gem', 1);

-- 2. 화제글 원본 (크롤링 결과)
CREATE TABLE niche_raw_posts (
  id              SERIAL PRIMARY KEY,
  niche_slug      TEXT NOT NULL,
  source          TEXT NOT NULL,
  source_label    TEXT,
  title           TEXT NOT NULL,
  content_snippet TEXT,
  url             TEXT,
  comment_count   INT,
  view_count      INT,
  collected_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, url)
);

CREATE INDEX idx_niche_raw_recent
  ON niche_raw_posts(niche_slug, collected_at DESC);

-- 3. 매일 큐레이션 결과 (LV2 오늘의 핫 틈새)
CREATE TABLE niche_daily_curation (
  id                  SERIAL PRIMARY KEY,
  date                DATE NOT NULL,
  niche_slug          TEXT NOT NULL,
  rank                INT NOT NULL,
  weekly_increase_pct INT,
  hot_post_count      INT,
  headline            TEXT,
  score               FLOAT,
  created_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, niche_slug)
);

-- 4. 페인포인트 분석 결과 (탭 3용)
CREATE TABLE niche_pain_points (
  id               SERIAL PRIMARY KEY,
  niche_slug       TEXT NOT NULL,
  week_start       DATE NOT NULL,
  rank             INT NOT NULL,
  pain_point       TEXT NOT NULL,
  mention_count    INT,
  related_keywords TEXT[],
  suggested_idea   TEXT,
  sample_quotes    TEXT[],
  created_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(niche_slug, week_start, rank)
);

-- 5. 사용자 즐겨찾기
CREATE TABLE niche_favorites (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  niche_slug TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, niche_slug)
);

-- 6. 사용자 검색 로그 (인기 검색어 도출용)
CREATE TABLE niche_search_logs (
  id           SERIAL PRIMARY KEY,
  user_id      UUID,
  query        TEXT,
  matched_slug TEXT,
  searched_at  TIMESTAMP DEFAULT NOW()
);
