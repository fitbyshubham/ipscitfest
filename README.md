# IPSC IT Fest 2026 — website

Static multi-page site for the IPSC IT Fest 2026, hosted by The Doon School,
Chandbagh, Dehradun, 8–10 December 2026.

No framework, no dependencies, no npm install. Node 18+ is the only requirement,
and only to run the generator.

```bash
node build.mjs          # renders ./site
python -m http.server 8787 --directory site
```

Then open <http://localhost:8787>.

## Layout

```
data/fest.mjs      every fact on the site — the single source of truth
build.mjs          the generator: renders ./site from data + assets
assets/fest.css    the design system
assets/fest.js     interaction and the event simulations
assets/people/     portraits, named <slug>.jpg (see the README in there)
assets/images/logos/  school crest, black and white; the pages use the -web cuts
site/              generated output — this is what you deploy
```

`site/` is disposable and regenerated on every build. Never edit it by hand:
edit `data/fest.mjs` and rebuild.

## Where things come from

Content is drawn from the committee's own documents, newest source winning:

| Source | Used for |
|---|---|
| Brochure sent to Heads of School (7 Sep 2026) | Event rules, judging, the 15 regulations, the closing date |
| MASTER DOC (Drive, 5 Sep 2026) | Committee, event heads, rubric weights, key dates |
| IPSC_Schedule (11 September draft, in `assets/event schedule/`) | The running order, arrival day onward. Kept out of `site/` |
| Headmaster's invitation letter (Drive, 29 Aug 2026) | Registration form, contacts, eligibility |

**Registration closes 25 September 2026.** An earlier brochure said 10 September;
the version circulated to Heads of School says the 25th, so that is what the site
carries. This is noted explicitly on the Registration sheet rather than quietly
resolved.

## Placeholders

Anything not yet decided is wrapped in `tbc('...')` in `data/fest.mjs`. It renders
as a visible `◆ TBC` marker on the page and is listed by the build:

```
42 placeholders still to fill:
   1. Edition number — is 2026 the 5th? 6th? …
```

Replace the `tbc(...)` call with the real value and rebuild. Nothing unverified
ships silently.

## Venue names — read this before adding any

The draft schedule is written in the school's own abbreviations. Only expansions
confirmed in writing are used on the site:

| Code | Status |
|---|---|
| BML | **BML Munjal Auditorium** — confirmed from school circulars |
| IT | **IT Centre** — as written in the schedule |
| CDH | abbreviation only. Used school-wide for the dining hall, but the expansion is not confirmed in writing, so the site does not assert one |
| AMC | abbreviation only. Unverified as a Chandbagh venue |

`VENUE_NOTES` in `data/fest.mjs` holds the placeholders. Fill them in from a
school source, not from what the letters look like they stand for.

## Event document packs

Each event page lists its full pack — six documents for robotics events, five for
the coding and machine-learning events, where a single Platform & Environment
Specification replaces the Robot and Arena Specifications. Every document gets a
row whether or not it exists yet: an unreleased one shows "Available soon"
instead of a download button, so a school can tell the difference between
a document that is missing and one that is merely not shown.

Add links in `EVENT_DOC_LINKS` in `data/fest.mjs`, keyed by event slug and
document number:

```js
'terra-incognita': { 1: 'https://drive.google.com/…', 4: 'https://…' },
```

The row turns into a live download button as soon as a link is present.

## The team sheet

`committee.html` carries the three Students-in-Charge and then the four
Masters-in-Charge, and nobody else — event heads appear on their own event
pages, where someone looking for them will be. Each person gets a landscape
portrait and a write-up of about 180 words, alternating side down the page.
The write-ups live in `PEOPLE[slug].bio`; while they are `tbc(...)` the page
draws ruled lines at the length the real text will run to.

## Portraits

Drop a square JPEG at `assets/people/<slug>.jpg`. The slugs are the keys of
`PEOPLE` in `data/fest.mjs`, and `node build.mjs` prints every one still missing
with the exact filename to use. Until a file exists the page draws a labelled
frame with the person's initials, so a missing portrait is visible rather than
blank. Photographs render greyscale and come to full colour on hover.

## Letters

The three Students-in-Charge letters live in `LETTERS` in `data/fest.mjs`. Each
has a `key` line (pulled out large), an `opening` (shown on the closed card) and
a `body`. While they are `tbc(...)` the card draws ruled lines in the shape the
real letter will take, so the opened layout is honest about itself. Paste the
text over the `tbc(...)` and the rules are replaced by the letter.

## The event simulations

Each event page carries a working model of its own event, written from scratch in
`assets/fest.js`:

- **Terra Incognita** — an occupancy-grid SLAM rover. It ranges as it drives,
  accumulates Gaussian odometry drift, and closes the loop when it recognises
  ground it has already mapped. Two paths are drawn: where it is, and where it
  believes it is.
- **Half-Life** — A* over the corridor network, with the search frontier drawn as
  it expands. Change the symbol rule and watch the re-plan cost.
- **Brinkmanship** — two bodies in a ring with real contact impulses, opening
  autonomous and switching to manual on the referee's signal.
- **The Black Box** — an interrogable confusion matrix over 30 unseen test
  images; spend the ten-image fix budget and the diagonal firms up.
- **Algorithm Challenge** — growth curves against input size on a log axis.

All of them pause when off screen, respect `prefers-reduced-motion`, and are
seeded so they look identical on every load.

## Deploying

`site/` is a plain static folder — Netlify, Vercel, GitHub Pages, or any school
web host. It includes `robots.txt` and `sitemap.txt`.

CSS and JS are fingerprinted (`fest.css?v=abc12345`) so a redeploy cannot serve
new markup against a cached stylesheet.

## Accessibility and support

Every page reads in full with JavaScript disabled. The command palette
(⌘K / Ctrl-K, or `/`) searches events, rules, dates, FAQ entries and people
across all 16 pages. Light and dark are both designed; the toggle is in the bar
and the preference persists.
