

## Plan: Demo User Read-Only Protection + Beginner-Friendly README

### 1. Database Migration — Demo User Write Protection

Create a `demo_users` table and a security-definer function to enforce read-only access for demo accounts.

**SQL changes:**
- `demo_users` table with a single `user_id uuid` column (references nothing to avoid auth schema issues)
- `is_demo_user(uuid)` security-definer function that checks membership
- Replace the existing "Users manage own transactions" ALL policy with two policies:
  - **SELECT** — unchanged (`auth.uid() = user_id`)
  - **INSERT/UPDATE/DELETE** — adds `AND NOT is_demo_user(auth.uid())`

**How it works:** After creating a demo user via CLI, the operator runs one SQL command to mark them as demo. From that point, the demo user can view data but cannot upload, edit, or delete anything.

### 2. Create `setup/mark-demo-user.sh` Helper Script

A small shell script that:
- Takes the demo user's email as input
- Looks up their UUID via the Supabase Auth admin API
- Inserts it into `demo_users`

This keeps the process simple for non-technical users.

### 3. Rewrite README for Non-Technical Users

Key improvements:
- **What is FinViz?** — plain-language intro before any tech jargon
- **Prerequisites explained** — what Docker is, where to get it, with links to install guides for Mac/Windows/Linux
- **Step-by-step with context** — explain *what* each command does, not just *which* command to run
- **Troubleshooting section** — common issues (port conflicts, Docker not running, wrong password)
- **Demo mode section** — add instructions for marking a user as read-only using the new script
- **FAQ** — "Do I need to know how to code?", "Can I use this on a Raspberry Pi?", etc.

### 4. Update `SECURITY.md`

Add a section on demo mode protection explaining the read-only RLS approach.

### Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/...` | New migration: `demo_users` table, function, updated RLS |
| `setup/mark-demo-user.sh` | New script to mark a user as demo |
| `README.md` | Major rewrite for clarity and accessibility |
| `SECURITY.md` | Add demo protection section |
| `setup/schema.sql` | Add `demo_users` table definition |

