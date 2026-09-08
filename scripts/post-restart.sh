#!/bin/bash
PORT=${PORT:-3008}
MAX_WAIT=60
for i in $(seq 1 $MAX_WAIT); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/explore" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "[warm] Explore cache warmed successfully"
    exit 0
  fi
  sleep 1
done
echo "[warm] Failed to warm cache after ${MAX_WAIT}s"
exit 1
