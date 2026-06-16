
-- =========== ENUMS ===========
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.match_status AS ENUM ('waiting', 'active', 'completed', 'expired');
CREATE TYPE public.gem_tx_type AS ENUM ('purchase','match_win','daily','referral','gift_sent','gift_received','spend_boost','spend_mystery','spend_streak_saver','spend_badge','mystery_payout','admin');
CREATE TYPE public.message_type AS ENUM ('text','gift');

-- =========== USER ROLES ===========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

-- =========== PROFILES ===========
CREATE SEQUENCE public.player_number_seq START 1000;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  gems INT NOT NULL DEFAULT 10,
  streak INT NOT NULL DEFAULT 0,
  last_login_date DATE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  boost_until TIMESTAMPTZ,
  total_matches_won INT NOT NULL DEFAULT 0,
  total_gifts_sent INT NOT NULL DEFAULT 0,
  total_gems_earned INT NOT NULL DEFAULT 0,
  total_referrals INT NOT NULL DEFAULT 0,
  countries_matched TEXT[] NOT NULL DEFAULT '{}',
  age_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id) WITH CHECK (auth.uid()=id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_num BIGINT;
  v_ref TEXT;
BEGIN
  v_num := nextval('public.player_number_seq');
  v_ref := upper(substr(md5(NEW.id::text || random()::text), 1, 7));
  INSERT INTO public.profiles (id, username, referral_code, gems)
  VALUES (NEW.id, 'Player ' || v_num, v_ref, 10);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========== QUESTIONS ===========
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questions TO authenticated, anon;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions readable" ON public.questions FOR SELECT USING (active = true);

CREATE TABLE public.question_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.question_suggestions TO authenticated;
GRANT ALL ON public.question_suggestions TO service_role;
ALTER TABLE public.question_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own suggestions" ON public.question_suggestions FOR SELECT TO authenticated USING (auth.uid()=suggested_by OR has_role(auth.uid(),'admin'));
CREATE POLICY "create suggestions" ON public.question_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid()=suggested_by);

-- =========== MATCH QUEUE ===========
CREATE TABLE public.match_queue (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.match_queue TO authenticated;
GRANT ALL ON public.match_queue TO service_role;
ALTER TABLE public.match_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own queue" ON public.match_queue FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "queue self" ON public.match_queue FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "leave queue" ON public.match_queue FOR DELETE TO authenticated USING (auth.uid()=user_id);

-- =========== MATCHES ===========
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id),
  answer_a TEXT,
  answer_b TEXT,
  answered_at_a TIMESTAMPTZ,
  answered_at_b TIMESTAMPTZ,
  status match_status NOT NULL DEFAULT 'active',
  gems_awarded INT NOT NULL DEFAULT 0,
  unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX matches_user_a_idx ON public.matches(user_a);
CREATE INDEX matches_user_b_idx ON public.matches(user_b);
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own matches" ON public.matches FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));

ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_queue;

-- =========== MESSAGES ===========
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON public.messages(match_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see messages in own matches" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id=match_id AND auth.uid() IN (m.user_a, m.user_b) AND m.unlocked = true));
CREATE POLICY "send messages in own unlocked matches" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id=match_id AND auth.uid() IN (m.user_a, m.user_b) AND m.unlocked = true));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =========== GEM TRANSACTIONS ===========
CREATE TABLE public.gem_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type gem_tx_type NOT NULL,
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX gem_tx_user_idx ON public.gem_transactions(user_id, created_at DESC);
GRANT SELECT ON public.gem_transactions TO authenticated;
GRANT ALL ON public.gem_transactions TO service_role;
ALTER TABLE public.gem_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own gem tx" ON public.gem_transactions FOR SELECT TO authenticated USING (auth.uid()=user_id);

-- =========== BADGES ===========
CREATE TABLE public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price INT
);
GRANT SELECT ON public.badges TO authenticated, anon;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges public" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user badges readable" ON public.user_badges FOR SELECT TO authenticated USING (true);

-- =========== BLOCKS & REPORTS ===========
CREATE TABLE public.blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid()=blocker_id);
CREATE POLICY "create own block" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid()=blocker_id);
CREATE POLICY "delete own block" ON public.blocks FOR DELETE TO authenticated USING (auth.uid()=blocker_id);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "create own report" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid()=reporter_id);
CREATE POLICY "admins see reports" ON public.reports FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- =========== HELPERS ===========
-- Atomic gem credit/debit. Returns new balance, or NULL if insufficient.
CREATE OR REPLACE FUNCTION public.adjust_gems(_user_id UUID, _delta INT, _type gem_tx_type, _ref UUID DEFAULT NULL, _note TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new INT;
BEGIN
  UPDATE public.profiles SET gems = gems + _delta
  WHERE id = _user_id AND (gems + _delta) >= 0
  RETURNING gems INTO v_new;
  IF v_new IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.gem_transactions(user_id, amount, type, reference_id, note)
  VALUES (_user_id, _delta, _type, _ref, _note);
  IF _delta > 0 THEN
    UPDATE public.profiles SET total_gems_earned = total_gems_earned + _delta WHERE id = _user_id;
  END IF;
  RETURN v_new;
END $$;
