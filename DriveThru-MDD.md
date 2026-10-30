# Drive Thru: Master Design Document (MDD)

**Platform:** Mobile-first web game / PWA (iPhone primary, works in any modern browser)
**Build tool:** Claude Code in VS Code
**Hosting:** GitHub Pages (commit and push to deploy)
**Engine:** three.js (vendored locally) + vanilla HTML/CSS/JS, no build step
**Genre:** Simple 3D time-management / order-fulfillment game
**Session length:** 2 to 3 minutes per level

---

## 1. Concept

You are a fast food worker at a drive-thru window. Cars pull up and place orders (soda, burger, fries). Tap the item buttons at the bottom of the screen (soda, burger, fries, plus car and trash) to send your 3D worker around the kitchen to make items, carry them to the car, and send the order out before the customer loses patience. Earn enough money before the timer ends to pass the level and unlock the next.

**Design pillars**
1. **One-thumb simple.** One button per item, plus car and trash; no dragging, no gestures.
2. **Readable at a glance.** Icons and bars, almost no text during play.
3. **Feels like an app.** No zoom, no scroll or bounce, safe-area aware, installable.

---

## 2. Technical Requirements

### 2.1 Stack and project structure
- Plain HTML/CSS/JS with ES modules. No bundler.
- three.js vendored into `/lib/three.module.min.js` (no CDN, so the PWA works offline).
- All assets are code-generated: low-poly primitives for 3D, emoji or inline SVG for icons, WebAudio for sound. No external image or audio files required.

```
drive-thru/
├── index.html
├── manifest.webmanifest
├── sw.js                  # service worker (offline cache)
├── icons/                 # 180, 192, 512 px + maskable
├── css/style.css
├── lib/three.module.min.js
├── js/
│   ├── main.js            # boot, screen router
│   ├── screens.js         # menu, how-to, level select, results
│   ├── game.js            # game loop, state machine
│   ├── scene.js           # three.js scene, worker, stations, cars
│   ├── orders.js          # order generation, patience, payout
│   ├── levels.js          # level config table
│   ├── audio.js           # WebAudio music + SFX, toggles
│   └── save.js            # localStorage progress
└── README.md
```

### 2.2 GitHub Pages
- All paths **relative** (`./js/main.js`), since Pages serves from `/<repo>/`.
- `manifest.webmanifest` uses `"start_url": "./"` and `"scope": "./"`.
- Service worker registered with a relative path; cache name versioned (`drive-thru-v1`) so updates can be bumped on deploy.
- Deploy: commit, push to `main`, enable Pages (Settings > Pages > main / root).

### 2.3 iPhone / PWA behavior (must-haves)
**Viewport and no zoom**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Drive Thru">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta name="theme-color" content="#e63946">
```
- Block pinch and double-tap zoom: `touch-action: manipulation` on everything; JS `preventDefault()` on `gesturestart`, `gesturechange`, `gestureend`, and multi-touch `touchmove`.
- Block scroll and rubber-band bounce: `html, body { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none; }`
- Disable text selection, tap highlight, and long-press callout: `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;`
- Use `100dvh` (fallback `-webkit-fill-available`) so the Safari URL bar never causes layout jumps.

**Safe areas**
- Define CSS vars from `env(safe-area-inset-*)` and use them for all UI:
  - Top-left toggles and HUD: `padding-top: max(12px, env(safe-area-inset-top))`, `padding-left: max(12px, env(safe-area-inset-left))`
  - Bottom button bar: `padding-bottom: max(12px, env(safe-area-inset-bottom))` (clears the home indicator)
- The 3D canvas fills the whole screen edge-to-edge (behind the notch and home bar); **interactive UI never sits in the unsafe zones.**
- Handle portrait primarily. Landscape shows a "Rotate your phone" overlay (or lays out safely if simple).

**Rendering**
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, resize on `resize` / `orientationchange`.
- Pause loop and audio on `visibilitychange` (hidden).
- Target 60 fps on iPhone 11 or newer; keep triangle count low, no shadows or one cheap blob shadow.

**Audio on iOS**
- Create/resume `AudioContext` on the first user tap (Play button) to satisfy autoplay rules.

---

## 3. Screens and Flow

```
Main Menu ──Play──> Level Select ──tap level──> Gameplay ──> Results (Pass / Fail)
    └──How To──> Instructions (modal)             ▲              │
                                                   └── Retry / Next / Level Select
