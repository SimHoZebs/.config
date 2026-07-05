#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="grafana-mcp"
IMAGE="grafana/mcp-grafana"

# Reuse an already-running persistent container
if docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q true; then
    exec docker exec -i "$CONTAINER_NAME" /app/mcp-grafana -t stdio
fi

# Remove any stopped container with the same name
if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    docker rm -f "$CONTAINER_NAME" >/dev/null
fi

# Create a persistent container kept alive with sleep infinity.
# -e VAR (no value) passes this script's env through; opencode sets
# GRAFANA_URL and GRAFANA_SERVICE_ACCOUNT_TOKEN in the environment.
docker run -d --name "$CONTAINER_NAME" \
    -e GRAFANA_URL \
    -e GRAFANA_SERVICE_ACCOUNT_TOKEN \
    --entrypoint sleep \
    "$IMAGE" infinity >/dev/null

# Start the mcp server inside it over stdio (inherits container env)
exec docker exec -i "$CONTAINER_NAME" /app/mcp-grafana -t stdio
