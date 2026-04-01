
-- Scan metadata table
CREATE TABLE public.link_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pages_crawled integer NOT NULL DEFAULT 0,
  links_checked integer NOT NULL DEFAULT 0,
  broken_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.link_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scans"
  ON public.link_scans FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Broken links found per scan
CREATE TABLE public.broken_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.link_scans(id) ON DELETE CASCADE,
  source_page text NOT NULL,
  broken_url text NOT NULL,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broken_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own broken links"
  ON public.broken_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.link_scans
      WHERE link_scans.id = broken_links.scan_id
      AND link_scans.user_id = auth.uid()
    )
  );
