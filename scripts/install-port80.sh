#!/bin/bash
set -euo pipefail
ROOT="/Volumes/2TB/Elaine/Elaine学英语"
DEST="/Library/Application Support/ElaineEnglish"
mkdir -p "$DEST"
cp "$ROOT/scripts/port80-proxy.py" "$DEST/port80-proxy.py"
chown root:wheel "$DEST/port80-proxy.py"
chmod 755 "$DEST/port80-proxy.py"
cp "$ROOT/scripts/com.elaine.http.plist" /Library/LaunchDaemons/com.elaine.http.plist
chown root:wheel /Library/LaunchDaemons/com.elaine.http.plist
chmod 644 /Library/LaunchDaemons/com.elaine.http.plist
touch /var/log/elaine-http.log /var/log/elaine-http.err.log
chmod 644 /var/log/elaine-http.log /var/log/elaine-http.err.log
launchctl bootout system/com.elaine.http 2>/dev/null || true
launchctl bootstrap system /Library/LaunchDaemons/com.elaine.http.plist
launchctl enable system/com.elaine.http
