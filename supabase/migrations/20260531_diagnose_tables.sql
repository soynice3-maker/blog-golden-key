-- ─────────────────────────────────────────────────────────
-- 상위노출 진단 — 글 진단 + 순위 추적 테이블
-- ─────────────────────────────────────────────────────────

-- 1) tracked_keywords: 사용자가 등록한 추적 키워드
CREATE TABLE IF NOT EXISTS tracked_keywords (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword      text NOT NULL,
  target_url   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_checked timestamptz,
  is_active    boolean NOT NULL DEFAULT true,

  CONSTRAINT tracked_keywords_unique UNIQUE (user_id, keyword, target_url)
);

CREATE INDEX IF NOT EXISTS tracked_keywords_user_idx ON tracked_keywords (user_id, is_active);

-- 2) rank_history: 매일 기록되는 순위
CREATE TABLE IF NOT EXISTS rank_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_id     uuid NOT NULL REFERENCES tracked_keywords(id) ON DELETE CASCADE,
  rank           integer,                              -- NULL이면 30위 밖
  matched_title  text,
  top10_snapshot jsonb,                                -- [{rank, title, url}, ...]
  checked_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rank_history_tracked_idx
  ON rank_history (tracked_id, checked_at DESC);

-- 3) diagnosis_snapshots: 글 진단 결과 캐싱 (24시간)
CREATE TABLE IF NOT EXISTS diagnosis_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_url     text NOT NULL,
  keyword      text,                                   -- 진단에 사용한 키워드
  my_post      jsonb,                                  -- 내 글 분석 결과
  competitors  jsonb,                                  -- 상위 N개 글 분석 결과
  insights     jsonb,                                  -- 룰 기반 인사이트 (문자열 배열)
  rank         integer,                                -- 내 글이 몇 위인지
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diagnosis_snapshots_user_idx
  ON diagnosis_snapshots (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS diagnosis_snapshots_lookup_idx
  ON diagnosis_snapshots (user_id, post_url, keyword);

-- ─────────────────────────────────────────────────────────
-- 인증 유저 권한
-- ─────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON tracked_keywords    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rank_history        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON diagnosis_snapshots TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ─────────────────────────────────────────────────────────
-- RLS (Row Level Security)
-- ─────────────────────────────────────────────────────────
ALTER TABLE tracked_keywords    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_snapshots ENABLE ROW LEVEL SECURITY;

-- tracked_keywords: 본인 키워드만 접근
DROP POLICY IF EXISTS "own tracked keywords" ON tracked_keywords;
CREATE POLICY "own tracked keywords" ON tracked_keywords
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- rank_history: 본인 키워드의 history만
DROP POLICY IF EXISTS "own rank history" ON rank_history;
CREATE POLICY "own rank history" ON rank_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tracked_keywords k WHERE k.id = rank_history.tracked_id AND k.user_id = auth.uid())
  );

-- diagnosis_snapshots: 본인 진단 결과만
DROP POLICY IF EXISTS "own diagnosis snapshots" ON diagnosis_snapshots;
CREATE POLICY "own diagnosis snapshots" ON diagnosis_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
