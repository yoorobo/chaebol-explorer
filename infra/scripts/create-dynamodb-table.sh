#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
TABLE="chaebol-governance"
SPEC="$(cd "$(dirname "$0")/.." && pwd)/dynamodb/chaebol-governance-table.json"

EXISTS=$(aws dynamodb describe-table --region "$REGION" --table-name "$TABLE" --query 'Table.TableStatus' --output text 2>/dev/null || true)
if [[ -n "$EXISTS" && "$EXISTS" != "None" ]]; then
  echo "[SKIP] table exists: $TABLE status=$EXISTS"
else
  echo "[CREATE] table: $TABLE"
  aws dynamodb create-table --region "$REGION" --cli-input-json "file://$SPEC"
fi

echo "[WAIT] table-exists"
aws dynamodb wait table-exists --region "$REGION" --table-name "$TABLE"

echo "[DESCRIBE]"
aws dynamodb describe-table --region "$REGION" --table-name "$TABLE" --query '{TableName:Table.TableName,TableStatus:Table.TableStatus,BillingMode:Table.BillingModeSummary.BillingMode,GSIs:Table.GlobalSecondaryIndexes[*].{IndexName:IndexName,Status:IndexStatus}}'
