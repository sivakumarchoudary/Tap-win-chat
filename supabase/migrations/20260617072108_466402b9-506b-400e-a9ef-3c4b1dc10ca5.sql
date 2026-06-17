
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE OR REPLACE VIEW public.lb_weekly_wins AS
SELECT p.id, p.username, p.avatar_url, p.country, COUNT(*)::int AS score
FROM public.matches m
JOIN public.profiles p ON p.id IN (m.user_a, m.user_b)
WHERE m.status='completed' AND m.unlocked=true
  AND m.completed_at > now() - interval '7 days'
  AND ((p.id=m.user_a AND m.answer_a IS NOT NULL) OR (p.id=m.user_b AND m.answer_b IS NOT NULL))
  AND COALESCE(p.is_bot,false)=false
GROUP BY p.id, p.username, p.avatar_url, p.country
ORDER BY score DESC
LIMIT 50;

CREATE OR REPLACE VIEW public.lb_alltime_gems AS
SELECT id, username, avatar_url, country, total_gems_earned AS score
FROM public.profiles
WHERE COALESCE(is_bot,false)=false
ORDER BY total_gems_earned DESC
LIMIT 50;

CREATE OR REPLACE VIEW public.lb_monthly_gifts AS
SELECT p.id, p.username, p.avatar_url, p.country, COUNT(*)::int AS score
FROM public.gem_transactions gt
JOIN public.profiles p ON p.id = gt.user_id
WHERE gt.type='gift_sent' AND gt.created_at > now() - interval '30 days'
  AND COALESCE(p.is_bot,false)=false
GROUP BY p.id, p.username, p.avatar_url, p.country
ORDER BY score DESC
LIMIT 50;

GRANT SELECT ON public.lb_weekly_wins TO authenticated, anon;
GRANT SELECT ON public.lb_alltime_gems TO authenticated, anon;
GRANT SELECT ON public.lb_monthly_gifts TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.redeem_referral(_user_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_self_code text; v_already uuid;
BEGIN
  SELECT referral_code, referred_by INTO v_self_code, v_already FROM profiles WHERE id=_user_id;
  IF v_already IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'reason','already_redeemed'); END IF;
  IF upper(_code) = upper(v_self_code) THEN RETURN jsonb_build_object('ok',false,'reason','own_code'); END IF;
  SELECT id INTO v_owner FROM profiles WHERE upper(referral_code)=upper(_code) AND id<>_user_id;
  IF v_owner IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_found'); END IF;
  UPDATE profiles SET referred_by=v_owner WHERE id=_user_id;
  UPDATE profiles SET total_referrals = total_referrals + 1 WHERE id=v_owner;
  PERFORM adjust_gems(_user_id, 50, 'referral', NULL, 'Referral signup');
  PERFORM adjust_gems(v_owner,   50, 'referral', NULL, 'Referral reward');
  RETURN jsonb_build_object('ok',true,'owner',v_owner);
END $$;

CREATE OR REPLACE FUNCTION public.check_and_award_badges(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD;
BEGIN
  SELECT total_matches_won, total_gifts_sent, total_referrals, streak,
         array_length(countries_matched,1) AS countries
  INTO p FROM profiles WHERE id=_user_id;
  IF p.total_matches_won >= 1   THEN INSERT INTO user_badges(user_id,badge_id) VALUES(_user_id,'rookie') ON CONFLICT DO NOTHING; END IF;
  IF p.total_matches_won >= 10  THEN INSERT INTO user_badges(user_id,badge_id) VALUES(_user_id,'social_butterfly') ON CONFLICT DO NOTHING; END IF;
  IF p.total_matches_won >= 100 THEN INSERT INTO user_badges(user_id,badge_id) VALUES(_user_id,'legend') ON CONFLICT DO NOTHING; END IF;
  IF p.total_gifts_sent  >= 10  THEN INSERT INTO user_badges(user_id,badge_id) VALUES(_user_id,'gifter') ON CONFLICT DO NOTHING; END IF;
  IF p.streak            >= 30  THEN INSERT INTO user_badges(user_id,badge_id) VALUES(_user_id,'streak_master') ON CONFLICT DO NOTHING; END IF;
  IF p.total_referrals   >= 10  THEN INSERT INTO user_badges(user_id,badge_id) VALUES(_user_id,'influencer') ON CONFLICT DO NOTHING; END IF;
  IF COALESCE(p.countries,0) >= 5 THEN INSERT INTO user_badges(user_id,badge_id) VALUES(_user_id,'globetrotter') ON CONFLICT DO NOTHING; END IF;
END $$;
