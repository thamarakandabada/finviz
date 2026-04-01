
ALTER TABLE public.link_scans 
  ADD COLUMN IF NOT EXISTS discovered_pages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pages_processed integer NOT NULL DEFAULT 0;

-- Fix the stuck scan
UPDATE public.link_scans SET status = 'failed', completed_at = now() WHERE status = 'running' AND completed_at IS NULL;
