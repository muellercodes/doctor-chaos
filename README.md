# Doctor Chaos

A goofy 3D doctor game that runs in the browser. Game design by **Linus**.

> Five patients a day. One doctor. Zero medical degrees. Malpractice makes perfect.

## How it plays

Every day, 5 patients come into your exam room. Read their chart (it lists the tools you will need), pick the right tool, and fix them up:

| Tool | Mini-game |
| --- | --- |
| Tweezers | Drag the swallowed Lego / marble / earbud out through an X-ray tunnel without touching the walls |
| Syringe | Scrub the spot, line up the needle, push the plunger without going too fast |
| Blood Kit | Tie the band, find the big vein with the vein-finder light, fill the tube to the line |
| Scalpel | Sleepy-gas mask, trace the cut, drag out the angry appendix (or rubber duck) without bumping the grumpy organs, then stitch it up |
| Reflex Hammer | Bonk the knee with the right power. Too hard and it kicks you in the face |
| Stethoscope | Find the loudest heartbeat, then tap along with it |
| Cast | Pick a color, straighten the arm, wrap it in circles, sign it |
| Thermometer | Pop it in the mouth, then shush the patient every time they try to talk |
| Pressure Cuff | Pump it into the green, then click on the very first heartbeat as the air lets out |
| Ear Scope | Look around inside the ear with a small circle of light and tap everything hiding in there |
| Eye Drops | One drop in each eye, timed between blinks |
| Bandage | Clean the scrape, squeeze on ointment, stick the bandage on straight |
| X-ray | Put the frame over the hurt spot and snap the picture while the patient holds still |

About every other day (on a random schedule, never a fixed rhythm) a special patient turns up with a mini-game of their own:

- **Runners** bolt out the door and turn the game into a 2D side-scrolling hallway chase.
- **Scooter thieves** steal a mobility scooter. Chase them down the hall in a wheelchair, top-down, dodging carts, puddles and nurses.
- **Germ Blaster**: a kid's cold is too strong, so you shrink down in the Micro-Sub and shoot the germs (and the King Germ).
- **Triplet Shuffle**: three identical kids, one is sick. Watch them swap places and pick the right one.
- **Lights Out**: a kid flips the lights off and hides. Find them in a dark maze with a flashlight and by listening for giggles.
- **Babies** have to be calmed down (rattle, peekaboo, silly faces) before you can sneak the shot in.
- **Sneezers** have to be blocked with your clipboard.
- **Hiders** disappear somewhere in the room.

There are also funny regulars: a vampire who needs a blood test, a pirate with a doubloon in his ear, a mime, an influencer, three kids in a trench coat, and more. No two patients ever give the same excuse for how they got hurt (blood draws are the exception).

Mess up badly and you get sued. How much depends on how bad it was. Money buys upgrades between days (steadier hands, a lawyer, running shoes, a lollipop jar, coat colors).

Max out every upgrade and you get promoted. There are 100 doctor jobs: 20 departments (Family Medicine, Pediatrics, the ER, Cardiology, the Eye Clinic, Surgery, Space Medicine, the Underwater Hospital, the Dinosaur Clinic, the Superhero Hospital and more), each with five ranks from Intern to Chief. Every promotion swaps in four brand new upgrades made for that job, and the old ones leave a small permanent bonus. Each department looks like its own place (wall colors, the sign on the door, a poster, the view out the window, the lighting, and props like hanging planets in Space Medicine, bubbles in the Underwater Hospital or a dinosaur egg in the Dinosaur Clinic), its patients dress the part (capes, snorkels, dino hoods, nightcaps), it sees more of its own kind of patient, and the ranks change the job (more patients with two problems, hospital inspectors, emergencies with a timer, six patients a day, a special patient every day).

At the 100th promotion the hospital turns into Doctor Burger. The exam room becomes a counter, Nurse Pat hands things over to Manager Pat, and the tools become a grill, a fryer, a soda fountain, a soft serve machine and a burger building station, each with its own mini-game. Ten more jobs go up to Burger Tycoon. Customers order out loud, one item at a time, and sometimes they say you got the order wrong. If they are right, they say what is wrong ("I said NO pickles!"); sometimes they are just picky. Manager Pat always sides with the customer: make it again, or say sorry and hand over a coupon. A job change part way through a day swaps the people still waiting for ones who fit the new job.

Days get a little harder as you go and the clinic has bills to pay at the end of each day. Progress saves after every patient, and the pause button has an option to go back to the main menu without losing anything. There are 71 achievements, from normal ones to completely absurd ones, and a settings screen (volumes, patient voices, talking speed, graphics, screen shake, bigger text, full screen).

Patients talk out loud with a steady voice each, and the voice changes with how they feel (scared, angry, happy, sleepy). They talk about what they came in for and react to what you are doing to them, make faces that match, and almost never say the same goodbye twice. Speech bubbles move up to a corner while you work, and a tap skips a line. The voices are recorded ahead of time with Kokoro, a free open-source voice model, so they sound the same on every phone and computer: one voice for each kind of person (kids, teens, grown-ups, grandparents, Nurse Pat), with the mood changing the pitch and pace. A line that has no recording yet uses the device's own text-to-speech. The music changes with what is going on.

Dragging is mistake-proof: a drag that ends on a button does not click it, and new buttons ignore taps for a moment after they appear. In the games where you aim first (vein finder, ear scope, needle, bandage, eye drops), a finger can drag to look or aim before anything happens: dragging the light never counts as a poke, and the needle, bandage and dropper go on when you let go.

