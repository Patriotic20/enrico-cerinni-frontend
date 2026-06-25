#!/bin/sh
# docker-entrypoint.sh
#
# Writes a runtime config file into the built static assets so the browser can
# read environment-specific values without requiring a rebuild.
#
# Environment variables consumed:
#   API_URL   — public URL of the backend (e.g. https://enrico-cerinni-backend.up.railway.app)
#               Falls back to https://api.enrico.uz when not set.

set -e

DIST_DIR=/app/dist
CONFIG_FILE="${DIST_DIR}/config.js"

API_URL="${API_URL:-https://api.enrico.uz}"

echo "Generating runtime config..."
echo "  API_URL = ${API_URL}"

cat > "${CONFIG_FILE}" <<EOF
// Auto-generated at container startup by docker-entrypoint.sh — do not edit.
window.__APP_CONFIG__ = {
  apiUrl: "${API_URL}"
};
EOF

echo "Runtime config written to ${CONFIG_FILE}"

# Hand off to the static file server
exec serve -s dist -l "${PORT:-3000}"
