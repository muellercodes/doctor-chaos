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

Some patients are special:

- **Runners** bolt out the door and turn the game into a 2D side-scrolling hallway chase.
- **Babies** have to be calmed down (rattle, peekaboo, silly faces) before you can sneak the shot in.
- **Sneezers** have to be blocked with your clipboard.
- **Hiders** disappear somewhere in the room.
- Plus a vampire who needs a blood test, a pirate with a doubloon in his ear, a mime, an influencer, three kids in a trench coat, and more.

Mess up badly and you get sued. How much depends on how bad it was. Money buys upgrades between days (steadier hands, a lawyer, running shoes, a lollipop jar, coat colors). Progress saves in the browser.

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
  js/person.js   patients, nurse, babies
  js/props.js    tools, swallowed objects, cartoon organs
  js/data.js     names, complaints, jokes, lawsuits, reviews
  js/games/      one file per mini-game
```

Run locally with any static server:

```
cd docs && python3 -m http.server 8000
```

Debug shortcut: `index.html?test=surgery` (or `removal`, `shot`, `blood`, `appendix`, `swallowed`, `reflex`, `steth`, `cast`, `runner`, `baby`, `sneezy`, `hider`) jumps straight to one patient.

## Hosting

- GitHub Pages serves the `docs/` folder from `main`.
- Cloudflare Pages: `npm run deploy` (uses `wrangler pages deploy docs`).
