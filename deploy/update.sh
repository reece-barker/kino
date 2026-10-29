#!/usr/bin/env bash
# Pulls the latest main from github and installs it. GitHub Actions runs this after every push,
# you can also run it by hand with: kino-update
set -euo pipefail
REPO=/srv/kino

# Only one deploy at a time, if two pushes land close together the second one waits
exec 9>/run/kino-update.lock
flock -w 900 9

cd "$REPO"
git fetch -q origin main
git reset -q --hard origin/main
exec bash "$REPO/install.sh" --update
