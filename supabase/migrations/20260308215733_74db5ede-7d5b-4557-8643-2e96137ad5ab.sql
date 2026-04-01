ALTER TABLE public.broken_links ADD COLUMN resolved boolean NOT NULL DEFAULT false;

CREATE POLICY "Users update own broken links"
ON public.broken_links
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM link_scans
  WHERE link_scans.id = broken_links.scan_id
    AND link_scans.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM link_scans
  WHERE link_scans.id = broken_links.scan_id
    AND link_scans.user_id = auth.uid()
));