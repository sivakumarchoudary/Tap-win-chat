
ALTER VIEW public.lb_weekly_wins   SET (security_invoker = true);
ALTER VIEW public.lb_alltime_gems  SET (security_invoker = true);
ALTER VIEW public.lb_monthly_gifts SET (security_invoker = true);

REVOKE ALL ON FUNCTION public.redeem_referral(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.check_and_award_badges(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO service_role;