```

All screens: **Sound and Music toggles in the top-left** (inside the safe area). Two small round icon buttons (🔊 sound effects, 🎵 music); crossed-out when off. State persists in localStorage.

### 3.1 Main Menu
- Game title "DRIVE THRU" over a stylized 3D scene (idle worker, cars looping past the window).
- Large **PLAY** button.
- **HOW TO PLAY** button.
- Top-left: sound / music toggles.

### 3.2 How To Play
Simple modal, 3 to 4 swipe-free pages (Next / Back buttons), or one scroll-free card:
1. A car pulls up and shows its order above it.
2. Tap an item button (🥤 🍔 🍟) to walk to that station and start making it; wait for the progress bar, tap the same button again to pick it up.
3. Tap 🚗 to bring items to the car; tap the order bubble to send it out.
4. Wrong item? Tap 🗑️. Don't keep customers waiting or they drive off angry.
- Close (X) button. Top-left toggles remain visible.

### 3.3 Level Select
- Grid of level tiles (e.g. 2 columns x 5 rows, or a single scrollless 5x2 grid; no scrolling required for 10 levels).
- States per tile:
  - **Locked** (gray, 🔒)
  - **Current** (highlighted, pulsing; the highest unlocked level)
  - **Completed** (green, ✓, shows best earnings)
- Player may tap **any unlocked level** (current or any completed level) to play it.
- Only passing the current level unlocks the next.
- Back button (top-right of safe area or bottom).

### 3.4 Gameplay HUD
- **Top-left:** sound / music toggles (+ pause button next to them).
- **Top-center/right:** 💰 current money / goal (e.g. `$34 / $60`), ⏱️ time remaining. Goal bar fills as money grows.
- **Above the car:** order bubble (see 5.4) and patience bar.
- **Bottom:** item, car, and trash buttons (see 4).

### 3.5 Pause
Resume, Restart, Level Select. Timers freeze.

### 3.6 Results
- **Pass:** "Level Complete!", earnings, orders served, orders lost; buttons: Next Level, Replay, Level Select.
- **Fail:** "Shift Over", earnings vs goal; buttons: Try Again, Level Select.
- Saves progress on pass.

---

## 4. Controls

Large, evenly spaced buttons across the bottom, one per item plus car and trash (min 56x56 pt touch targets, ideally 64x64, inside the bottom safe area). Single taps only.

| Button | Icon | Action |
|---|---|---|
| Soda | 🥤 | Worker walks to the soda machine and starts filling a cup (progress bar). Tap again to pick up the cup when done. |
| Burger | 🍔 | Worker walks to the grill and starts a burger (progress bar). Tap again when ready to pick it up. |
| Fries | 🍟 | Worker walks to the fryer and starts fries (progress bar). Tap again when ready to pick them up. Unlocks at Level 3 (hidden on Levels 1 and 2). |
| Car | 🚗 | Worker walks to the window and hands over all held items that match the order. |
| Trash | 🗑️ | Worker walks to the bin and throws away whatever he is holding (or the oldest held item). |

Each item has its own dedicated button, so one tap always means one specific station. The bar shows 4 buttons on Levels 1 and 2 (🥤 🍔 🚗 🗑️) and 5 buttons from Level 3 on (🥤 🍔 🍟 🚗 🗑️), evenly spaced. On the narrowest iPhones, keep every button at least 56x56 pt.

**Other tap targets**
- **Order bubble above the car:** when all items are delivered, it glows; tap it to send the order out (car drives away, money paid).
- Active button is highlighted; buttons are disabled with a subtle shake while the worker is mid-walk (or taps queue one action; see 5.2).

---

## 5. Gameplay Rules

### 5.1 Core loop
1. A car pulls up to the window; its order appears above it.
2. Player makes each item, carries it to the car, then sends out the order.
3. Money is paid on correct completion; the next car arrives after a short gap.
4. Reach the money goal before time runs out to pass.

### 5.2 Worker
- 3D low-poly worker (paper hat, apron) on a fixed set of waypoints between stations: **Kitchen, Soda Machine, Window, Trash**.
- Walks at constant speed along a short path; walking takes ~0.5 to 1 s.
- Hands carry up to **2 items** (shown as small models in hands). If hands are full, further pickups are blocked (button shakes).
- Tapping a new button mid-walk redirects to the new station (no queue), keeping it responsive.
- Production continues at a station while the worker is away (progress bar keeps filling; the finished item waits ready, with a small "ready" ding, until picked up. Food burns if left too long in later levels, optional, see 9). Burnt food must be picked up and thrown in the bin; the machine then stays idle until the player taps it again.

### 5.3 Stations
| Station | Makes | Time (base) | Notes |
|---|---|---|---|
| Soda machine | Soda cup | 2.0 s | Fill bar while worker stands there |
| Grill | Burger | 4.0 s | Progress bar above grill |
| Fryer | Fries | 4.0 s | Introduced at Level 3 |

Station timers can be scaled per level (see 6).

### 5.4 Orders and customers
- Order bubble shows item icons (e.g. 🥤🍔), checked off as delivered.
- **Items and prices:** Soda $2, Burger $4, Fries $3. Tip bonus up to +50% for quick service (patience bar still green).
- Each car has a **patience bar** (green > yellow > red) that starts when the car arrives.
- **Delivering:** tapping 🚗 hands over any held item that matches an unfilled slot; non-matching items stay in hand.
- **Sending:** tap the glowing order bubble once complete: coin pop-up, cash sound, car drives off happily.
- **Sending incomplete:** not allowed (bubble not tappable until complete).
- **Angry:** if patience hits zero, the car shows 😡, honks, and drives off. No payment and a small penalty (`-$2`, never below $0 total) and a combo/tip reset.
- Wrong items are handled by 🗑️ (no penalty, just time lost).

### 5.5 Win / lose
- **Pass:** money >= goal when the timer ends (or immediately upon reaching the goal; recommended: end early with "Goal reached!" bonus option, or let the clock run; default is play until timer ends so score can exceed goal).
- **Fail:** money < goal at timer end.
- Optional later: 1 to 3 stars by money thresholds (goal / 1.5x / 2x).

---

## 6. Levels

10 levels at launch, 2 to 3 minute shifts. Pass the current level to unlock the next.

| Lvl | Time | Goal | Items | Patience | Car gap | Notes |
|---|---|---|---|---|---|---|
| 1 | 120 s | $30 | Soda, Burger | 35 s | 5 s | Tutorial hints on screen |
| 2 | 120 s | $45 | Soda, Burger | 32 s | 4 s | Orders of 1 or 2 items |
| 3 | 130 s | $60 | + Fries | 32 s | 4 s | Fryer and 🍟 button introduced |
| 4 | 140 s | $80 | Soda, Burger, Fries | 30 s | 3.5 s | Orders up to 3 items |
| 5 | 150 s | $100 | Same | 28 s | 3 s | Double-quantity orders (2 burgers) |
| 6 | 150 s | $120 | Same | 26 s | 3 s | Faster pace |
| 7 | 160 s | $145 | Same | 24 s | 2.5 s | Larger orders |
| 8 | 170 s | $170 | Same | 22 s | 2.5 s | Food burns if left too long |
| 9 | 180 s | $200 | Same | 20 s | 2 s | Rush hour |
| 10 | 180 s | $240 | Same | 18 s | 2 s | Final shift |

Values live in `levels.js` as plain data so they are easy to tune. Targets should be reachable with ~70% efficiency on early levels; playtest and adjust.

---

## 7. Art Direction (3D)

- **Style:** bright, cartoony low-poly, flat-shaded colors (red/yellow fast food palette, sky blue background).
- **Camera:** fixed, slightly elevated three-quarter view of the kitchen interior on one side and the drive-thru window opening onto the car lane on the other. No player camera control.
- **Models (all built from three.js primitives):** worker, grill, fryer, soda machine, trash bin, counter, window frame, 3 to 4 car variants (different colors), item props (cup, burger, fries box).
- **Animation:** worker walk bob, simple arm raise on pickup, car slide in/out, progress bar sprites, coin pop-ups.
- **Lighting:** one ambient + one directional light; optional blob shadows.
- **UI:** chunky rounded buttons with big icons, high contrast, bouncy press animation.

---

## 8. Audio

All generated with WebAudio (no files needed), with simple on/off for each:
- **Music (toggle):** short looping upbeat chiptune/lo-fi loop; quieter during results.
- **SFX (toggle):** button tap, walk step, sizzle/fill loop, item-ready ding, hand-over pop, cash register ka-ching, angry honk, level pass fanfare, fail sad tone.
- Toggles are in the top-left on every screen, persisted in localStorage, and honor iOS autoplay (start on first tap).
- Music and SFX pause when the app goes to background.

---

## 9. Optional / Future

- Burn timer on food (Level 8+), "ready" glow.
- Stars per level, daily challenge. (Endless mode is built, see section 13.)
- Customer variety (impatient, big tipper).
- Extra items (shake, nuggets) with a station swap button.
- Haptics via `navigator.vibrate` where supported.
- Leaderboard (would need a backend, out of scope for v1).

---

## 10. Save Data (localStorage)

```json
{
  "version": 1,
  "highestUnlocked": 1,
  "bestMoney": { "1": 0 },
  "sound": true,
  "music": true
}
```
Wrap reads and writes in try/catch; fall back to defaults.

---

## 11. Build Plan for Claude Code

1. **Scaffold:** `index.html`, CSS with safe-area vars, no-zoom/no-scroll rules, manifest, service worker, icons, git repo, GitHub Pages deploy.
2. **Screen router:** Main Menu, How To, Level Select with locked/current/completed states, localStorage save.
3. **Audio module:** toggles top-left, iOS unlock, placeholder SFX and music.
4. **three.js scene:** kitchen, stations, window, car lane, fixed camera, resize handling.
5. **Worker movement:** waypoints, walking tween, hand items.
6. **Stations and buttons:** soda, burger, fries, car, trash logic with progress bars (fries button hidden until Level 3).
7. **Orders and cars:** spawn, order bubble, patience, deliver, send, angry exit, payout.
8. **Level system:** config table, timer, goal tracking, pass/fail, results screen, unlock next.
9. **Polish:** animations, particles, juice, difficulty tuning, pause menu.
10. **PWA QA:** test on a real iPhone via "Add to Home Screen".

---

## 12. Acceptance Checklist

- [ ] Installs from Safari "Add to Home Screen" and launches full-screen with correct icon and name.
- [ ] Pinch zoom, double-tap zoom, page scroll, and overscroll bounce are all impossible.
- [ ] No UI hidden by the notch/Dynamic Island or home indicator in portrait.
- [ ] Sound and music toggles at top-left on every screen; persist across launches.
- [ ] Play > Level Select; only Level 1 unlocked on first run.
- [ ] Passing a level unlocks the next; completed levels are replayable; current level selectable.
- [ ] Separate 🥤 🍔 🍟 buttons each go to their own station (🍟 appears from Level 3).
- [ ] Full loop works: make soda and food, carry to car, send order, get paid.
- [ ] Trash button discards held items.
- [ ] Customers get angry and leave if patience runs out.
- [ ] Level ends at timer; pass/fail correct against the money goal.
- [ ] Works offline after the first load.
- [ ] Holds ~60 fps on a modern iPhone; no console errors.

---

## 13. Endless Mode

**Always available.** Never locked and independent of level progress. Each shop that lists `endless: {}` in `shops.js` (Burger Joint, Coffee Shop) gets a purple "∞ ENDLESS" tile on its Level Select screen, after Level 10 (full-width last row, no scrolling). The tile shows the shop's best money and wave once there is one. Pizza Place and Hospital have different mechanics and no endless tile yet.

**Rules**
- Same scene, controls, stations, orders, prices and tip system as the levels. No timer, no money goal.
- Starts like Level 1 to 2 (soda and burger, 1 item). The fryer is hidden until wave 3, then pops in. The second grill and fryer and food burning arrive at wave 8.
- One car at the window at a time; from wave 6, 1 car waits behind it, and from wave 10, 2 (orders of waiting cars are visible, `ENDLESS.queue`). After a car leaves (happy or angry) the next arrives after a random gap between `gapMin` and `gapMax`.
- 3 lives (hearts in the HUD where the timer sits). A customer who drives off angry costs one life (heart breaks, short shake, `heartBreak` sound). Sending an order never costs a life. There is no -$2 penalty in endless. At 0 lives: game over (after a 1.4 s beat).
- Waves 1 and 2 take 3 customers each, every later wave takes 5 (`ENDLESS.early`, `ENDLESS.perWave`). HUD label "Wave N" (top right); a "Wave up!" banner and `waveUp` sound on each change. Music playback rate rises slightly at waves 10 and 15.
- Pause freezes arrivals, patience, station and burn timers. Hiding the app (phone lock, app switch) opens the pause menu, so coming back never costs lives. Restart, Play Again and leaving rebuild or dispose the whole world, so nothing carries over.

**Ramp** (`ENDLESS.rows` in `levels.js`; Coffee Shop patience x1.2)

| Wave | Items | Max items | Doubles | Patience | Gap (random) | Extra |
|---|---|---|---|---|---|---|
| 1 | Soda, Burger | 1 | no | 38 s | 1.0-2.0 s | |
| 2 | Soda, Burger | 2 | no | 36 s | 1.0-2.0 s | |
| 3 | + Fries | 2 | no | 38 s | 1.2-2.4 s | Fryer pops in |
| 4 | Same | 3 | no | 38 s | 2.0-3.6 s | |
| 5 | Same | 3 | no | 36 s | 1.8-3.4 s | |
| 6 | Same | 3 | yes | 35 s | 1.7-3.2 s | 1 car queues |
| 7 | Same | 3 | yes | 34 s | 1.6-3.0 s | |
| 8 | Same | 4 | yes | 34 s | 1.5-2.8 s | 2nd grill + fryer, food burns after 12 s |
| 9 | Same | 4 | yes | 33 s | 1.4-2.6 s | |
| 10 | Same | 4 | yes | 32 s | 1.3-2.4 s | 2 cars queue |
| 11+ | Same | 4 | yes | -1.2 s per wave, floor 18 s | gaps shrink 0.05 / 0.08 per wave, floors 0.8 / 1.6 s | |

Orders never exceed 4 items (the tray holds 4) and an item repeats at most twice, so the worst order (for example 2 burgers, 2 fries) is about 13 s of work with two grills and two fryers; the 18 s patience floor keeps every order possible. Station times are unchanged. Roughly wave 15 to 20 (patience 20 to 26 s) is very hard for a good player.

**Scoring and game over**
- A run tracks money earned, customers served and wave reached.
- "Shop Closed!" screen: this run's three numbers, the previous best for each (or a "New best!" badge when beaten), and buttons Play Again, Level Select, Main Menu.

**Save data** (per shop id, inside `shops[id]`; missing fields default to 0, so old saves keep working)

```json
"shops": { "burger": { "highestUnlocked": 3, "bestMoney": {}, "stars": {},
  "endless": { "bestMoney": 120, "bestServed": 31, "bestWave": 7 } } }
```

**Debug panel** (triple-tap the "Wave N" label): shows lives, wave, served, customers until the next wave, and the live ramp values (max items, doubles, patience, gap, burn). Buttons: Wave +1, Wave +5 (jumps ahead), -Life, +$50, speed.
