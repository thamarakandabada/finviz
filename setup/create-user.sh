#!/usr/bin/env bash
set -euo pipefail

# FinViz — first-run setup script
# Creates the first admin user via Supabase Auth API.
#
# Usage:
#   ./setup/create-user.sh <email> <password>
#
# Requires: curl, jq
# Environment: API_EXTERNAL_URL, SERVICE_ROLE_KEY (or set in .env)

EMAIL="${1:?Usage: $0 <email> <password>}"
PASSWORD="${2:?Usage: $0 <email> <password>}"

API_URL="${API_EXTERNAL_URL:-http://localhost:8000}"
KEY="${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY must be set}"

echo "Creating user ${EMAIL}..."

RESPONSE=$(curl -s -X POST "${API_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${KEY}" \
  -H "apikey: ${KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true
  }")

USER_ID=$(echo "$RESPONSE" | jq -r '.id // empty')

if [ -z "$USER_ID" ]; then
  echo "Error creating user:"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo "✓ User created: ${USER_ID}"
echo "  Email: ${EMAIL}"
echo "  You can now sign in at your FinViz instance."
