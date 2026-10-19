#!/usr/bin/env bash
# Asks Render to deploy one commit through the service's deploy hook.
# The hook URL comes from the DEPLOY_HOOK environment variable (the
# RENDER_DEPLOY_HOOK_URL secret) and is never printed.
#
# Usage: DEPLOY_HOOK=... scripts/render-deploy.sh <sha>
set -euo pipefail

sha="$1"

# A pasted secret often carries a trailing newline, spaces, or quotes, which
# make curl reject the URL ("Malformed input to a URL function").
hook=$(printf '%s' "${DEPLOY_HOOK:-}" | tr -d "[:space:]\"'")

case "$hook" in
  https://api.render.com/deploy/srv-*) ;;
  *)
    echo "::error::RENDER_DEPLOY_HOOK_URL does not look like a Render deploy hook (expected https://api.render.com/deploy/srv-...?key=...). Copy it again from Render: Settings > Deploy Hook." >&2
    exit 1
    ;;
esac

# -G appends `ref` as a query parameter, with `?` or `&` as needed;
# -X POST keeps the request a POST, as Render's docs show.
curl -fsS -X POST -G --data-urlencode "ref=$sha" "$hook"
echo
echo "Render accepted the deploy of $sha."
