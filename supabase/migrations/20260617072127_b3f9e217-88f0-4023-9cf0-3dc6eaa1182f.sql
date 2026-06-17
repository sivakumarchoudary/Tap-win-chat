
REVOKE ALL ON FUNCTION public.adjust_gems(uuid, integer, gem_tx_type, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_gems(uuid, integer, gem_tx_type, uuid, text) TO service_role;
