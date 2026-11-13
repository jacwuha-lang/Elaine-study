#!/bin/bash
# 由登录项调用。启动程序必须放在系统盘上，否则 launchd 无法执行。
set -u
ROOT="/Volumes/2TB/Elaine/Elaine学英语"
PY="/Users/mari/Library/Application Support/ElaineEnglish/.venv/bin/python"

for _ in $(seq 1 30); do
  if [[ -x "$PY" && -f "$ROOT/server.py" ]]; then
    break
  fi
  sleep 2
done

cd "$ROOT" || exit 1
exec "$PY" "$ROOT/server.py" --host 0.0.0.0 --port 8777 --no-open
