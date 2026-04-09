#!/usr/bin/env bash
set -euo pipefail

# FinViz — Mark a user as a read-only demo account.
#
# Usage:
#   ./setup/mark-demo-user.sh <email>
#
# This looks up the user by email via the Supabase Auth admin API,
# then inserts their UUID into the demo_users table so that RLS
# policies block any write operations (upload, edit, delete).
#
# Requires: curl, jq, psql (or access to the database)
# Environment: API_EXTERNAL_URL, SERVICE_ROLE_KEY, DATABASE_URL

EMAIL="${1:?Usage: $0 <email>}"

API_URL="${API_EXTERNAL_URL:-http://localhost:8000}"
KEY="${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY must be set}"
DB_URL="${DATABASE_URL:?DATABASE_URL must be set}"

echo "Looking up user ${EMAIL}..."

# Fetch user list filtered by email
RESPONSE=$(curl -s -G "${API_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${KEY}" \
  -H "apikey: ${KEY}" \
  --data-urlencode "filter=${EMAIL}")

USER_ID=$(echo "$RESPONSE" | jq -r '.users[]? | select(.email == "'"${EMAIL}"'") | .id' | head -1)

if [ -z "$USER_ID" ]; then
  echo "Error: No user found with email ${EMAIL}"
  exit 1
fi

echo "Found user: ${USER_ID}"
echo "Marking as demo (read-only)..."

psql "$DB_URL" -c "INSERT INTO public.demo_users (user_id) VALUES ('${USER_ID}') ON CONFLICT DO NOTHING;"

echo "✓ User ${EMAIL} is now a read-only demo account."
echo "  They can view data but cannot upload, edit, or delete transactions."
