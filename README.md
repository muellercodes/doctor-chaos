# Doctor Chaos

A goofy 3D doctor game that runs in the browser. Game design by **Linus**.

> Five patients a day. One doctor. Zero medical degrees. Malpractice makes perfect.

## How it plays

Every day, 5 patients come into your exam room. Read their chart, pick the right tool, and fix them up:

| Tool | Mini-game |
| --- | --- |
| Tweezers | Drag the swallowed Lego / marble / earbud out through an X-ray tunnel without touching the walls |
| Syringe | Scrub the spot, line up the needle, push the plunger without going too fast |
| Blood Kit | Tie the band, find the big vein with the vein-finder light, fill the tube to the line |
| Scalpel | Sleepy-gas mask, trace the cut, drag out the angry appendix (or rubber duck) without bumping the grumpy organs, then stitch it up |
| Reflex Hammer | Bonk the knee with the right power. Too hard and it kicks you in the face |
| Stethoscope | Find the loudest heartbeat, then tap along with it |
| Cast | Pick a color, straighten the arm, wrap it in circles, sign it |

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

Progress saves after every patient, so you can leave in the middle of a day and pick up with the next patient. There are 54 achievements, from normal ones to completely absurd ones, and a settings screen (volumes, talking speed, graphics, screen shake, bigger text, full screen).

There are also secrets. A lot of them. Some are codes you type into Settings. We are not telling you where they are.

### Accounts and leaderboards

Players can make an account with just a username and a password (no email, nothing personal). An account gets you on two leaderboards (most money, most days played) and saves your progress in the cloud so you can switch devices. Usernames go through a bad-word filter.

### Phones

Turn the phone sideways. On Android the game offers a full screen button. iPhones don't let websites go full screen, so the game explains how to add it to the home screen, where it opens with no browser bars.

Rated about 12+: cartoony, some dark-ish jokes, nothing graphic.

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
  js/props.js    tools, swallowed objects, cartoon organs
  js/data.js     names, patients, jokes, lawsuits, reviews
  js/meta.js     settings, achievements, secret codes, accounts, leaderboards
  js/excuses.js  the pool of injury excuses (each one is used once per save)
  js/games/      one file per mini-game
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

Debug shortcut: `index.html?test=surgery` (or `removal`, `shot`, `blood`, `appendix`, `swallowed`, `reflex`, `steth`, `cast`, `runner`, `baby`, `sneezy`, `hider`, `scooter`, `germs`, `triplets`, `lightsout`) jumps straight to one patient. `index.html?lineup` shows a row of random patients.

## Hosting

- GitHub Pages serves the `docs/` folder from `main`.
- Cloudflare Pages: `npm install` then `npm run deploy`. This uploads the site plus the API function. The GitHub Pages copy talks to the API on `doctor-chaos.pages.dev`.
- First-time database setup: `npx wrangler@4 d1 create doctor-chaos-db`, put the id in `wrangler.toml`, then `npm run db:init`.