There are also secrets. A lot of them. Some are codes you type into Settings. We are not telling you where they are.

### Accounts and leaderboards

Players can make an account with just a username and a password (no email, nothing personal). An account gets you on three leaderboards (most money earned in total, most days played, best job) and saves your progress in the cloud so you can switch devices. Usernames go through a bad-word filter. Each account keeps its own progress: making a second account starts a new game, and progress from playing without an account can be moved into a brand new account once.

One account has an admin panel. For any player (or itself) it can give or take money (gifts count toward money earned), set the bank, money earned or days played on the leaderboards, jump to any day, set the job, give or reset upgrades, unlock every award or secret code, start a player over, hide them from the leaderboards, send them a special patient as their next patient, turn silly modes on or off, send a cheer from a fixed list (no free typing), see their stats, set a new password when they forget theirs, log them out everywhere, or pause the account. For everyone at once it can give money and run events: pay boosts, Party Day, Big Head Day, Cat Day and Special Patient Day. Changes to a player's game wait on the server until that player's game picks them up.

### Phones

Turn the phone sideways. On Android the game offers a full screen button. iPhones don't let websites go full screen, so the game explains how to add it to the home screen, where it opens with no browser bars.

Rated about 12+: some dark-ish jokes, nothing graphic. All the pictures in the menus are drawn for the game (no emoji).

## Tech

Plain HTML/CSS/JavaScript ES modules plus [Three.js](https://threejs.org/) (vendored in `docs/js/vendor`). No build step. All sound is synthesized with Web Audio.

```
docs/            the whole site (served as-is)
  index.html
  css/style.css
  js/main.js     game flow: days, patients, scoring, lawsuits, shop
  js/engine.js   renderer, camera, input, tweens
  js/room.js     the exam room and hiding spots
  js/nav.js      walking paths around the furniture
  js/person.js   patients, nurse, babies
  js/face.js     sculpted heads, skin, eyes, hair, expressions
  js/speech.js   patient voices (recorded lines when present, device text-to-speech otherwise, with moods)
  js/audio.js    sound effects and the music sequencer
  js/props.js    tools, swallowed objects, cartoon organs
  js/data.js     names, patients, jokes, lawsuits, reviews, goodbyes
  js/step-talk.js what patients say before and after each procedure
  js/career.js   the 110 jobs, their upgrades and what each rank changes
  js/themes.js   what each department looks like (colors, posters, window, props, outfits)
  js/food-data.js Doctor Burger customers, orders and lines
  js/meta.js     settings, achievements, secret codes, accounts, leaderboards
  js/excuses.js  the pool of injury excuses (each one is used once per save)
  js/games/      one file per mini-game (food.js has the five kitchen games)
  voice/         recorded lines, one MP3 per sentence per voice, plus manifest.json
tools/voice/     scripts that find every line in the game and record it
```

Run locally with any static server (accounts won't work, everything else will):

```
cd docs && python3 -m http.server 8000
```

To run it with the accounts API too (uses a local test database):

```
npm install
npx wrangler@4 d1 execute doctor-chaos-db --local --file=schema.sql
npm run dev
```

```
functions/api/[[route]].js   accounts + leaderboard API (Cloudflare Pages Function)
schema.sql                   database tables (Cloudflare D1)
wrangler.toml                Cloudflare config, including the database binding
```

Debug shortcut: `index.html?test=surgery` (or `removal`, `shot`, `blood`, `appendix`, `swallowed`, `reflex`, `steth`, `cast`, `thermo`, `bp`, `otoscope`, `drops`, `bandage`, `xray`, `runner`, `baby`, `sneezy`, `hider`, `scooter`, `germs`, `triplets`, `lightsout`, and the kitchen games `grill`, `fryer`, `soda`, `sundae`, `assemble`) jumps straight to one patient. Add `&rank=37` to start at a given job. `index.html?lineup` shows a row of random patients (`?lineup=expr` with faces). Test pages stay silent (no voices).

### Recording voices

New or changed dialogue needs recording, or those lines use the device voice. Every sentence is recorded once per voice; clips that already exist are skipped.

```
pip install kokoro-onnx==0.6.1 soundfile        # also needs ffmpeg and Playwright
# put kokoro-v1.0.onnx and voices-v1.0.bin from
# github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0) in ~/kokoro_models
cd docs && python3 -m http.server 8765 &        # the harvest runs the game's own modules
cd .. && python3 tools/voice/static_lines.py && python3 tools/voice/harvest.py
python3 tools/voice/gen.py                      # slow: about real time on two CPU cores
python3 tools/voice/manifest.py
```

## Hosting

- GitHub Pages serves the `docs/` folder from `main`.
- Cloudflare Pages: `npm install` then `npm run deploy`. This uploads the site plus the API function. The GitHub Pages copy talks to the API on `doctor-chaos.pages.dev`.
- First-time database setup: `npx wrangler@4 d1 create doctor-chaos-db`, put the id in `wrangler.toml`, then `npm run db:init`.
- Database changes for an existing database live in `migrations/` (run each once with `npx wrangler@4 d1 execute doctor-chaos-db --remote --file=migrations/<file>`). If `--file` fails with an authentication error (it uses a separate import API), run the same SQL with `--command "$(grep -v '^--' migrations/<file>)"` instead. 0002, 0003 and 0004 are applied in production.
