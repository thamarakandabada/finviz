import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const DEMO_USER_ID = "47610875-c032-4663-8f7c-a2d05c4525cd";

interface SeedRow {
  date: string;
  account: string;
  amount: number;
  currency: string;
  category: string | null;
  counter_account: string | null;
  note: string | null;
  payee: string | null;
  cleared: boolean;
  upload_month: string;
}

const SEED_DATA: SeedRow[] = [
{date:"2025-07-01T00:00:00+00:00",account:"Credit Card",amount:-800.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-07"},
{date:"2025-07-01T00:00:00+00:00",account:"Current Account",amount:-56.78,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-07"},
{date:"2025-07-01T00:00:00+00:00",account:"Current Account",amount:2500.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-07"},
{date:"2025-07-01T00:00:00+00:00",account:"Pension",amount:15000.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-07"},
{date:"2025-07-01T00:00:00+00:00",account:"Savings Account",amount:5000.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-07"},
{date:"2025-07-04T00:00:00+00:00",account:"Current Account",amount:-60.11,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-07"},
{date:"2025-07-07T00:00:00+00:00",account:"Current Account",amount:-15.92,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-07"},
{date:"2025-07-10T00:00:00+00:00",account:"Current Account",amount:-124.32,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-07"},
{date:"2025-07-11T00:00:00+00:00",account:"Current Account",amount:521.51,currency:"GBP",category:"Freelance",counter_account:null,note:"Web project",payee:"Client Co",cleared:true,upload_month:"2025-07"},
{date:"2025-07-13T00:00:00+00:00",account:"Current Account",amount:-12.49,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-07"},
{date:"2025-07-16T00:00:00+00:00",account:"Current Account",amount:-12.24,currency:"GBP",category:"Groceries",counter_account:null,note:null,payee:"Tesco",cleared:true,upload_month:"2025-07"},
{date:"2025-07-16T00:00:00+00:00",account:"Pension",amount:304.4,currency:"GBP",category:"Pension Growth",counter_account:null,note:null,payee:null,cleared:true,upload_month:"2025-07"},
{date:"2025-07-19T00:00:00+00:00",account:"Current Account",amount:-74.25,currency:"GBP",category:"Transport",counter_account:null,note:null,payee:"TfL",cleared:true,upload_month:"2025-07"},
{date:"2025-07-22T00:00:00+00:00",account:"Current Account",amount:-144.4,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-07"},
{date:"2025-07-25T00:00:00+00:00",account:"Current Account",amount:-19.92,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-07"},
{date:"2025-07-26T00:00:00+00:00",account:"Current Account",amount:3200.0,currency:"GBP",category:"Salary",counter_account:null,note:"Monthly salary",payee:"Employer Ltd",cleared:true,upload_month:"2025-07"},
{date:"2025-07-28T00:00:00+00:00",account:"Current Account",amount:-500.0,currency:"GBP",category:"Transfer",counter_account:"Savings Account",note:null,payee:null,cleared:true,upload_month:"2025-07"},
{date:"2025-07-28T00:00:00+00:00",account:"Current Account",amount:-148.66,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-07"},
{date:"2025-07-28T00:00:00+00:00",account:"Savings Account",amount:500.0,currency:"GBP",category:"Transfer",counter_account:"Current Account",note:null,payee:null,cleared:true,upload_month:"2025-07"},
{date:"2025-08-01T00:00:00+00:00",account:"Credit Card",amount:-850.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-08"},
{date:"2025-08-01T00:00:00+00:00",account:"Current Account",amount:-105.86,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-08"},
{date:"2025-08-01T00:00:00+00:00",account:"Current Account",amount:2700.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-08"},
{date:"2025-08-01T00:00:00+00:00",account:"Pension",amount:15500.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-08"},
{date:"2025-08-01T00:00:00+00:00",account:"Savings Account",amount:5300.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-08"},
{date:"2025-08-04T00:00:00+00:00",account:"Current Account",amount:-106.06,currency:"GBP",category:"Transport",counter_account:null,note:null,payee:"TfL",cleared:true,upload_month:"2025-08"},
{date:"2025-08-07T00:00:00+00:00",account:"Current Account",amount:-95.79,currency:"GBP",category:"Transport",counter_account:null,note:null,payee:"TfL",cleared:true,upload_month:"2025-08"},
{date:"2025-08-10T00:00:00+00:00",account:"Current Account",amount:-117.52,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-08"},
{date:"2025-08-13T00:00:00+00:00",account:"Current Account",amount:-128.81,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-08"},
{date:"2025-08-16T00:00:00+00:00",account:"Pension",amount:388.93,currency:"GBP",category:"Pension Growth",counter_account:null,note:null,payee:null,cleared:true,upload_month:"2025-08"},
{date:"2025-08-19T00:00:00+00:00",account:"Current Account",amount:-92.63,currency:"GBP",category:"Groceries",counter_account:null,note:null,payee:"Tesco",cleared:true,upload_month:"2025-08"},
{date:"2025-08-22T00:00:00+00:00",account:"Current Account",amount:-22.33,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-08"},
{date:"2025-08-26T00:00:00+00:00",account:"Current Account",amount:3200.0,currency:"GBP",category:"Salary",counter_account:null,note:"Monthly salary",payee:"Employer Ltd",cleared:true,upload_month:"2025-08"},
{date:"2025-08-28T00:00:00+00:00",account:"Current Account",amount:-44.03,currency:"GBP",category:"Utilities",counter_account:null,note:null,payee:"British Gas",cleared:true,upload_month:"2025-08"},
{date:"2025-08-28T00:00:00+00:00",account:"Current Account",amount:-500.0,currency:"GBP",category:"Transfer",counter_account:"Savings Account",note:null,payee:null,cleared:true,upload_month:"2025-08"},
{date:"2025-08-28T00:00:00+00:00",account:"Savings Account",amount:500.0,currency:"GBP",category:"Transfer",counter_account:"Current Account",note:null,payee:null,cleared:true,upload_month:"2025-08"},
{date:"2025-09-01T00:00:00+00:00",account:"Credit Card",amount:-900.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-09"},
{date:"2025-09-01T00:00:00+00:00",account:"Current Account",amount:-60.97,currency:"GBP",category:"Utilities",counter_account:null,note:null,payee:"British Gas",cleared:true,upload_month:"2025-09"},
{date:"2025-09-01T00:00:00+00:00",account:"Current Account",amount:2900.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-09"},
{date:"2025-09-01T00:00:00+00:00",account:"Pension",amount:16000.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-09"},
{date:"2025-09-01T00:00:00+00:00",account:"Savings Account",amount:5600.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-09"},
{date:"2025-09-04T00:00:00+00:00",account:"Current Account",amount:-68.48,currency:"GBP",category:"Dining Out",counter_account:null,note:null,payee:"Nando's",cleared:true,upload_month:"2025-09"},
{date:"2025-09-07T00:00:00+00:00",account:"Current Account",amount:-145.0,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-09"},
{date:"2025-09-10T00:00:00+00:00",account:"Current Account",amount:-103.35,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-09"},
{date:"2025-09-11T00:00:00+00:00",account:"Current Account",amount:781.38,currency:"GBP",category:"Freelance",counter_account:null,note:"Web project",payee:"Client Co",cleared:true,upload_month:"2025-09"},
{date:"2025-09-13T00:00:00+00:00",account:"Current Account",amount:-116.76,currency:"GBP",category:"Utilities",counter_account:null,note:null,payee:"British Gas",cleared:true,upload_month:"2025-09"},
{date:"2025-09-16T00:00:00+00:00",account:"Current Account",amount:-91.07,currency:"GBP",category:"Groceries",counter_account:null,note:null,payee:"Tesco",cleared:true,upload_month:"2025-09"},
{date:"2025-09-16T00:00:00+00:00",account:"Pension",amount:445.99,currency:"GBP",category:"Pension Growth",counter_account:null,note:null,payee:null,cleared:true,upload_month:"2025-09"},
{date:"2025-09-19T00:00:00+00:00",account:"Current Account",amount:-142.67,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-09"},
{date:"2025-09-22T00:00:00+00:00",account:"Current Account",amount:-131.39,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-09"},
{date:"2025-09-25T00:00:00+00:00",account:"Current Account",amount:-46.82,currency:"GBP",category:"Groceries",counter_account:null,note:null,payee:"Tesco",cleared:true,upload_month:"2025-09"},
{date:"2025-09-26T00:00:00+00:00",account:"Current Account",amount:3200.0,currency:"GBP",category:"Salary",counter_account:null,note:"Monthly salary",payee:"Employer Ltd",cleared:true,upload_month:"2025-09"},
{date:"2025-09-28T00:00:00+00:00",account:"Current Account",amount:-500.0,currency:"GBP",category:"Transfer",counter_account:"Savings Account",note:null,payee:null,cleared:true,upload_month:"2025-09"},
{date:"2025-09-28T00:00:00+00:00",account:"Savings Account",amount:500.0,currency:"GBP",category:"Transfer",counter_account:"Current Account",note:null,payee:null,cleared:true,upload_month:"2025-09"},
{date:"2025-10-01T00:00:00+00:00",account:"Credit Card",amount:-950.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-10"},
{date:"2025-10-01T00:00:00+00:00",account:"Current Account",amount:-80.33,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-10"},
{date:"2025-10-01T00:00:00+00:00",account:"Current Account",amount:3100.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-10"},
{date:"2025-10-01T00:00:00+00:00",account:"Pension",amount:16500.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-10"},
{date:"2025-10-01T00:00:00+00:00",account:"Savings Account",amount:5900.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-10"},
{date:"2025-10-04T00:00:00+00:00",account:"Current Account",amount:-14.02,currency:"GBP",category:"Dining Out",counter_account:null,note:null,payee:"Nando's",cleared:true,upload_month:"2025-10"},
{date:"2025-10-07T00:00:00+00:00",account:"Current Account",amount:-53.38,currency:"GBP",category:"Transport",counter_account:null,note:null,payee:"TfL",cleared:true,upload_month:"2025-10"},
{date:"2025-10-10T00:00:00+00:00",account:"Current Account",amount:-128.61,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-10"},
{date:"2025-10-13T00:00:00+00:00",account:"Current Account",amount:-123.09,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-10"},
{date:"2025-10-16T00:00:00+00:00",account:"Current Account",amount:-129.77,currency:"GBP",category:"Dining Out",counter_account:null,note:null,payee:"Nando's",cleared:true,upload_month:"2025-10"},
{date:"2025-10-16T00:00:00+00:00",account:"Pension",amount:344.41,currency:"GBP",category:"Pension Growth",counter_account:null,note:null,payee:null,cleared:true,upload_month:"2025-10"},
{date:"2025-10-19T00:00:00+00:00",account:"Current Account",amount:-28.07,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-10"},
{date:"2025-10-25T00:00:00+00:00",account:"Current Account",amount:-42.4,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-10"},
{date:"2025-10-26T00:00:00+00:00",account:"Current Account",amount:3200.0,currency:"GBP",category:"Salary",counter_account:null,note:"Monthly salary",payee:"Employer Ltd",cleared:true,upload_month:"2025-10"},
{date:"2025-10-28T00:00:00+00:00",account:"Current Account",amount:-500.0,currency:"GBP",category:"Transfer",counter_account:"Savings Account",note:null,payee:null,cleared:true,upload_month:"2025-10"},
{date:"2025-10-28T00:00:00+00:00",account:"Current Account",amount:-129.33,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-10"},
{date:"2025-10-28T00:00:00+00:00",account:"Savings Account",amount:500.0,currency:"GBP",category:"Transfer",counter_account:"Current Account",note:null,payee:null,cleared:true,upload_month:"2025-10"},
{date:"2025-11-01T00:00:00+00:00",account:"Credit Card",amount:-1000.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-11"},
{date:"2025-11-01T00:00:00+00:00",account:"Current Account",amount:-43.54,currency:"GBP",category:"Entertainment",counter_account:null,note:null,payee:"Netflix",cleared:true,upload_month:"2025-11"},
{date:"2025-11-01T00:00:00+00:00",account:"Current Account",amount:3300.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-11"},
{date:"2025-11-01T00:00:00+00:00",account:"Pension",amount:17000.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-11"},
{date:"2025-11-01T00:00:00+00:00",account:"Savings Account",amount:6200.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-11"},
{date:"2025-11-04T00:00:00+00:00",account:"Current Account",amount:-113.83,currency:"GBP",category:"Utilities",counter_account:null,note:null,payee:"British Gas",cleared:true,upload_month:"2025-11"},
{date:"2025-11-07T00:00:00+00:00",account:"Current Account",amount:-82.42,currency:"GBP",category:"Dining Out",counter_account:null,note:null,payee:"Nando's",cleared:true,upload_month:"2025-11"},
{date:"2025-11-10T00:00:00+00:00",account:"Current Account",amount:-120.25,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-11"},
{date:"2025-11-11T00:00:00+00:00",account:"Current Account",amount:428.88,currency:"GBP",category:"Freelance",counter_account:null,note:"Web project",payee:"Client Co",cleared:true,upload_month:"2025-11"},
{date:"2025-11-13T00:00:00+00:00",account:"Current Account",amount:-11.1,currency:"GBP",category:"Transport",counter_account:null,note:null,payee:"TfL",cleared:true,upload_month:"2025-11"},
{date:"2025-11-16T00:00:00+00:00",account:"Current Account",amount:-46.51,currency:"GBP",category:"Groceries",counter_account:null,note:null,payee:"Tesco",cleared:true,upload_month:"2025-11"},
{date:"2025-11-16T00:00:00+00:00",account:"Pension",amount:260.59,currency:"GBP",category:"Pension Growth",counter_account:null,note:null,payee:null,cleared:true,upload_month:"2025-11"},
{date:"2025-11-19T00:00:00+00:00",account:"Current Account",amount:-96.4,currency:"GBP",category:"Utilities",counter_account:null,note:null,payee:"British Gas",cleared:true,upload_month:"2025-11"},
{date:"2025-11-22T00:00:00+00:00",account:"Current Account",amount:-29.14,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-11"},
{date:"2025-11-25T00:00:00+00:00",account:"Current Account",amount:-22.27,currency:"GBP",category:"Transport",counter_account:null,note:null,payee:"TfL",cleared:true,upload_month:"2025-11"},
{date:"2025-11-26T00:00:00+00:00",account:"Current Account",amount:3200.0,currency:"GBP",category:"Salary",counter_account:null,note:"Monthly salary",payee:"Employer Ltd",cleared:true,upload_month:"2025-11"},
{date:"2025-11-28T00:00:00+00:00",account:"Current Account",amount:-500.0,currency:"GBP",category:"Transfer",counter_account:"Savings Account",note:null,payee:null,cleared:true,upload_month:"2025-11"},
{date:"2025-11-28T00:00:00+00:00",account:"Current Account",amount:-83.1,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-11"},
{date:"2025-11-28T00:00:00+00:00",account:"Savings Account",amount:500.0,currency:"GBP",category:"Transfer",counter_account:"Current Account",note:null,payee:null,cleared:true,upload_month:"2025-11"},
{date:"2025-12-01T00:00:00+00:00",account:"Credit Card",amount:-1050.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-12"},
{date:"2025-12-01T00:00:00+00:00",account:"Current Account",amount:-950.0,currency:"GBP",category:"Rent",counter_account:null,note:null,payee:"Landlord",cleared:true,upload_month:"2025-12"},
{date:"2025-12-01T00:00:00+00:00",account:"Current Account",amount:3500.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-12"},
{date:"2025-12-01T00:00:00+00:00",account:"Pension",amount:17500.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-12"},
{date:"2025-12-01T00:00:00+00:00",account:"Savings Account",amount:6500.0,currency:"GBP",category:null,counter_account:"Opening Balance",note:null,payee:null,cleared:true,upload_month:"2025-12"},
{date:"2025-12-04T00:00:00+00:00",account:"Current Account",amount:-126.36,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-12"},
{date:"2025-12-10T00:00:00+00:00",account:"Current Account",amount:-141.49,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-12"},
{date:"2025-12-16T00:00:00+00:00",account:"Current Account",amount:-112.52,currency:"GBP",category:"Utilities",counter_account:null,note:null,payee:"British Gas",cleared:true,upload_month:"2025-12"},
{date:"2025-12-16T00:00:00+00:00",account:"Pension",amount:420.01,currency:"GBP",category:"Pension Growth",counter_account:null,note:null,payee:null,cleared:true,upload_month:"2025-12"},
{date:"2025-12-19T00:00:00+00:00",account:"Current Account",amount:-99.42,currency:"GBP",category:"Subscriptions",counter_account:null,note:null,payee:"Spotify",cleared:true,upload_month:"2025-12"},
{date:"2025-12-22T00:00:00+00:00",account:"Current Account",amount:-64.36,currency:"GBP",category:"Clothing",counter_account:null,note:null,payee:"H&M",cleared:true,upload_month:"2025-12"},
{date:"2025-12-25T00:00:00+00:00",account:"Current Account",amount:-63.03,currency:"GBP",category:"Utilities",counter_account:null,note:null,payee:"British Gas",cleared:true,upload_month:"2025-12"},
{date:"2025-12-26T00:00:00+00:00",account:"Current Account",amount:3200.0,currency:"GBP",category:"Salary",counter_account:null,note:"Monthly salary",payee:"Employer Ltd",cleared:true,upload_month:"2025-12"},
{date:"2025-12-28T00:00:00+00:00",account:"Current Account",amount:-500.0,currency:"GBP",category:"Transfer",counter_account:"Savings Account",note:null,payee:null,cleared:true,upload_month:"2025-12"},
{date:"2025-12-28T00:00:00+00:00",account:"Current Account",amount:-27.88,currency:"GBP",category:"Dining Out",counter_account:null,note:null,payee:"Nando's",cleared:true,upload_month:"2025-12"},
{date:"2025-12-28T00:00:00+00:00",account:"Savings Account",amount:500.0,currency:"GBP",category:"Transfer",counter_account:"Current Account",note:null,payee:null,cleared:true,upload_month:"2025-12"}
];

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Check if data needs resetting (skip if all 105 seed rows are present)
  const { count, error: countError } = await supabase
    .from("financial_transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", DEMO_USER_ID);

  if (countError) {
    return new Response(JSON.stringify({ error: countError.message }), { status: 500 });
  }

  if (count === SEED_DATA.length) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: "data unchanged", rows: count }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Delete all existing transactions for the demo user
  const { error: delError } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("user_id", DEMO_USER_ID);

  if (delError) {
    return new Response(JSON.stringify({ error: delError.message }), { status: 500 });
  }

  // 3. Re-insert seed data in batches
  const rows = SEED_DATA.map((r) => ({ ...r, user_id: DEMO_USER_ID }));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("financial_transactions").insert(batch);
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, inserted }),
        { status: 500 }
      );
    }
    inserted += batch.length;
  }

  return new Response(
    JSON.stringify({ ok: true, inserted, demo_user: DEMO_USER_ID }),
    { headers: { "Content-Type": "application/json" } }
  );
});
