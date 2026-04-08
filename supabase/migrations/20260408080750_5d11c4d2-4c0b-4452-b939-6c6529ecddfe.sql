
DROP TABLE IF EXISTS public.banned_ips CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP FUNCTION IF EXISTS public.check_and_ban_ip(text);
