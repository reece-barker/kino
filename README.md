# Kino dashboard

Dashboard for kino.reece.page, it shows the torbox sync live with pause and stop buttons, the vps stats and storage, and the whole storage box library as apple tv style tiles with its own player. Everything runs on the vps behind nginx and only listens on 127.0.0.1:8282 itself.

## Setup

1. Cloudflare DNS: add an A record, name `kino`, value `169.58.99.51`, proxy status **DNS only** (grey cloud).
2. On your Mac, copy the package to the vps:
   ```
   scp ~/Downloads/kino.tar.gz root@169.58.99.51:/root/
   ```
3. On the vps:
   ```
   cd /root && tar xzf kino.tar.gz && cd kino
   bash install.sh
   ```
   It asks for an admin username and a password (12+ characters) at the end.
4. Open https://kino.reece.page and sign in.

## Auto deploy from GitHub

Every push to `main` runs the checks in `.github/workflows/deploy.yml` (syntax, the app starts, logins are required). If they pass, GitHub logs into the vps and runs `kino-update`, which pulls the repo into `/srv/kino` and runs `install.sh --update`. Pull requests only get checked, they go live once merged.

The key GitHub uses is locked on the server so it can only run `kino-update`, nothing else. Run `kino-update` by hand on the vps if you ever want to redeploy without pushing.

Repo secrets (Settings > Secrets and variables > Actions):
- `DEPLOY_HOST`: `169.58.99.51`
- `KINO_DEPLOY_KEY`: the private key from `/root/.ssh/kino_actions` on the vps

## Adding family

```
sudo -u kino /opt/kino/venv/bin/python /opt/kino/app.py adduser NAME --role viewer
```
Viewers get the library, player and downloads but not the Sync or Server pages.
Other commands: `passwd NAME`, `deluser NAME`, `users`.

Family outside your home wifi wont get in because of the ip lock. Either add there ip to `/etc/nginx/snippets/kino-allow.conf`, or delete the three allow/deny lines in that file to rely on the login, rate limit and fail2ban. Then run `nginx -t && systemctl reload nginx`.

## Your home ip changed

Edit `/etc/nginx/snippets/kino-allow.conf`, then `nginx -t && systemctl reload nginx`. To see what ip the server sees: `tail -n 5 /var/log/nginx/kino.access.log`.

## Useful commands

| What | Command |
|---|---|
| Dashboard logs | `journalctl -u kino -f` |
| Sync logs | `journalctl -u torbox-sync -f` |
| Restart dashboard | `systemctl restart kino` |
| Unban an ip from fail2ban | `fail2ban-client set kino unbanip 1.2.3.4` |
| Redeploy without a push | `kino-update` |
| See deploys | the Actions tab on GitHub |

## Whats where

- App: `/opt/kino`, config: `/etc/kino/kino.env`, database and caches: `/var/lib/kino`
- Sync script: `/root/torbox-sync/sync.py` (the old one is kept next to it as `sync.py.bak-...`)
- Sync status file the dashboard reads: `/var/lib/torbox-sync/status.json`
- Pause file the sync reads: `/var/lib/kino/pause.json`

## Security bits

- Passwords are hashed with scrypt, sessions are random tokens in an httponly secure cookie
- 5 wrong logins from one ip locks it for 15 min, nginx also limits the login to 5 per minute, fail2ban bans after 8
- Every change request needs a custom header so other sites cant trigger actions
- Strict content security policy, no outside scripts at all (hls.js is bundled)
- Download links for vlc are signed and run out after 6 hours
- The dashboard runs as its own `kino` user and polkit only lets it start or stop `torbox-sync.service`, nothing else

## Credits

hls.js (Apache 2.0) is bundled in `app/static/hls.min.js`. Metadata and artwork come from Cinemeta and Metahub.
