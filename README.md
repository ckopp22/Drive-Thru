# Drive Thru

A 3D time-management game for the phone (an installable web app / PWA). You run the window at a drive-thru: cars pull up with an order, you make the items, carry them to a tray, and send the order out before the customer loses patience. Earn the level's money goal before the 2-minute timer ends to pass (1 star), and keep earning for 2 and 3 stars.

There are four restaurants, each with 10 levels. Beat all 10 of one to unlock the next: **Burger Joint**, **Coffee Shop** (cups from the cabinet, a second worker walking around), **Pizza Place** (dough, plate, toppings, oven), **Hospital** (two patient lines: medicine, bills, bandages, ID photos). Use the ‹ › arrows on the main menu to switch.

Plain HTML/CSS/JS (ES modules), three.js vendored in `lib/`, no bundler, no build step. All art and sound effects are generated in code; the only media file is the music track. Design doc: `DriveThru-MDD.md`.

## Run locally

Service workers and ES modules need http, not `file://`:

    python3 -m http.server 8000

Open http://localhost:8000. To try it on an iPhone, use your computer's LAN address (for example `http://192.168.1.20:8000`) on the same Wi-Fi. The service worker only registers on `localhost` or https, so test installing and offline mode on the deployed Pages URL.

## Deploy to GitHub Pages

1. Commit and push to `main`.
2. Repo **Settings > Pages**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`.
3. Your game is at `https://<user>.github.io/<repo>/` after a minute. All paths in the app are relative, so it works under that sub-path.

## Bump the service-worker version on every deploy

Installed copies only update when `sw.js` changes, so change the cache name each time you ship:

    sed -i '' -E "s/drive-thru-v([0-9]+)/drive-thru-v$(( $(grep -oE 'drive-thru-v[0-9]+' sw.js | head -1 | tr -dc 0-9) + 1 ))/" sw.js

(or just edit `const CACHE = 'drive-thru-v35'` by hand to `v36`). When a new version has downloaded, a yellow **Tap to Update** banner appears in the app; tapping it switches to the new version and reloads. The old cache is deleted on activation.

If you add or remove a file, also add or remove it from the `ASSETS` list in `sw.js`. `node tools/check-pwa.mjs` fails if a shipped file is missing from the list.

## Tune the levels

`js/levels.js` has one line per level (`LEVELS`), shared as the starting point by the other shops (`js/shops.js` copies and adjusts them):

| field | meaning |
|---|---|
| `time` | seconds in the shift |
| `goal` | money for 1 star (this passes the level) |
| `star2`, `star3` | money for 2 and 3 stars (default 1.4x and 1.8x the goal if omitted) |
| `trays` | serving trays (1-3) |
| `items` | which of soda / burger / fries are on the menu |
| `patience` | seconds a waiting customer will wait |
| `gap` | seconds between new customers |
| `maxItems`, `doubles` | items per order, and whether an item can appear twice |
| `queue` | extra cars waiting behind the window car (their orders are visible) |
| `extra` | adds the second grill and fryer (second oven in Pizza Place) |
| `burn` | seconds food may sit ready before it burns (0 = never) |

Station make times and the worker's speed are in the same file (`STATIONS`, `WORKER`). `node tools/sim.mjs` runs a bot on the Burger Joint levels and prints the average money and pass rate at different skill levels (efficiency 1 = a perfect bot, 0.5 = slow), which is how the goals were set: 1 star is easy for a young player, 3 stars needs a very sharp one.

## Tune endless mode

`ENDLESS` in `js/levels.js` is all data. `rows` is `[fromWave, maxItems, patience, gapMin, gapMax]`; each row applies until the next one. Past the last row, patience drops `patDecay` per wave to `minPatience`, and the gaps shrink by `gapDecay` to `minGap`. `friesWave`, `doublesWave`, `extraWave`, `burnWave` set when each mechanic switches on, `perWave` is customers per wave (`early` lists shorter first waves), `lives` the hearts, and `music` the playback-rate steps. A shop opts in with `endless: {}` in `js/shops.js` (`patMult` scales patience). Keep `maxItems` at 4 or less (the tray holds 4). Use the debug panel's Wave +1 / +5 buttons to test a wave. High scores are saved per shop id in `shops[id].endless`.

## Debug and secret tools

- **Debug overlay:** triple-tap the "Level N" (or "Wave N" in endless) label in a game. It shows fps and state, plus **Pass**, **Fail** and a **x1/x4/x10** speed button.
- **Unlock everything:** on the main menu, tap the "DRIVE THRU" title 5 times.
- **Checks:** `node tools/test-logic.mjs` (game rules, headless), `node tools/check-pwa.mjs` (PWA files and manifest).
- **Icons:** `python3 tools/make-icons.py` redraws the icons in `icons/` (needs Pillow).

## Testing on iPhone

1. Open the GitHub Pages URL in **Safari** (not an in-app browser).
2. Tap Share > **Add to Home Screen** > Add. Launch it from the new icon.
3. Check: it opens full-screen with the burger icon and the name "Drive Thru"; nothing is hidden by the notch or home bar; you cannot pinch-zoom, double-tap-zoom or scroll; the sound and music buttons at the top-left work and stay as you left them after closing the app.
4. Play a level: make an item, carry it, send an order, get paid. Pause, restart and switch levels a few times.
5. Turn on **airplane mode**, fully close the app and reopen it: it should still work.
6. Rotate the phone (a "rotate to portrait" message should show), lock and unlock it mid-level (the game should be paused, not racing ahead), and switch to another app and back.
7. After you deploy a new version, open the installed app twice; the **Tap to Update** banner should appear.

## Layout

    index.html, manifest.webmanifest, sw.js
    css/style.css
    js/main.js       boot, service worker, update banner
    js/screens.js    menu, level select, results
    js/game.js       gameplay screen and rules (stations, hands, trays)
    js/orders.js     cars, orders, patience, tips
    js/hospital.js   the hospital game mode
    js/scene.js      three.js world, models, camera
    js/levels.js     level table and tuning numbers
    js/shops.js      the four restaurants (foods, layouts, colours)
    js/audio.js      WebAudio music and sound effects
    js/save.js       localStorage progress
    lib/             three.js    audio/  music    icons/  app icons    tools/  scripts
