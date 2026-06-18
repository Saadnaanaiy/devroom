#!/bin/bash
set -e

if [ -n "$TURN_USER" ] && [ -n "$TURN_PASSWORD" ]; then
  turnserver -n -a -L 0.0.0.0 -p ${TURN_PORT:-3478} -r devroom \
    -u $TURN_USER:$TURN_PASSWORD \
    --no-cli --no-tlsv1 --no-tlsv1_1 --no-sslv3 \
    --min-port=${TURN_MIN_PORT:-49152} --max-port=${TURN_MAX_PORT:-65535} &
  echo "[*] Coturn started on port ${TURN_PORT:-3478}"
else
  echo "[!] TURN_USER/TURN_PASSWORD not set — Coturn disabled"
fi

exec gunicorn --worker-class eventlet --workers 1 --bind 0.0.0.0:$PORT wsgi:app
