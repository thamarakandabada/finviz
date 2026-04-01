import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller IP from headers (Supabase Edge Functions provide this)
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if IP is banned (server-side)
    const { data: banned } = await supabaseAdmin
      .from("banned_ips")
      .select("id")
      .eq("ip_address", ip)
      .maybeSingle();

    if (banned) {
      return new Response(
        JSON.stringify({ error: "banned" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attempt sign-in using the anon client (so it returns a proper session)
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed attempt server-side
      await supabaseAdmin.from("login_attempts").insert({
        ip_address: ip,
        success: false,
      });

      // Check if IP should be banned
      const { data: isBanned } = await supabaseAdmin.rpc("check_and_ban_ip", {
        p_ip: ip,
      });

      return new Response(
        JSON.stringify({ error: isBanned ? "banned" : "invalid_credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record successful attempt server-side
    await supabaseAdmin.from("login_attempts").insert({
      ip_address: ip,
      success: true,
    });

    return new Response(
      JSON.stringify({ session: data.session }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
