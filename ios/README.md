# Kino for iPhone and iPad

The same web app as the site (https://kino.reece.page) in its own full screen app, nothing is reimplemented. What it adds over Safari:

- sound plays with the silent switch on, and carries on with the screen locked (audio session category playback, background audio)
- sound and the next episode start by themselves (no tap needed first)
- offline downloads work straight away, with no "Add to Home Screen" first (the site is an app bound domain, so it also gets a service worker and opens with no connection)
- AirPlay and picture in picture
- links to other sites open in Safari, the app stays on Kino
- a "Can't reach Kino" screen with Try Again when there is no connection and nothing saved yet

The site sees `KinoiOS/1.0` in the user agent and `window.KinoIOS`, and `navigator.standalone` is true, so it behaves like a Home Screen app (no pinch zoom, its own status area).

## Put it on your iPhone

1. Open `ios/Kino.xcodeproj` in Xcode.
2. Xcode, Settings, Accounts: sign in with your Apple ID.
3. Click Kino in the left list, Signing & Capabilities, tick "Automatically manage signing" and pick your Team (your name, Personal Team).
4. Plug the iPhone in (or use Wi-Fi pairing), pick it at the top, press Run. First time: on the iPhone, Settings, Privacy & Security, Developer Mode on, then Settings, General, VPN & Device Management, trust your Apple ID.

A free Apple ID app lasts 7 days, then Run it again from Xcode. A paid developer account (99 USD a year) makes it last a year and allows TestFlight.

If the bundle id `page.reece.kino` is taken on your account, change it under Signing & Capabilities.

## Change it

`project.yml` is the source of the Xcode project (`brew install xcodegen`, then `xcodegen generate` in this folder). The code is two files in `Kino/`.

To try it against a server on this Mac: `SIMCTL_CHILD_KINO_URL=http://127.0.0.1:8123 xcrun simctl launch booted page.reece.kino` (debug builds only).

## Not in it yet

The video plays in the page's own player. A native player (like the Android app's) for more formats and a proper lock screen player is the next step.
