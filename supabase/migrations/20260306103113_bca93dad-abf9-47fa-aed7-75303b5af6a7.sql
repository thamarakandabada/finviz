
-- Allow inserting banned IPs (needed for the rate limiting logic)
CREATE POLICY "Anon can insert banned IPs"
ON public.banned_ips
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create a security definer function to handle the ban check + insert atomically
CREATE OR REPLACE FUNCTION public.check_and_ban_ip(p_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fail_count integer;
BEGIN
  -- Count recent failures
  SELECT count(*) INTO fail_count
  FROM login_attempts
  WHERE ip_address = p_ip
    AND success = false
    AND attempted_at > now() - interval '15 minutes';

  IF fail_count >= 3 THEN
    INSERT INTO banned_ips (ip_address)
    VALUES (p_ip)
    ON CONFLICT (ip_address) DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
