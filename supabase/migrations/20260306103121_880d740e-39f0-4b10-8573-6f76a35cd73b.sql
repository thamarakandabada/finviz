
-- Remove the direct insert policy on banned_ips since we use the security definer function
DROP POLICY "Anon can insert banned IPs" ON public.banned_ips;
