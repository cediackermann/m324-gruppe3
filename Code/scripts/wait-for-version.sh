#!/usr/bin/env bash
# Waits until <base-url>/health reports the given version (commit SHA).
# Used by the deploy job: a deploy only counts as live once the new commit
# answers, not when Render accepted the deploy request.
#
# Usage: scripts/wait-for-version.sh <base-url> <sha> [timeout-seconds]
set -euo pipefail

url="$1"
want="$2"
timeout="${3:-900}"
deadline=$(($(date +%s) + timeout))

while [ "$(date +%s)" -lt "$deadline" ]; do
  # --max-time is generous: a sleeping free Render service needs up to a
  # minute to wake up.
  live=$(curl -fsS --max-time 90 "$url/health" | jq -r '.version // empty' || true)
  if [ "$live" = "$want" ]; then
    echo "Version $want is live."
    exit 0
  fi
  echo "Live version: ${live:-unreachable}. Waiting for $want..."
  sleep 15
done

echo "::error::Version $want was not live after ${timeout}s." >&2
exit 1
