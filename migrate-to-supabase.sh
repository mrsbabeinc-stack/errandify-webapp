#!/bin/bash

# Migration script to apply all database schemas to Supabase
# Usage: DATABASE_URL="postgresql://..." ./migrate-to-supabase.sh

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo "Usage: DATABASE_URL='postgresql://...' ./migrate-to-supabase.sh"
  exit 1
fi

echo "🚀 Starting database migration to Supabase..."
echo "📦 Database: $DATABASE_URL"

# Array of SQL files in order
SQL_FILES=(
  "database/schema.sql"
  "database/add_postal_code.sql"
  "database/add_offer_id.sql"
  "database/add_formatted_ids.sql"
  "database/add_notifications_system.sql"
  "database/add_ratings_system.sql"
  "database/add_disputes_system.sql"
  "database/add_errand_activity_log.sql"
  "database/add_errandify_points.sql"
  "database/add_rating_reminders.sql"
  "database/add_push_subscriptions.sql"
  "database/add_income_field.sql"
  "database/add_task_execution.sql"
  "database/add_email_notifications.sql"
  "database/add_session_assignments.sql"
  "database/add_user_favorites.sql"
  "database/add_completion_notes.sql"
  "database/add_chas_fields.sql"
  "database/add_criminal_records_check.sql"
  "database/add_criminal_screening.sql"
  "database/add_ai_audit_tables.sql"
  "database/add_bid_viewed_tracking.sql"
  "database/create_postal_code_cache.sql"
  "database/update_user_roles.sql"
  "database/create_admin_accounts.sql"
  "database/backfill_offer_ids.sql"
)

FAILED=0
SUCCEEDED=0

for sql_file in "${SQL_FILES[@]}"; do
  if [ ! -f "$sql_file" ]; then
    echo "⚠️  SKIPPED: $sql_file (file not found)"
    continue
  fi

  echo ""
  echo "📝 Applying: $sql_file"

  # Execute SQL file
  if psql "$DATABASE_URL" -f "$sql_file" -q 2>/dev/null; then
    echo "✅ SUCCESS: $sql_file"
    ((SUCCEEDED++))
  else
    echo "❌ FAILED: $sql_file"
    ((FAILED++))
  fi
done

echo ""
echo "========================================"
echo "🎉 Migration Summary"
echo "========================================"
echo "✅ Succeeded: $SUCCEEDED"
echo "❌ Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "🚀 All migrations completed successfully!"
  exit 0
else
  echo ""
  echo "⚠️  Some migrations failed. Check errors above."
  exit 1
fi
