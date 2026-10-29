# Kino

Netflix style family library for the storage box, with the torbox sync, server stats and settings for the admin. Runs on the vps behind nginx at kino.reece.page and only listens on 127.0.0.1:8282 itself.

## How people get in

- Family dont need a login. If there internet address is on the allow list they see the **Who's watching?** screen and pick a profile.
- Each profile has its own continue watching, watched ticks, thumbs up or down, recommendations and playback settings (audio and subtitle language, subtitle size, autoplay, skip intros).
- The **Admin** button in the corner of the profile screen is the only login. It unlocks the Sync and Server pages, adding and deleting profiles, the allow list, fix match, deleting from the library and marking intros.
- Add family networks under Settings > Allowed networks. A small root helper (`kino-allowlist`) rewrites the nginx list within a few seconds, the app checks the same list as a second lock.

## What else it does

- Home shelves: continue watching, top picks, recently added, because you watched, critically acclaimed, genre shelves and not watched yet. Picks come from what each profile watched and rated.
- Search across titles, actors, genres and episode names.
- Player: up next with a countdown, skip intro (from chapters in the file or times the admin marked for a season), playback speed, AirPlay and picture in picture where the device supports them.
- Installable as an app on iPhone, iPad and Mac (Share > Add to Home Screen, or the install button in Chrome).
- The sync skips nfo files, samples and extras, skips anything you already have in 1080p or better, and only downloads the best copy when TorBox has several.
- `kino-watchdog` checks the storage box mount every minute and reconnects it if it drops or freezes.

## Stremio addons

Kino speaks the Stremio addon protocol, so any addon link that works in Stremio can be pasted in under Settings > Addons (admin only). The link ends with `/manifest.json`, `stremio://` links work too.

What Kino uses from an addon:

- **Catalogs** show up as shelves on Home (taking turns between addons, max 8) and in Search under "From Addons". Each shelf can be hidden. Titles that arent in the library open a details page that says so, anything that is in the library links to the normal page.
- **Metadata** is used for titles Cinemeta doesnt know (anime from Kitsu for example), for those detail pages and in Fix Match.
- **Subtitles** get added to the subtitle menu in the player, the profiles subtitle language is picked automatically. Kino sends the OpenSubtitles hash of the file so the timing usually matches.
- **Watch activity** (player and library events, used by tracking addons like Trakt) is only sent for profiles that turn on "Share Watch Activity with Addons" in their settings.
- **Streams are never used.** Addons that have them still install but Kino ignores that part, it only plays whats in the library.

Good ones to start with: `https://v3-cinemeta.strem.io/manifest.json`, `https://opensubtitles-v3.strem.io/manifest.json` and `https://anime-kitsu.strem.fun/manifest.json`.

Addons are outside servers so Kino only talks to them over https and refuses any link that points at a private or local address (so an addon cant be used to poke at the vps itself). Answers are size limited and cached.

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

## Admin account

```
sudo -u kino /opt/kino/venv/bin/python /opt/kino/app.py adduser NAME
sudo -u kino /opt/kino/venv/bin/python /opt/kino/app.py passwd NAME
```

## Your home ip changed

If you can still get in from somewhere on the list, change it under Settings > Allowed networks. If youre locked out, ssh into the vps and edit `/var/lib/kino/allowlist.json`, the nginx list updates by itself. To see what ip the server sees: `tail -n 5 /var/log/nginx/kino.access.log`.

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
- Addon links have to be https and can't point at private or local addresses, every redirect gets checked again
- The dashboard runs as its own `kino` user and polkit only lets it start or stop `torbox-sync.service`, nothing else

## Credits

hls.js (Apache 2.0) is bundled in `app/static/hls.min.js`. Metadata and artwork come from Cinemeta and Metahub, plus whatever addons you install.
