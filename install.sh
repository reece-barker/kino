#!/usr/bin/env bash
# Installs the kino dashboard on the vps, safe to run again later to update it
# Usage: sudo bash install.sh            first install, asks questions
#        sudo bash install.sh --update   what the github deploy runs, no questions and no certbot
set -euo pipefail

UPDATE=0
[ "${1:-}" = "--update" ] && UPDATE=1

HERE="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="kino.reece.page"
PORT=8282

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!! %s\033[0m\n' "$*"; }
die()  { printf '\033[31mxx %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Run this as root"
[ -f /root/torbox-sync/.env ] || die "No /root/torbox-sync/.env, set up the torbox sync first"
if ! mountpoint -q /srv/torbox; then
  # A first install needs the box, an update can still go ahead and the dashboard will say its not mounted
  [ "$UPDATE" = 1 ] && warn "/srv/torbox isnt mounted right now" || die "/srv/torbox isnt mounted, run 'mount -a' and check 'df -h /srv/torbox' first"
fi
# The old sb1 dashboard used the same port, its moved over further down so it doesnt count
if ss -ltn | grep -q ":$PORT " && ! systemctl is-active -q kino.service && ! systemctl is-active -q sb1.service; then
  die "Something else is already using port $PORT"
fi

PKGS="python3-venv python3-requests ffmpeg polkitd fail2ban python3-systemd certbot openssl rsync git"
# On updates apt only runs when something is actualy missing, otherwise every push would wait for apt
if [ "$UPDATE" = 0 ] || ! dpkg -s $PKGS >/dev/null 2>&1; then
  step "Installing packages"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $PKGS >/dev/null
fi
ffmpeg -hide_banner -h full 2>/dev/null | grep -q readrate_initial_burst || \
  warn "This ffmpeg cant limit read speed, the player will still work but uses more temp disk space"

step "Creating the kino system user"
id kino >/dev/null 2>&1 || useradd --system --home-dir /var/lib/kino --shell /usr/sbin/nologin kino

# If the old sb1 version was installed from the tarball, move its data and logins over and clean it up
if [ -f /etc/systemd/system/sb1.service ]; then
  step "Moving the old sb1 install over to kino"
  systemctl disable -q --now sb1.service 2>/dev/null || true
  rm -f /etc/systemd/system/sb1.service
  if [ ! -f /etc/kino/kino.env ] && [ -f /etc/sb1/sb1.env ]; then
    mkdir -p /etc/kino
    sed -e 's/SB1_SECRET/KINO_SECRET/; s#/var/lib/sb1#/var/lib/kino#g' /etc/sb1/sb1.env > /etc/kino/kino.env
  fi
  if [ ! -d /var/lib/kino ] && [ -d /var/lib/sb1 ]; then
    mv /var/lib/sb1 /var/lib/kino
    rm -rf /var/lib/kino/hls
  fi
  [ -d /var/lib/kino ] && chown -R kino:kino /var/lib/kino
  if [ ! -f /etc/nginx/snippets/kino-allow.conf ] && [ -f /etc/nginx/snippets/sb1-allow.conf ]; then
    mv /etc/nginx/snippets/sb1-allow.conf /etc/nginx/snippets/kino-allow.conf
  fi
  rm -rf /etc/sb1 /opt/sb1
  rm -f /etc/nginx/sites-enabled/sb1.conf /etc/nginx/sites-available/sb1.conf /etc/nginx/conf.d/sb1-limits.conf \
        /etc/nginx/snippets/sb1-allow.conf /etc/polkit-1/rules.d/50-sb1-sync.rules /usr/local/sbin/sb1-update \
        /etc/fail2ban/jail.d/sb1.local /etc/fail2ban/filter.d/sb1.conf
  userdel sb1 2>/dev/null || true
  warn "Old sb1 removed. Point a DNS record at kino.reece.page, sb1.reece.page stops working"
fi

step "Copying the app to /opt/kino"
mkdir -p /opt/kino
# --delete so files removed from the repo also disapear from the server, the venv is left alone
rsync -a --delete --exclude venv/ --exclude __pycache__/ "$HERE/app/" /opt/kino/
[ -d /opt/kino/venv ] || python3 -m venv /opt/kino/venv
if ! cmp -s /opt/kino/requirements.txt /opt/kino/venv/.installed-requirements 2>/dev/null; then
  /opt/kino/venv/bin/pip install -q --upgrade pip
  /opt/kino/venv/bin/pip install -q -r /opt/kino/requirements.txt
  cp /opt/kino/requirements.txt /opt/kino/venv/.installed-requirements
fi
chown -R root:root /opt/kino
chmod -R go-w /opt/kino

step "Config file /etc/kino/kino.env"
mkdir -p /etc/kino
if [ ! -f /etc/kino/kino.env ]; then
  # Random secret for signing download links, made once and kept
  sed "s/REPLACED_BY_INSTALLER/$(openssl rand -hex 32)/" "$HERE/deploy/kino.env.example" > /etc/kino/kino.env
fi
# The old default of 3 converted streams gets raised to 20, a number you picked yourself is left alone
sed -i 's/^MAX_FFMPEG=3$/MAX_FFMPEG=20/' /etc/kino/kino.env
grep -q '^PROFILE_DEVICES=' /etc/kino/kino.env || echo 'PROFILE_DEVICES=3' >> /etc/kino/kino.env
chmod 600 /etc/kino/kino.env

step "Updating the torbox sync script (old one is kept as a backup)"
if [ -f /root/torbox-sync/sync.py ] && ! cmp -s "$HERE/sync/sync.py" /root/torbox-sync/sync.py; then
  cp /root/torbox-sync/sync.py "/root/torbox-sync/sync.py.bak-$(date +%Y%m%d-%H%M%S)"
fi
cp "$HERE/sync/sync.py" /root/torbox-sync/sync.py
cp "$HERE/deploy/torbox-sync.service" "$HERE/deploy/torbox-sync.timer" /etc/systemd/system/

step "Letting the dashboard start and stop only the sync"
mkdir -p /etc/polkit-1/rules.d
cp "$HERE/deploy/50-kino-sync.rules" /etc/polkit-1/rules.d/
systemctl restart polkit 2>/dev/null || true

step "Allow list, mount watchdog and helpers"
mkdir -p /opt/kino-tools /var/lib/kino
install -m 755 "$HERE/deploy/kino-watchdog.py" "$HERE/deploy/kino-allowlist.py" "$HERE/deploy/kino-health" /opt/kino-tools/
# The settings page keeps the allow list in a json file, the first time its filled from the nginx list you already have
if [ ! -s /var/lib/kino/allowlist.json ]; then
  SRC=/etc/nginx/snippets/kino-allow.conf
  [ -f "$SRC" ] || SRC="$HERE/deploy/nginx/kino-allow.conf"
  python3 - "$SRC" > /var/lib/kino/allowlist.json <<'PY'
import json, re, sys, time
cidrs = re.findall(r"^\s*allow\s+([0-9a-fA-F:./]+)\s*;", open(sys.argv[1]).read(), re.M)
print(json.dumps({"entries": [{"cidr": c, "label": "Home" if i == 0 else f"Imported {i + 1}", "added": time.time(), "by": "installer"}
                              for i, c in enumerate(cidrs)], "updated": time.time()}, indent=1))
PY
fi
chown -R kino:kino /var/lib/kino
cp "$HERE"/deploy/kino-watchdog.service "$HERE"/deploy/kino-watchdog.timer \
   "$HERE"/deploy/kino-allowlist.service "$HERE"/deploy/kino-allowlist.path \
   "$HERE"/deploy/kino-health.service "$HERE"/deploy/kino-health.timer /etc/systemd/system/

step "Starting the dashboard service"
cp "$HERE/deploy/kino.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q --now torbox-sync.timer kino-watchdog.timer kino-allowlist.path kino-health.timer
systemctl enable -q kino.service
systemctl restart kino.service
for i in $(seq 1 30); do
  curl -fs "http://127.0.0.1:$PORT/healthz" >/dev/null && break
  sleep 1
done
curl -fs "http://127.0.0.1:$PORT/healthz" >/dev/null || { journalctl -u kino -n 30 --no-pager; die "The dashboard didnt start"; }
sudo -u kino ls /srv/torbox >/dev/null 2>&1 || warn "The kino user cant read /srv/torbox, check the fstab line has allow_other"

step "nginx for $DOMAIN"
cp "$HERE/deploy/nginx/kino-limits.conf" /etc/nginx/conf.d/kino-limits.conf
mkdir -p /etc/nginx/snippets /var/www/html
# Dont overwrite the ip list if you already edited it
[ -f /etc/nginx/snippets/kino-allow.conf ] || cp "$HERE/deploy/nginx/kino-allow.conf" /etc/nginx/snippets/kino-allow.conf
SERVER_IP="$(curl -4fs https://api.ipify.org || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
if [ -n "$SERVER_IP" ] && [ "$DNS_IP" != "$SERVER_IP" ]; then
  warn "$DOMAIN points to '${DNS_IP:-nothing}' but this vps is $SERVER_IP. Fix the DNS record (grey cloud) and run this again"
fi
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  [ "$UPDATE" = 1 ] && die "No certificate yet, run 'bash install.sh' once by hand first"
  cp "$HERE/deploy/nginx/kino-bootstrap.conf" /etc/nginx/sites-available/kino.conf
  ln -sf /etc/nginx/sites-available/kino.conf /etc/nginx/sites-enabled/kino.conf
  nginx -t && systemctl reload nginx
  certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos \
    || die "Certbot couldnt get a certificate, usually the DNS record isnt pointing here yet. Fix it and run this again"
fi
cp "$HERE/deploy/nginx/kino.conf" /etc/nginx/sites-available/kino.conf
ln -sf /etc/nginx/sites-available/kino.conf /etc/nginx/sites-enabled/kino.conf
nginx -t || die "nginx config test failed, nothing was reloaded"
systemctl reload nginx
# Writes the nginx ip list from the settings page list once now, after that it updates by itself on every change
systemctl start kino-allowlist.service || warn "Couldnt apply the allow list, check: journalctl -u kino-allowlist"

step "fail2ban for repeated failed logins"
cp "$HERE/deploy/fail2ban/kino.local" /etc/fail2ban/filter.d/kino.conf
cp "$HERE/deploy/fail2ban/kino-jail.local" /etc/fail2ban/jail.d/kino.local
systemctl enable -q --now fail2ban
fail2ban-client reload >/dev/null 2>&1 || systemctl restart fail2ban

step "Update command for the github deploy"
install -m 755 "$HERE/deploy/update.sh" /usr/local/sbin/kino-update

if [ "$UPDATE" = 1 ]; then
  step "Updated to $(git -C "$HERE" log -1 --format='%h %s' 2>/dev/null || echo 'local copy')"
  exit 0
fi

step "Admin account"
USERS="$(sudo -u kino /opt/kino/venv/bin/python /opt/kino/app.py users 2>/dev/null || true)"
if ! grep -q admin <<<"$USERS"; then
  read -rp "Pick an admin username: " ADMIN
  sudo -u kino /opt/kino/venv/bin/python /opt/kino/app.py adduser "$ADMIN"
else
  echo "$USERS"
fi

step "Done"
echo "Open https://$DOMAIN"
echo "Logs:          journalctl -u kino -f"
echo "Admin account: sudo -u kino /opt/kino/venv/bin/python /opt/kino/app.py passwd NAME"
