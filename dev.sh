#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

mkdir -p "$RUN_DIR"

port_ready() {
  curl --silent --show-error --fail --max-time 2 "$1" >/dev/null 2>&1
}

start_database() {
  if pg_isready -q -h "$DB_HOST" -p "$DB_PORT"; then
    echo "PostgreSQL is already accepting connections on $DB_HOST:$DB_PORT."
    return
  fi

  echo "Starting PostgreSQL cluster 18/main..."
  sudo pg_ctlcluster 18 main start
  for _ in {1..20}; do
    if pg_isready -q -h "$DB_HOST" -p "$DB_PORT"; then
      echo "PostgreSQL is ready."
      return
    fi
    sleep 1
  done
  echo "PostgreSQL did not become ready. Check: pg_lsclusters" >&2
  exit 1
}

start_service() {
  local name="$1" url="$2" log="$3"
  shift 3
  local pid_file="$RUN_DIR/$name.pid"

  if port_ready "$url"; then
    echo "$name is already responding at $url. Leaving it running."
    return
  fi
  if [[ -f "$pid_file" ]] && kill -0 "$(<"$pid_file")" 2>/dev/null; then
    echo "$name has a saved PID but is not responding. See $log" >&2
    exit 1
  fi
  rm -f "$pid_file"

  nohup "$@" >"$log" 2>&1 </dev/null &
  local pid=$!
  printf '%s\n' "$pid" >"$pid_file"
  for _ in {1..30}; do
    if port_ready "$url"; then
      echo "$name is ready at $url (log: $log)."
      return
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$name stopped during startup. Recent log output:" >&2
      tail -n 25 "$log" >&2 || true
      rm -f "$pid_file"
      exit 1
    fi
    sleep 1
  done
  echo "$name did not respond within 30 seconds. Recent log output:" >&2
  tail -n 25 "$log" >&2 || true
  exit 1
}

stop_service() {
  local name="$1" expected="$2"
  local pid_file="$RUN_DIR/$name.pid"
  [[ -f "$pid_file" ]] || { echo "$name was not started by dev.sh."; return; }
  local pid
  pid="$(<"$pid_file")"
  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$pid_file"
    echo "$name was already stopped."
    return
  fi
  local command_line
  command_line="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  if [[ "$command_line" != *"$expected"* ]]; then
    echo "PID $pid no longer matches $name; leaving it untouched." >&2
    rm -f "$pid_file"
    return
  fi
  kill "$pid"
  rm -f "$pid_file"
  echo "Stopped $name."
}

case "${1:-start}" in
  start)
    cd "$ROOT_DIR"
    [[ -x "$ROOT_DIR/venv/bin/python" ]] || { echo "Missing venv/bin/python. Create the project virtual environment first." >&2; exit 1; }
    [[ -x "$ROOT_DIR/node_modules/.bin/vite" ]] || { echo "Missing node_modules. Run npm install first." >&2; exit 1; }
    start_database
    start_service backend "http://127.0.0.1:$BACKEND_PORT/api/auctions/" "$RUN_DIR/backend.log" \
      "$ROOT_DIR/venv/bin/python" -u "$ROOT_DIR/backend/manage.py" runserver --noreload "0.0.0.0:$BACKEND_PORT"
    start_service frontend "http://127.0.0.1:$FRONTEND_PORT/" "$RUN_DIR/frontend.log" \
      "$ROOT_DIR/node_modules/.bin/vite" --host 0.0.0.0 --strictPort --port "$FRONTEND_PORT"
    echo "BidZo is available at http://localhost:$FRONTEND_PORT/"
    ;;
  stop)
    stop_service frontend "node_modules/.bin/vite"
    stop_service backend "backend/manage.py runserver"
    ;;
  status)
    pg_isready -h "$DB_HOST" -p "$DB_PORT" || true
    port_ready "http://127.0.0.1:$BACKEND_PORT/api/auctions/" && echo "Django: responding" || echo "Django: stopped/unavailable"
    port_ready "http://127.0.0.1:$FRONTEND_PORT/" && echo "Vite: responding" || echo "Vite: stopped/unavailable"
    ;;
  *)
    echo "Usage: ./dev.sh [start|stop|status]" >&2
    exit 2
    ;;
esac
