#!/usr/bin/env bash
#
# Expose the local Vite dev server on a public HTTPS URL so the app can be
# opened on a phone.
#
# A Cloudflare quick tunnel gets a NEW random hostname every time it starts, and
# the frontend needs that hostname baked into VITE_API_URL, so doing this by hand
# means editing an env file on every restart. This script does both: it starts
# the tunnel, waits for the hostname, writes it to frontend/.env.development.local
# (the highest-priority env file in dev mode — .env.development would otherwise
# override .env.local), and prints the link.
#
# Vite restarts itself when the env file changes, so the running dev server picks
# up the new URL without any further action.
#
# Usage:  ./scripts/tunnel.sh          # tunnels the default port, 5173
#         ./scripts/tunnel.sh 4173     # tunnels a different port
#
# Ctrl-C stops the tunnel. The env file is left pointing at the dead hostname;
# the next run overwrites it.

set -euo pipefail

PORT="${1:-5173}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/frontend/.env.development.local"
LOG_FILE="$(mktemp -t errandify-tunnel)"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install it with:  brew install cloudflared" >&2
  exit 1
fi

if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Nothing is listening on port $PORT — start the dev server first." >&2
  exit 1
fi

cleanup() {
  [[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT INT TERM

echo "Starting Cloudflare tunnel to http://localhost:$PORT ..."
cloudflared tunnel --url "http://localhost:$PORT" >"$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

# cloudflared prints the assigned hostname a few seconds after start.
URL=""
for _ in $(seq 1 40); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1 || true)"
  [[ -n "$URL" ]] && break
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    echo "cloudflared exited before publishing a URL:" >&2
    cat "$LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done

if [[ -z "$URL" ]]; then
  echo "Timed out waiting for a tunnel URL. cloudflared output:" >&2
  cat "$LOG_FILE" >&2
  exit 1
fi

cat >"$ENV_FILE" <<EOF
# Written by scripts/tunnel.sh — do not edit by hand while the tunnel is running.
#
# Points at the FRONTEND tunnel, not a separate backend tunnel: ~300 fetch call
# sites fall back to http://localhost:3000 when this is unset, which a phone
# cannot reach. Routing them through the tunnel sends them back via the Vite dev
# proxy, which forwards /api to :3000 locally.
VITE_API_URL=$URL
EOF

echo
echo "  Open this on your phone:"
echo "  $URL"
echo
echo "  VITE_API_URL written to frontend/.env.development.local"
echo "  Vite will restart on its own to pick it up."
echo "  Ctrl-C to stop the tunnel."
echo

wait "$TUNNEL_PID"
