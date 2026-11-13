#!/bin/bash
# 在家庭局域网发布 elaine-study.local，指向这台 Mac 当前的上网地址。
set -u
NAME="elaine-study.local"
PORT="80"

current_ip() {
  local iface ip
  iface=$(route -n get default 2>/dev/null | awk '/interface:/{print $2; exit}')
  if [[ -n "${iface:-}" ]]; then
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  fi
  if [[ -z "${ip:-}" ]]; then
    ip=$(ipconfig getifaddr en0 2>/dev/null || true)
  fi
  if [[ -z "${ip:-}" ]]; then
    ip=$(ipconfig getifaddr en1 2>/dev/null || true)
  fi
  printf '%s' "${ip:-}"
}

while true; do
  IP=$(current_ip)
  if [[ -z "$IP" ]]; then
    echo "$(date '+%F %T') waiting for a LAN address"
    sleep 5
    continue
  fi
  echo "$(date '+%F %T') publish ${NAME} -> ${IP}"
  dns-sd -P "Elaine Study" _http._tcp local "$PORT" "$NAME" "$IP" "path=/" &
  PID=$!
  while kill -0 "$PID" 2>/dev/null; do
    sleep 5
    NOW=$(current_ip)
    if [[ "$NOW" != "$IP" ]]; then
      echo "$(date '+%F %T') address changed ${IP} -> ${NOW:-none}"
      kill "$PID" 2>/dev/null || true
      wait "$PID" 2>/dev/null || true
      break
    fi
  done
  wait "$PID" 2>/dev/null || true
  sleep 1
done
