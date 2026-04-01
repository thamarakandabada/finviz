
-- Remove the permissive INSERT policy on login_attempts (fixes DoS + always-true RLS)
DROP POLICY IF EXISTS "Anon can insert login attempts" ON public.login_attempts;

-- Remove public SELECT on banned_ips (no longer needed client-side)
DROP POLICY IF EXISTS "Anon can read banned IPs" ON public.banned_ips;

-- Revoke anon access to check_and_ban_ip RPC to prevent abuse
REVOKE EXECUTE ON FUNCTION public.check_and_ban_ip(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_ban_ip(text) FROM authenticated;
