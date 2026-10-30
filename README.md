# Drive Thru

Simple 3D time-management web game / PWA. Plain HTML/CSS/JS (ES modules), three.js vendored in `lib/`. Design: `DriveThru-MDD.md`.

## Run locally
Service workers and ES modules need http, not file://:

    python3 -m http.server 8000

Open http://localhost:8000 (on iPhone, use your computer's LAN IP, then Add to Home Screen).

## Deploy
Commit and push to `main`, then enable Pages (Settings > Pages > main / root). All paths are relative.
Bump `CACHE` in `sw.js` (`drive-thru-v2`, ...) on each deploy so clients update.

## Icons
`python3 tools/make-icons.py` regenerates the placeholder icons (needs Pillow).
