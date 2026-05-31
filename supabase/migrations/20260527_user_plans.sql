CREATE TABLE user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'biz')),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 신규 가입 시 자동으로 free 플랜 생성
CREATE OR REPLACE FUNCTION handle_new_user_plan()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_plans (user_id, plan) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_plan();
