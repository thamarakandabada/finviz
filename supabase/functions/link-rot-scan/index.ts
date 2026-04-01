import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";
const MAX_PAGES_PER_SCAN = 399;
const BATCH_SIZE_SCRAPE = 15; // pages per batch call
const BATCH_SIZE_CHECK = 10; // concurrent link checks

async function checkLink(url: string): Promise<{ status: number; ok: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    clearTimeout(timeout);
    return { status: res.status, ok: res.ok };
  } catch {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
      clearTimeout(timeout);
      return { status: res.status, ok: res.ok };
    } catch {
      return { status: 0, ok: false };
    }
  }
}

const TARGET_URL = "https://thamara.co.uk";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ─── AUTH: Verify JWT ───────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const userId = claimsData.claims.sub as string;

  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    return new Response(
      JSON.stringify({ error: "Firecrawl connector not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const mode = body.mode || "map"; // "map" | "check-batch"
    const scanId = body.scan_id;

    if (!scanId) {
      return new Response(
        JSON.stringify({ error: "scan_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── MODE: MAP ───────────────────────────────────────────────────
    if (mode === "map") {
      // Verify scan belongs to authenticated user
      const { data: scanOwner, error: ownerErr } = await supabaseAdmin
        .from("link_scans")
        .select("user_id")
        .eq("id", scanId)
        .single();
      if (ownerErr || !scanOwner || scanOwner.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetUrl = TARGET_URL;

      await supabaseAdmin
        .from("link_scans")
        .update({ status: "mapping" })
        .eq("id", scanId);

      console.log("Mapping site:", targetUrl);
      const mapRes = await fetch(`${FIRECRAWL_API}/map`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: targetUrl,
          limit: MAX_PAGES_PER_SCAN,
          includeSubdomains: true,
        }),
      });

      const mapData = await mapRes.json();
      if (!mapRes.ok) {
        if (mapRes.status === 402) {
          throw new Error("Firecrawl credit limit reached");
        }
        throw new Error(`Map failed: ${JSON.stringify(mapData)}`);
      }

      const allPages: string[] = mapData.links || [];
      const pages = allPages.slice(0, MAX_PAGES_PER_SCAN);
      console.log(`Found ${allPages.length} pages, capped to ${pages.length}`);

      // Store discovered pages and switch to "checking" status
      await supabaseAdmin
        .from("link_scans")
        .update({
          status: "checking",
          discovered_pages: pages,
          pages_crawled: pages.length,
          pages_processed: 0,
        })
        .eq("id", scanId);

      return new Response(
        JSON.stringify({
          success: true,
          phase: "map",
          total_pages: pages.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── MODE: CHECK-BATCH ───────────────────────────────────────────
    if (mode === "check-batch") {
      const { data: scan, error: scanErr } = await supabaseAdmin
        .from("link_scans")
        .select("*")
        .eq("id", scanId)
        .single();

      if (scanErr || !scan) {
        throw new Error("Scan not found");
      }

      // Verify scan belongs to authenticated user
      if (scan.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pages: string[] = (scan.discovered_pages as string[]) || [];
      const offset = scan.pages_processed || 0;
      const batch = pages.slice(offset, offset + BATCH_SIZE_SCRAPE);

      if (batch.length === 0) {
        // All done
        await supabaseAdmin
          .from("link_scans")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", scanId);

        return new Response(
          JSON.stringify({ success: true, phase: "complete", broken_count: scan.broken_count }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const targetDomain = new URL(scan.target_url).hostname;
      const outboundLinks: { sourcePage: string; url: string }[] = [];

      // Scrape each page in batch for outbound links
      for (const page of batch) {
        try {
          const scrapeRes = await fetch(`${FIRECRAWL_API}/scrape`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: page, formats: ["links"], onlyMainContent: false }),
          });

          if (scrapeRes.status === 402) {
            console.warn("Firecrawl credit limit hit — stopping batch");
            break;
          }

          const scrapeData = await scrapeRes.json();
          if (scrapeRes.ok && scrapeData.data?.links) {
            for (const link of scrapeData.data.links) {
              try {
                const u = new URL(link);
                if (u.hostname !== targetDomain && u.protocol.startsWith("http")) {
                  outboundLinks.push({ sourcePage: page, url: link });
                }
              } catch { /* skip invalid */ }
            }
          }
        } catch (err) {
          console.error(`Error scraping ${page}:`, err);
        }
      }

      // Deduplicate and check
      const uniqueUrls = [...new Set(outboundLinks.map((l) => l.url))];
      const linkResults = new Map<string, { status: number; ok: boolean }>();

      for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE_CHECK) {
        const chunk = uniqueUrls.slice(i, i + BATCH_SIZE_CHECK);
        const results = await Promise.all(chunk.map(checkLink));
        chunk.forEach((url, idx) => linkResults.set(url, results[idx]));
      }

      // Collect broken
      const brokenLinks: { scan_id: string; source_page: string; broken_url: string; status_code: number }[] = [];
      for (const { sourcePage, url } of outboundLinks) {
        const result = linkResults.get(url);
        if (result && !result.ok) {
          if (!brokenLinks.some((b) => b.source_page === sourcePage && b.broken_url === url)) {
            brokenLinks.push({ scan_id: scanId, source_page: sourcePage, broken_url: url, status_code: result.status });
          }
        }
      }

      if (brokenLinks.length > 0) {
        await supabaseAdmin.from("broken_links").insert(brokenLinks);
      }

      const newProcessed = offset + batch.length;
      const newBrokenCount = (scan.broken_count || 0) + brokenLinks.length;
      const isLast = newProcessed >= pages.length;

      await supabaseAdmin
        .from("link_scans")
        .update({
          pages_processed: newProcessed,
          links_checked: (scan.links_checked || 0) + uniqueUrls.length,
          broken_count: newBrokenCount,
          ...(isLast ? { status: "completed", completed_at: new Date().toISOString() } : {}),
        })
        .eq("id", scanId);

      return new Response(
        JSON.stringify({
          success: true,
          phase: isLast ? "complete" : "check-batch",
          pages_processed: newProcessed,
          total_pages: pages.length,
          batch_broken: brokenLinks.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown mode: ${mode}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Scan error:", err);

    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.scan_id) {
        await supabaseAdmin
          .from("link_scans")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", body.scan_id);
      }
    } catch { /* best-effort */ }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Scan failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
