#!/usr/bin/env node
/* ============================================================================
   IPSC IT FEST 2026 — STATIC SITE GENERATOR
   Zero dependencies. `node build.mjs` renders ./site from ./data + ./assets.

   Why a generator rather than nineteen hand-written files: every page shares a
   rail, a bar, a drawer, a footer and a command palette, and every fact comes
   from one data file. Hand-editing nineteen copies of that chrome is how a
   site drifts out of sync with itself before it ever ships.
   ========================================================================== */

import { mkdir, writeFile, copyFile, rm, readdir, readFile } from 'node:fs/promises';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import {
  CONFIG, NAV, EVENTS, RULES, SCHEDULE, SCHEDULE_CONFLICTS,
  VENUES, MILESTONES, COMMITTEE, RESOURCES, FAQ, CHANDBAGH,
  TBC_REGISTRY, PEOPLE, EVENT_STAFF, TEAM, LETTERS,
  EVENT_DOCS, EVENT_DOC_LINKS, WELCOME,
} from './data/fest.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'site');

/* Asset fingerprint. School and institutional hosting caches stylesheets hard;
   without this a redeploy ships new markup against last week's CSS. Set at the
   start of build() from the actual file contents. */
let STAMP = 'dev';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const isTbc = (v) => v && typeof v === 'object' && '__tbc' in v;

/** Renders a value that may be a tbc() placeholder. */
const val = (v) => isTbc(v)
  ? `<span class="tbc" title="${esc(v.__tbc)}">To be announced</span>`
  : esc(v);

/** Plain-text form of a value, for meta tags and the search index. */
const plain = (v) => isTbc(v) ? 'TBC' : String(v);

const attr = (o) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== false && v !== null)
  .map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join('');

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

/* The school crest, in both inks. The stylesheet shows one and hides the other
   by the same rules that swap the colour tokens, so it follows the theme toggle
   as well as the system setting. The school is named in text wherever this
   sits, so the image itself is decorative. The -web files are trimmed, 360px
   tall cuts of the 6000px masters beside them. */
const crest = (up, className = '') => `<span class="crest${className ? ` ${className}` : ''}" aria-hidden="true">
        <img class="crest-light" src="${up}assets/images/logos/BlackSchoolLogo-web.png" alt="" width="224" height="360" decoding="async" />
        <img class="crest-dark" src="${up}assets/images/logos/WhiteSchoolLogo-web.png" alt="" width="224" height="360" decoding="async" />
      </span>`;

/* ── Search index (fed to the command palette) ───────────────────────────── */

const INDEX = [];
const idx = (t, u, { g = 'Pages', r = '', b = '', top = false } = {}) =>
  INDEX.push({ t, u, g, r, b: b.slice(0, 130), top });

/* ── Chrome ──────────────────────────────────────────────────────────────── */

const sheetOf = (slug) => NAV.find((n) => n.slug === slug)?.sheet ?? '';

/* The rail carries the names, not only the numbers. It opens on hover or
   keyboard focus and pins if the reader would rather it stayed open. */
function rail(slug) {
  const links = NAV.filter((n) => n.nav !== false).map((n) => `
        <a class="rail-link" href="${n.slug}.html"${n.slug === slug ? ' aria-current="page"' : ''}>
          <span class="ref">${n.sheet}</span>
          <span class="rail-name">${esc(n.title)}</span>
          <span class="tick"></span>
        </a>`).join('');
  return `
  <aside class="rail" id="rail" aria-label="Site navigation">
    <a class="rail-mark" href="index.html">IPSC IT Fest</a>
    <nav class="rail-nav">${links}</nav>
    <div class="rail-foot">
      <span class="rail-pos">${sheetOf(slug)}</span>
    </div>
  </aside>`;
}

function drawer(slug) {
  const links = NAV.filter((n) => n.nav !== false).map((n) =>
    `      <a href="${n.slug}.html"${n.slug === slug ? ' aria-current="page"' : ''}>${esc(n.title)} <em>${n.sheet}</em></a>`
  ).join('\n');
  return `
  <div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menu">
    <button class="drawer-close" id="drawerClose">Close</button>
${links}
  </div>`;
}

function bar(slug, up = '') {
  const here = NAV.find((n) => n.slug === slug);
  return `
    <header class="bar">
      <a class="bar-mark" href="index.html">${crest(up)}IPSC IT Fest <span>26</span></a>
      ${here ? `<p class="bar-where"><b>${esc(here.title)}</b></p>` : ''}
      <div class="bar-right">
        <span class="bar-date">${esc(CONFIG.dates.label)} &middot; ${esc(CONFIG.venue.school)}</span>
        <button class="bar-icon" data-cmdk-open type="button" aria-label="Search the site">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.3-4.3"/></svg>
          <span class="bar-icon-t">Search</span><kbd>&#8984;K</kbd>
        </button>
        <button class="bar-icon" id="themeBtn" type="button" aria-label="Switch theme">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>
          <span class="bar-icon-t">Dark</span>
        </button>
        <button class="bar-menu" id="menuBtn" type="button" aria-expanded="false" aria-controls="drawer">Menu</button>
      </div>
    </header>`;
}

function palette() {
  return `
  <div class="cmdk" id="cmdk" hidden role="dialog" aria-modal="true" aria-label="Search">
    <div class="cmdk-panel">
      <div class="cmdk-field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.3-4.3"/></svg>
        <input class="cmdk-input" id="cmdkInput" type="text" role="combobox" aria-expanded="true"
               aria-controls="cmdkResults" aria-autocomplete="list" autocomplete="off" spellcheck="false"
               placeholder="Search events, rules, dates, people&hellip;" />
        <span class="cmdk-esc">Esc</span>
      </div>
      <div class="cmdk-results" id="cmdkResults" role="listbox" aria-label="Results"></div>
      <div class="cmdk-foot">
        <span class="annot">&#8593;&#8595; navigate</span>
        <span class="annot">&#8629; open</span>
        <span class="annot">&#8984;K or / anywhere</span>
      </div>
    </div>
  </div>`;
}

function strip() {
  return `
    <aside class="strip">
      <p class="strip-msg">Registration closes <strong>${esc(CONFIG.registration.closesLabel)}</strong>. Schools forward an event-wise participant list by that date. <a href="registration.html">How to enter</a></p>
      <p class="strip-count" data-countdown="${CONFIG.registration.closesISO}" data-past="Registration closed">&nbsp;</p>
    </aside>`;
}

function footer(up = '') {
  const v = CONFIG.venue;
  const navLinks = NAV.filter((n) => n.nav !== false)
    .map((n) => `<li><a href="${n.slug}.html">${esc(n.title)}</a></li>`).join('');
  const eventLinks = EVENTS.slice(0, 8)
    .map((e) => `<li><a href="events/${e.slug}.html">${esc(e.brand)}</a></li>`).join('');
  const people = CONFIG.contact.people
    .map((p) => `<li><span>${esc(p.name)} &middot; ${esc(p.phone)}</span></li>`).join('');
  return `
  <footer class="foot">
    <div class="foot-grid">
      <div>
        ${crest(up, 'crest--foot')}
        <p class="foot-mark">IPSC IT Fest <span>2026</span></p>
        <p class="foot-addr">
          ${esc(v.school)}, ${esc(v.campus)}<br>
          ${esc(v.street)}, ${esc(v.city)}<br>
          ${esc(v.state)} ${esc(v.pin)}, ${esc(v.country)}<br>
          Tel ${esc(v.tel)}
        </p>
        <p class="foot-addr"><a href="mailto:${esc(CONFIG.contact.email)}">${esc(CONFIG.contact.email)}</a></p>
      </div>
      <div>
        <h2>Explore</h2>
        <ul>${navLinks}</ul>
      </div>
      <div>
        <h2>Events</h2>
        <ul>${eventLinks}</ul>
      </div>
      <div>
        <h2>Enquiries</h2>
        <ul>${people}</ul>
        <h2 style="margin-top:18px">Host</h2>
        <ul><li><span>${esc(CONFIG.contact.headmaster.name)}</span></li>
            <li><span>${esc(CONFIG.contact.headmaster.role)}</span></li></ul>
      </div>
    </div>
    <div class="foot-bottom">
      <p class="annot">${esc(CONFIG.society.copyright)} &middot; ${esc(CONFIG.society.line)}</p>
      <p class="annot">CIN ${esc(CONFIG.society.cin)}</p>
    </div>
  </footer>`;
}

/* ── Page shell ──────────────────────────────────────────────────────────── */

/* Previous and next sheet, spelled out. A reader who arrives on one page
   should be able to walk the whole set without going back to a menu. */
function pagenav(slug) {
  const i = NAV.findIndex((n) => n.slug === slug);
  if (i < 0) return '';
  const prev = NAV[(i - 1 + NAV.length) % NAV.length];
  const next = NAV[(i + 1) % NAV.length];
  const cell = (n, dir) => `
      <a href="${n.slug}.html">
        <p class="pn-k">${dir}</p>
        <p class="pn-t">${esc(n.title)}</p>
        <p class="pn-d">${esc(NAV_BLURB[n.slug] || '')}</p>
      </a>`;
  return `
    <nav class="pagenav" aria-label="Page navigation">
      ${cell(prev, 'Previous')}
      ${cell(next, 'Next')}
    </nav>`;
}

/* One line saying what each sheet holds — so the link is a promise, not a
   label. This is the fix for a nav that only showed numbers. */
const NAV_BLURB = {
  index: 'The fest at a glance, the eight events, and the key dates.',
  events: 'All eight events, their rules, judging and participant counts.',
  schedule: 'The running order from arrival day through three days of competition.',
  registration: 'Who may enter, what the form asks for, and the closing date.',
  rules: 'The fifteen clauses circulated to Heads of School.',
  resources: 'The brochure, the registration form, and the documentation still to come.',
  committee: 'The masters and students running the fest, and every event head.',
  chandbagh: 'The campus, the four working spaces, and how to reach Dehradun.', // archived page
  faq: 'Registration, travel, equipment, internet access and judging.',
};

function shell({ slug, title, description, body, depth = 0, bodyClass = '', nav = true }) {
  const up = depth ? '../' : '';
  const railHtml = rail(slug).replace(/href="(?!http|mailto|#)/g, `href="${up}`);
  const drawerHtml = drawer(slug).replace(/href="(?!http|mailto|#)/g, `href="${up}`);
  const barHtml = bar(slug, up).replace(/href="(?!http|mailto|#)/g, `href="${up}`);
  const stripHtml = strip().replace(/href="(?!http|mailto|#)/g, `href="${up}`);
  const footHtml = footer(up).replace(/href="(?!http|mailto|#)/g, `href="${up}`);
  const navHtml = nav ? pagenav(slug).replace(/href="(?!http|mailto|#)/g, `href="${up}`) : '';

  const indexJson = JSON.stringify(INDEX.map((i) => ({ ...i, u: up + i.u })));

  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="theme-color" content="#EEF0EA" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#121A18" media="(prefers-color-scheme: dark)" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="en_IN" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="${up}assets/fest.css?v=${STAMP}" />
<link rel="icon" href="${up}assets/mark.svg" type="image/svg+xml" />
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
${railHtml}
${drawerHtml}
<div class="shell">
${barHtml}
  <main id="main">
${body}
${navHtml}
  </main>
${stripHtml}
${footHtml}
</div>
${palette()}
<script>window.FEST_INDEX=${indexJson};</script>
<script src="${up}assets/fest.js?v=${STAMP}" defer></script>
</body>
</html>
`;
}

/* ── Shared page fragments ───────────────────────────────────────────────── */

function phead({ slug, sheet, kicker, title, lede, crumb }) {
  return `
    <section class="phead">
      <div class="phead-top">
        <p class="annot">${crumb || esc(kicker)}</p>
        <p class="annot">${esc(CONFIG.venue.school)} &middot; ${esc(CONFIG.dates.label)}</p>
      </div>
      <h1 class="h-page">${title}</h1>
      ${lede ? `<p class="lede phead-lede">${lede}</p>` : ''}
    </section>`;
}

/* Static plan schematics — one per event, in the language of an arena drawing.
   These are the same marks a referee's plan view would carry. */
const PLANS = {
  'terra-incognita': `<path class="pl-faint" d="M8 8 H112 V76 H8 Z"/>
      <path class="pl-sig" data-draw d="M18 68 L18 16 L34 16 L34 68 L50 68 L50 16 L66 16 L66 68 L82 68 L82 16 L98 16 L98 68"/>
      <rect class="pl-fill" data-pop x="38" y="30" width="12" height="10"/>
      <rect class="pl-fill" data-pop x="70" y="46" width="10" height="12"/>`,
  'half-life': `<path class="pl-faint" d="M8 8 H112 V76 H8 Z"/>
      <rect class="pl-line" data-draw x="86" y="12" width="24" height="16"/>
      <rect class="pl-line" data-draw x="86" y="34" width="24" height="16"/>
      <rect class="pl-line" data-draw x="86" y="56" width="24" height="16"/>
      <path class="pl-sig" data-draw d="M14 42 H52 L64 20 H82"/>
      <rect class="pl-sigfill" data-pop x="10" y="38" width="9" height="9"/>`,
  'build-different': `<path class="pl-faint" d="M8 8 H112 V76 H8 Z M60 8 V76 M8 42 H112"/>
      <circle class="pl-line" data-draw cx="24" cy="34" r="9"/>
      <circle class="pl-sig" data-draw cx="24" cy="58" r="6"/>
      <path class="pl-line" data-draw d="M50 62 H70 M53 62 V50 H67 V62 M57 50 V40 H63 V50"/>
      <path class="pl-sig" data-draw d="M94 34 q0 -8 6 -8 q6 0 6 7 q0 5 -6 7 v4 M100 58 v3"/>`,
  brinkmanship: `<circle class="pl-line" data-draw cx="60" cy="42" r="32"/>
      <circle class="pl-faint" cx="60" cy="42" r="27"/>
      <rect class="pl-fill" data-pop x="44" y="36" width="13" height="12"/>
      <rect class="pl-sigfill" data-pop x="63" y="36" width="13" height="12"/>
      <path class="pl-sig" data-draw d="M84 42 H106 M100 36 l6 6 l-6 6"/>`,
  hackathon: `<circle class="pl-line" data-draw cx="18" cy="20" r="7"/>
      <circle class="pl-line" data-draw cx="18" cy="42" r="7"/>
      <circle class="pl-line" data-draw cx="18" cy="64" r="7"/>
      <path class="pl-faint" d="M25 20 H50 V42 H25 M25 42 H50 M25 64 H50 V42"/>
      <rect class="pl-sig" data-draw x="62" y="28" width="44" height="28"/>
      <path class="pl-sig" data-draw d="M70 48 v-8 M80 48 v-14 M90 48 v-5 M98 48 v-11"/>`,
  'it-quiz': `<path class="pl-faint" d="M8 8 H112 V76 H8 Z"/>
      <path class="pl-line" data-draw d="M44 18 H56 V42 H72 M44 50 H56 M44 66 H56 V42"/>
      <circle class="pl-sigfill" data-pop cx="92" cy="42" r="11"/>
      <path class="pl-sig" data-draw d="M78 60 H106 M92 53 v7"/>`,
  'algorithm-challenge': `<rect class="pl-line" data-draw x="38" y="8" width="44" height="14"/>
      <path class="pl-line" data-draw d="M60 22 V32"/>
      <path class="pl-sig" data-draw d="M60 32 L82 46 L60 60 L38 46 Z"/>
      <path class="pl-line" data-draw d="M60 60 V70 M38 46 H16 V70 H40"/>
      <rect class="pl-line" data-draw x="44" y="70" width="32" height="10"/>`,
  'the-black-box': `<rect class="pl-line" data-draw x="12" y="14" width="18" height="18"/>
      <rect class="pl-line" data-draw x="34" y="14" width="18" height="18"/>
      <rect class="pl-line" data-draw x="12" y="36" width="18" height="18"/>
      <rect class="pl-line" data-draw x="34" y="36" width="18" height="18"/>
      <path class="pl-sig" data-draw d="M36 16 l14 14 M50 16 l-14 14 M14 38 l14 14 M28 38 l-14 14"/>
      <path class="pl-faint" d="M56 34 H74"/>
      <rect class="pl-line" data-draw x="80" y="20" width="28" height="28"/>
      <path class="pl-sig" data-draw d="M86 62 H102 M94 55 v7"/>`,
};

const plan = (slug) => `
        <div class="arena-plan">
          <svg viewBox="0 0 120 84" role="img" aria-label="Plan view schematic">
            ${PLANS[slug] || ''}
          </svg>
        </div>`;

/* ── People ──────────────────────────────────────────────────────────────────
   Portraits are optional at build time and mandatory at read time: the frame
   always draws, and a photograph covers it if one exists. Drop a JPEG at
   assets/people/<slug>.jpg and it appears with no other change. */

const person = (slug) => PEOPLE[slug] || { name: slug, role: '' };

/* Which portraits exist, decided once at build time. A person without one
   gets the drawn frame and no <img> at all, so the page never requests a
   photograph that is not there. Run tools/portraits.py to add more. */
const PORTRAIT_DIR = join(ROOT, 'assets', 'people');
const HAS_PORTRAIT = new Set(existsSync(PORTRAIT_DIR)
  ? readdirSync(PORTRAIT_DIR).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4))
  : []);

/* Everyone the site actually shows. The portrait report is about these, not
   about every name that happens to sit in the registry. */
const SHOWN = new Set([
  ...TEAM.flatMap((g) => g.slugs),
  ...LETTERS.map((l) => l.slug),
  ...Object.values(EVENT_STAFF).flatMap((s) => [...s.heads, ...s.deps]),
]);

const initials = (name) => plain(name)
  .replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '')
  .split(/\s+/).filter(Boolean).slice(0, 2)
  .map((w) => w[0]).join('').toUpperCase() || '?';

function portrait(slug, { up = '', className = '' } = {}) {
  const p = person(slug);
  const name = plain(p.name);
  return `<figure class="mug ${className}">
        <span class="mug-frame">
          <span class="mug-ph" aria-hidden="true">
            <span class="mug-init">${esc(initials(p.name))}</span>
            <span class="annot">Portrait</span>
          </span>
          ${HAS_PORTRAIT.has(slug)
            ? `<img src="${up}assets/people/${esc(slug)}.jpg" alt="${esc(name)}" width="800" height="1000" loading="lazy" decoding="async" />`
            : ''}
        </span>
      </figure>`;
}

/* A write-up that has not been supplied yet still has to occupy the space the
   real one will, at roughly the length it will run to — otherwise the page
   lies about its own proportions. Ruled lines, sized to about 180 words. */
const ruled = (lines) => `<div class="rule-lines" aria-hidden="true">${'<i></i>'.repeat(lines)}</div>`;

/** A person on the team sheet: landscape portrait beside a full write-up. */
function bioRow(slug, { up = '' } = {}) {
  const p = person(slug);
  const meta = [p.code, p.form, p.note].filter(Boolean).map(esc).join(' &middot; ');
  return `
        <article class="bio">
          <div class="bio-photo">${portrait(slug, { up, className: 'mug--wide' })}</div>
          <div class="bio-text">
            <p class="bio-role">${esc(p.role || '')}</p>
            <h3 class="bio-name">${val(p.name)}</h3>
            ${meta ? `<p class="bio-meta">${meta}</p>` : ''}
            ${isTbc(p.bio)
              ? `${ruled(9)}<p class="bio-body bio-body--tbc">${val(p.bio)} &middot; ${esc(plain(p.bio))}</p>`
              : `<p class="bio-body">${esc(p.bio)}</p>`}
          </div>
        </article>`;
}

/** Event heads get a portrait and a write-up; deputies get a portrait. */
function eventStaff(ev, up) {
  const staff = EVENT_STAFF[ev.slug];
  if (!staff) return '';
  const heads = staff.heads.map((slug) => {
    const p = person(slug);
    return `
        <div class="staff-head">
          ${portrait(slug, { up })}
          <div>
            <p class="staff-name">${val(p.name)}</p>
            <p class="staff-role">Event Head</p>
            <p class="staff-bio">${val(p.bio)}${isTbc(p.bio) ? ` &middot; ${esc(plain(p.bio))}` : ''}</p>
          </div>
        </div>`;
  }).join('');

  const deps = staff.deps.length ? `
      <div class="staff-deps">
        <p class="annot">Deputy Event Head${staff.deps.length > 1 ? 's' : ''}</p>
        <div class="staff-dep-row">
          ${staff.deps.map((slug) => `
          <div class="staff-dep">
            ${portrait(slug, { up })}
            <p class="staff-dep-n">${val(person(slug).name)}</p>
          </div>`).join('')}
        </div>
      </div>` : '';

  return `
    <section class="band band--tight">
      <p class="annot">Who runs it</p>
      <h2 class="h-sub">The people behind ${esc(ev.brand)}</h2>
      <div class="staff">
        ${heads}
        ${deps}
      </div>
    </section>`;
}

/* ── Event document pack ─────────────────────────────────────────────────────
   Every document a school will receive for this event, listed now with its
   download slot. A link that does not exist yet is not hidden — it is shown as
   awaiting release, so a school can see exactly what is coming and what is not.
   Fill EVENT_DOC_LINKS in data/fest.mjs as each pack is signed off. */

const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>';

function eventDocs(ev) {
  const links = EVENT_DOC_LINKS[ev.slug] || {};
  const rows = EVENT_DOCS(ev).map((d) => {
    const href = links[d.n];
    return `
        <article class="doc${href ? ' doc--ready' : ''}">
          <p class="doc-n">${esc(String(d.n))}</p>
          <div class="doc-main">
            <p class="doc-t">${esc(d.title)}</p>
            <p class="doc-d">${esc(d.detail)}</p>
            ${d.note ? `<p class="doc-note">${esc(d.note)}</p>` : ''}
          </div>
          ${href
            ? `<a class="doc-get" href="${esc(href)}" target="_blank" rel="noopener">${DOWNLOAD_ICON}<span>Download</span></a>`
            : `<span class="doc-get doc-get--wait" aria-disabled="true">${DOWNLOAD_ICON}<span>${esc(CONFIG.documentation.releaseLabel)}</span></span>`}
        </article>`;
  }).join('');

  return `
    <section class="band band--tight">
      <div class="list-head">
        <div>
          <p class="annot">Documents</p>
          <h2 class="h-section">The ${esc(ev.brand)} pack</h2>
        </div>
        <p class="annot">${EVENT_DOCS(ev).length} documents &middot; ${esc(CONFIG.documentation.releaseLabel.toLowerCase())}</p>
      </div>
      <p class="lede" style="margin-top:4px">These are the documents your team will receive for ${esc(ev.brand)}. Between them they set out everything a team needs in order to prepare.</p>
      <div class="docs">${rows}</div>
      <p class="note">We will release these documents to registered schools soon, and they will appear here at the same time.</p>
    </section>`;
}

/* ── Letters from the Students-in-Charge ─────────────────────────────────────
   Three abreast. Opening one gives it the full width and folds the other two
   into spines. Until the real text arrives, the body is drawn as ruled lines
   so the opened layout is honest about its own shape. */

function lettersRow() {
  const cards = LETTERS.map((L) => {
    const p = person(L.slug);
    const openLines = isTbc(L.opening)
      ? `<div class="rule-lines" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
             <p class="letter-lines">${val(L.opening)} &middot; ${esc(plain(L.opening))}</p>`
      : `<p class="letter-lines">${esc(L.opening)}</p>`;
    const bodyLines = isTbc(L.body)
      ? `<div class="rule-lines" aria-hidden="true">${'<i></i>'.repeat(11)}</div>
             <p class="letter-lines">${val(L.body)} &middot; ${esc(plain(L.body))}</p>`
      : `<div class="prose letter-prose">${[].concat(L.body).map((para) => `<p>${esc(para)}</p>`).join('')}</div>`;

    return `
        <article class="letter" data-state="idle" data-name="${esc(plain(p.name))}">
          <button class="letter-hit" type="button" aria-expanded="false"
                  aria-label="Read the letter from ${esc(plain(p.name))}"></button>
          <button class="letter-close" type="button">Close</button>
          <div class="letter-inner">
            <div class="letter-head">
              <div class="letter-mug">${portrait(L.slug)}</div>
              <div class="letter-id">
                <p class="letter-name">${val(p.name)}</p>
                <p class="letter-role">${esc(p.role)}</p>
              </div>
            </div>
            <div class="letter-text">
              <blockquote class="letter-key">${isTbc(L.key)
                ? `${val(L.key)} <span class="annot">${esc(plain(L.key))}</span>`
                : `&ldquo;${esc(L.key)}&rdquo;`}</blockquote>
              ${openLines}
              <p class="letter-cta"><span class="btn-ghost">Read the letter ${ARROW}</span></p>
              <div class="letter-body">
                <div><div class="letter-body-inner">
                  ${bodyLines}
                  <p class="letter-sign annot">${val(p.name)} &middot; ${esc(p.role)}</p>
                </div></div>
              </div>
            </div>
          </div>
        </article>`;
  }).join('');

  return `
    <section class="band band--tight">
      <div class="list-head">
        <div>
          <p class="annot">Letters</p>
          <h2 class="h-section">From the Students-in-Charge</h2>
        </div>
        <p class="annot">Select a letter to read it in full</p>
      </div>
      <div class="letters" id="letters">${cards}</div>
    </section>`;
}

/* ── Interactive figures, per event ──────────────────────────────────────── */

function figure(ev) {
  switch (ev.sim) {
    case 'slam': return `
      <figure class="fig" data-sim="slam" data-alt="A rover surveying an unmapped arena. Two paths are drawn: its true track and the track it believes it took. They separate as odometry drifts and snap back together when it recognises ground it has already mapped.">
        <figcaption class="fig-head">
          <span class="annot">Coverage traverse &middot; occupancy grid, live</span>
          <span class="fig-read" id="slamRead">coverage 00%</span>
        </figcaption>
        <div class="fig-body"></div>
        <div class="fig-foot">
          <span class="annot" id="slamStatus">Surveying &middot; obstacles resolve as they are found</span>
          <button class="btn-ghost" id="slamReplay" type="button">Run again</button>
        </div>
      </figure>`;

    case 'astar': return `
      <figure class="fig" data-sim="astar" data-alt="An autonomous ground vehicle planning a route through a corridor network to a coloured bin, with the search frontier shown expanding.">
        <figcaption class="fig-head">
          <span class="annot">Corridor network &middot; route plan</span>
          <span class="fig-read" id="agvRead">&nbsp;</span>
        </figcaption>
        <div class="fig-body"></div>
        <div class="fig-foot" style="gap:18px">
          <span class="filters" role="group" aria-label="Object class">
            ${['hazardous', 'fragile', 'normal'].map((c, i) => `<button class="filter" type="button" data-agv-class="${c}" aria-pressed="${i === 0}">${c}</button>`).join('')}
          </span>
          <span class="filters" role="group" aria-label="Symbol rule">
            <button class="filter" type="button" data-agv-symbol="none" aria-pressed="true">no symbol</button>
            <button class="filter" type="button" data-agv-symbol="redirect" aria-pressed="false">redirect</button>
          </span>
        </div>
      </figure>`;

    case 'sumo': return `
      <figure class="fig" data-sim="sumo" data-alt="Two robots in a circular ring. The match opens autonomous, then control transfers to the drivers on the referee's signal.">
        <figcaption class="fig-head">
          <span class="annot">Ring &middot; contact model, warning band at rim</span>
          <span class="fig-read" id="sumoRead">&nbsp;</span>
        </figcaption>
        <div class="fig-body"></div>
        <div class="fig-foot">
          <span class="annot">Push-out ends the bout. No downforce, no blades.</span>
          <button class="btn-ghost" id="sumoReset" type="button">Reset league</button>
        </div>
      </figure>`;

    case 'confusion': return `
      <figure class="fig" data-sim="confusion">
        <figcaption class="fig-head">
          <span class="annot">Confusion matrix &middot; ${EVENTS.find((e) => e.slug === 'the-black-box').testSetSize} unseen test images</span>
          <span class="fig-read" id="cmAcc">&nbsp;</span>
        </figcaption>
        <div class="fig-body">
          <div class="cm">
            <div class="cm-grid" id="cmGrid"></div>
            <div class="cm-side">
              <p class="annot">Failure modes in play</p>
              <ul class="cm-tally" id="cmTally"></ul>
              <p class="cm-detail" id="cmDetail"></p>
            </div>
          </div>
        </div>
        <div class="fig-foot">
          <span class="annot">Phase 4 gives you ten targeted photographs. Spend them on the top two failure modes.</span>
          <button class="btn-ghost" id="cmFix" type="button" aria-pressed="false">Spend 10 targeted images</button>
        </div>
      </figure>`;

    case 'complexity': return `
      <figure class="fig" data-sim="complexity" data-alt="Growth curves for logarithmic, linear, linearithmic, quadratic and exponential algorithms plotted against input size on a logarithmic operations axis.">
        <figcaption class="fig-head">
          <span class="annot">Growth against input size &middot; operations, log scale</span>
          <span class="fig-read" id="cxRead">&nbsp;</span>
        </figcaption>
        <div class="fig-body"></div>
        <div class="fig-foot">
          <label class="annot" for="cxN">Input size n</label>
          <input type="range" id="cxN" class="slider" min="16" max="2048" step="16" value="512" />
        </div>
      </figure>`;

    default: return `
      <figure class="fig">
        <figcaption class="fig-head"><span class="annot">Plan view &middot; schematic</span></figcaption>
        <div class="fig-body" style="padding:24px">${plan(ev.slug)}</div>
      </figure>`;
  }
}

/* ── Page: home ──────────────────────────────────────────────────────────── */

function pageIndex() {
  const facts = [
    ['Tournament', CONFIG.dates.label],
    ['Entries close', CONFIG.registration.closesLabel],
    ['Eligible', CONFIG.eligibility.classes],
  ].map(([k, v]) => `<div class="hero-fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

  const legend = [
    ['Venue', `${CONFIG.venue.school}, ${CONFIG.venue.city}`],
    ['Dates', CONFIG.dates.label],
    ['Events', String(EVENTS.length)],
    ['Delegation', CONFIG.eligibility.delegation],
    ['Eligible', CONFIG.eligibility.classes],
    ['Events per student', `Maximum ${CONFIG.eligibility.maxEventsPerStudent}`],
    ['Entries close', `<em>${esc(CONFIG.registration.closesLabel)}</em>`],
  ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${isTbc(v) ? val(v) : v}</dd>`).join('\n        ');

  const eventRows = EVENTS.map((ev) => `
        <article class="arena" data-cat="${ev.category}">
          ${plan(ev.slug)}
          <div>
            <p class="arena-disc">${esc(ev.categoryLabel)}</p>
            <a class="arena-name-link" href="events/${ev.slug}.html">
              <h3 class="arena-name">${esc(ev.brand)}</h3>
            </a>
            <p class="arena-sub">${esc(ev.technical)}</p>
            <p class="arena-desc">${esc(ev.lede)}</p>
            <p style="margin-top:14px"><a class="btn-ghost" href="events/${ev.slug}.html">Full rules ${ARROW}</a></p>
          </div>
          <dl class="arena-spec">
            <div><dt>Participants</dt><dd>${ev.participants} per school</dd></div>
            <div><dt>Control</dt><dd>${esc(ev.control)}</dd></div>
            <div><dt>Event head</dt><dd>${esc(ev.head)}</dd></div>
          </dl>
        </article>`).join('');

  const stations = MILESTONES.map((m) => `
          <div class="station${m.key ? ' station--key' : ''}">
            <p class="station-date">${esc(m.date)}</p>
            <p class="station-title">${esc(m.title)}</p>
            <p class="station-desc">${esc(m.detail)}</p>
          </div>`).join('');

  const body = `
    <section class="hero">
      <div>
        <h1 class="hero-title">
          <span class="l1">IPSC</span>
          <span class="l2">IT Fest</span>
          <span class="l3">2026</span>
        </h1>
        <p class="lede hero-lede">Eight events over three days: autonomous rovers mapping ground they have never seen, sorting robots working to rules that change each round, sumo bots, a cross-school hackathon, and a dataset built to fail until you diagnose it.</p>
        <dl class="hero-facts">${facts}</dl>
        <div class="actions">
          <a href="registration.html" class="btn btn-fill">Enter a delegation ${ARROW}</a>
          <a href="events.html" class="btn btn-line">See the eight events</a>
        </div>
      </div>
      ${figure(EVENTS[0])}
    </section>

    <section class="band split">
      <div>
        <p class="annot">About the fest</p>
        <h2 class="h-section">Three days at Chandbagh</h2>
        <div class="prose" style="margin-top:22px">
          <p>The Doon School is delighted to welcome member schools of the Indian Public Schools&rsquo; Conference to Chandbagh this December for the ${esc(CONFIG.name)}.</p>
          <p>Across three days, eight events bring together autonomous robotics, tele-operated engineering, competitive programming, applied machine learning, a technology quiz and a cross-school hackathon. Teams arrive with machines they have designed and built in their own schools, and spend three days testing them against the best their peers can field.</p>
          <p>The theme this year is <strong>${esc(CONFIG.theme)}</strong>. It is not only a slogan. Across the fest, the strongest entries tend not to be the fastest or the most accurate, but the ones whose teams can explain what they built, why it failed where it did, and what they would change.</p>
        </div>
        <blockquote class="axiom">
          <p>${esc(CONFIG.epigraph.text)}</p>
          <footer class="annot">${esc(CONFIG.epigraph.author)}</footer>
        </blockquote>
      </div>
      <div class="legend">
        <div class="legend-head"><p class="annot">At a glance</p></div>
        <dl>
        ${legend}
        </dl>
      </div>
    </section>

    <section class="band band--tight field">
      <div class="cd-head">
        <div>
          <p class="annot">Countdown</p>
          <h2 class="h-section">The fest opens in</h2>
        </div>
        <p class="annot">Opening Ceremony &middot; 09:00, 8 December 2026 &middot; ${esc(VENUES.BML)}</p>
      </div>
      <div class="cd" data-countdown-units="${CONFIG.dates.startISO}" data-past="The fest is under way"
           role="timer" aria-label="Time until the Opening Ceremony">
        ${[['d', 'Days'], ['h', 'Hours'], ['m', 'Minutes'], ['s', 'Seconds']].map(([u, label]) => `
        <div class="cd-cell">
          <span class="cd-n" data-unit="${u}">--</span>
          <span class="cd-k">${label}</span>
        </div>`).join('')}
      </div>
      <div class="cd-foot">
        <p class="lede" style="margin:0">Registration closes <strong>${esc(CONFIG.registration.closesLabel)}</strong> (in
          <span class="cd-inline" data-countdown="${CONFIG.registration.closesISO}" data-compact data-past="closed">&nbsp;</span>).
          We will release the complete documentation soon.</p>
        <a class="btn btn-fill" href="registration.html">Enter a delegation ${ARROW}</a>
      </div>
    </section>

    <section class="band band--tight">
      <div class="split">
        <div>
          <p class="annot">Welcome</p>
          <h2 class="h-section">${esc(WELCOME.key)}</h2>
          <div class="prose" style="margin-top:24px">
            ${WELCOME.paras.map((t) => `<p>${esc(t)}</p>`).join('\n            ')}
          </div>
          <p class="welcome-sign">
            <span class="welcome-name">${esc(WELCOME.from)}</span>
            <span class="annot">${esc(WELCOME.role)}</span>
          </p>
        </div>
        <div class="legend">
          <div class="legend-head"><p class="annot">Contact</p></div>
          <dl>
            <dt>Email</dt><dd><a href="mailto:${esc(CONFIG.contact.email)}">${esc(CONFIG.contact.email)}</a></dd>
            ${CONFIG.contact.people.map((p) => `<dt>${esc(p.name.replace(/^Mr /, ''))}</dt><dd>${esc(p.phone)}</dd>`).join('\n            ')}
            <dt>School</dt><dd>${esc(CONFIG.venue.tel)}</dd>
          </dl>
        </div>
      </div>
    </section>

    ${lettersRow()}

    <section class="band">
      <div class="list-head">
        <div>
          <p class="annot">The events</p>
          <h2 class="h-section">Eight events</h2>
        </div>
        <div class="filters" id="filters" role="group" aria-label="Filter events by discipline">
          <button class="filter" type="button" data-f="all" aria-pressed="true">All eight</button>
          <button class="filter" type="button" data-f="robotics" aria-pressed="false">Robotics</button>
          <button class="filter" type="button" data-f="software" aria-pressed="false">Code</button>
          <button class="filter" type="button" data-f="ml" aria-pressed="false">Machine learning</button>
          <button class="filter" type="button" data-f="team" aria-pressed="false">Team events</button>
        </div>
      </div>
      <p class="annot" id="filterCount">All ${EVENTS.length} events</p>
      <div class="arena-list">${eventRows}</div>
    </section>

    <section class="band">
      <p class="annot">Key dates</p>
      <h2 class="h-section">From registration to departure</h2>
      <div class="chain">
        <div class="chain-track">${stations}</div>
      </div>
      <p class="note">Complete documentation for each event, including detailed judging rubrics, will be released to every registered school soon.</p>
    </section>

    <section class="band field">
      <div class="split split--even">
        <div>
          <p class="annot">Registration</p>
          <h2 class="h-section">Enter a delegation</h2>
          <p class="lede" style="margin-top:20px">Registration closes on <strong>${esc(CONFIG.registration.closesLabel)}</strong>, by which date schools must forward an event-wise list of participants. Each school may send ${esc(CONFIG.eligibility.delegation)}.</p>
          <div class="actions">
            <a class="btn btn-fill" href="${esc(CONFIG.registration.formUrl)}" target="_blank" rel="noopener">Open the registration form ${ARROW}</a>
            <a class="btn btn-line" href="registration.html">What is required</a>
          </div>
        </div>
        <div class="est">
          <div class="est-head">
            <span class="annot">Closing in</span>
            <span class="annot">${esc(CONFIG.registration.closesLabel)}</span>
          </div>
          <div class="est-total">
            <p class="est-figure" data-countdown="${CONFIG.registration.closesISO}" data-past="Closed">&nbsp;</p>
          </div>
          <div class="est-rows">
            <div class="est-row"><label>Delegation</label><span>${esc(CONFIG.eligibility.delegation)}</span></div>
            <div class="est-row" style="border-bottom:0"><label>Eligible</label><span>${esc(CONFIG.eligibility.classes)}</span></div>
          </div>
          <div class="est-total" style="padding-top:0">
            <p class="est-sub">${esc(CONFIG.charges.statement)}</p>
          </div>
        </div>
      </div>
    </section>`;

  return shell({
    slug: 'index',
    title: 'IPSC IT Fest 2026',
    description: `${CONFIG.theme}. Eight events over three days at ${CONFIG.venue.school}, ${CONFIG.venue.city}, ${CONFIG.dates.label}.`,
    body,
  });
}

/* ── Page: events index ──────────────────────────────────────────────────── */

function pageEvents() {
  const rows = EVENTS.map((ev) => `
        <article class="arena" data-cat="${ev.category}">
          ${plan(ev.slug)}
          <div>
            <p class="arena-disc">${esc(ev.categoryLabel)}</p>
            <a class="arena-name-link" href="events/${ev.slug}.html"><h2 class="arena-name">${esc(ev.brand)}</h2></a>
            <p class="arena-sub">${esc(ev.technical)}</p>
            <p class="arena-desc">${esc(ev.lede)}</p>
            <details class="disclose">
              <summary>Rules in brief</summary>
              <div class="disclose-body"><div>
                <ol class="phases">${ev.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
              </div></div>
            </details>
            <p style="margin-top:14px"><a class="btn-ghost" href="events/${ev.slug}.html">Full event sheet ${ARROW}</a></p>
          </div>
          <dl class="arena-spec">
            <div><dt>Participants</dt><dd>${ev.participants} per school</dd></div>
            <div><dt>Control</dt><dd>${esc(ev.control)}</dd></div>
            <div><dt>Event head</dt><dd>${esc(ev.head)}</dd></div>
            ${ev.deputies?.length ? `<div><dt>Deputies</dt><dd>${esc(ev.deputies.join(', '))}</dd></div>` : ''}
          </dl>
        </article>`).join('');

  const body = phead({
    slug: 'events', sheet: '02', kicker: 'Events',
    title: 'The events',
    lede: 'Four robotics events contested in physical arenas, and four in software, machine learning and enterprise.',
  }) + `
    <section class="band band--tight">
      <div class="list-head">
        <p class="annot" id="filterCount">All ${EVENTS.length} events</p>
        <div class="filters" id="filters" role="group" aria-label="Filter events by discipline">
          <button class="filter" type="button" data-f="all" aria-pressed="true">All eight</button>
          <button class="filter" type="button" data-f="robotics" aria-pressed="false">Robotics</button>
          <button class="filter" type="button" data-f="software" aria-pressed="false">Code</button>
          <button class="filter" type="button" data-f="ml" aria-pressed="false">Machine learning</button>
          <button class="filter" type="button" data-f="team" aria-pressed="false">Team events</button>
        </div>
      </div>
      <div class="arena-list">${rows}</div>
    </section>`;

  return shell({
    slug: 'events',
    title: 'The Eight Events',
    description: 'Terra Incognita, Half-Life, Build-Different, Brinkmanship, the Hackathon, IT Quiz, Algorithm Challenge and The Black Box.',
    body,
  });
}

/* ── Page: one event ─────────────────────────────────────────────────────── */

function pageEvent(ev, i) {
  const prev = EVENTS[(i - 1 + EVENTS.length) % EVENTS.length];
  const next = EVENTS[(i + 1) % EVENTS.length];

  const spec = [
    ['Discipline', ev.categoryLabel],
    ['Participants', `${ev.participants} per school`],
    ['Control', ev.control],
    ['Event head', ev.head],
    ev.deputies?.length ? ['Deputies', ev.deputies.join(', ')] : null,
    ev.languages ? ['Languages', ev.languages.join(' · ')] : null,
    ev.platform ? ['Platform', ev.platform] : null,
    ev.sensors ? ['Sensors permitted', ev.sensors.allowed] : null,
    ev.sensors ? ['Barred', ev.sensors.barred] : null,
    ev.barred ? ['Prohibited', ev.barred] : null,
  ].filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('\n          ');

  const rubric = ev.rubric ? `
    <section class="band band--tight">
      <p class="annot">Judging rubric</p>
      <h2 class="h-sub">How the marks fall</h2>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Criterion</th><th style="width:140px">Weight</th><th class="num" style="width:80px">${ev.rubric.unit === '%' ? 'Per cent' : 'Marks'}</th></tr></thead>
          <tbody>
            ${ev.rubric.rows.map((r) => `<tr>
              <td>${esc(r.label)}</td>
              <td><span class="rubric-bar"><i style="width:${(r.marks / ev.rubric.total * 100).toFixed(1)}%"></i></span></td>
              <td class="num">${r.marks}${ev.rubric.unit === '%' ? '%' : ''}</td>
            </tr>`).join('')}
            <tr><td><strong>Total</strong></td><td></td><td class="num"><strong>${ev.rubric.total}${ev.rubric.unit === '%' ? '%' : ''}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <p class="note">Weights are those published in the brochure and the committee&rsquo;s master document. The full rubric, covering scoring levels, tie-break order and who scores what, will be released with the complete documentation soon.</p>
    </section>` : '';

  const extras = [
    ev.withheld ? `<p class="note"><strong>Withheld content.</strong> ${esc(ev.withheld)}</p>` : '',
    ev.fabrication ? `<p class="note"><strong>Fabrication.</strong> ${esc(ev.fabrication)}</p>` : '',
    ev.rounds ? `<p class="annot" style="margin-top:26px">Final round may include</p>
      <ul class="bullets">${ev.rounds.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : '',
    ev.errorTypes ? `<p class="annot" style="margin-top:26px">Error categories used in Phase 3</p>
      <ul class="bullets">${ev.errorTypes.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : '',
    ev.classes ? `<p class="annot" style="margin-top:26px">Object classes</p>
      <ul class="bullets">${ev.classes.map((c) => `<li><strong>${esc(c.label)}:</strong> ${esc(c.note)}</li>`).join('')}</ul>` : '',
    ev.divisions ? `<p class="note"><strong>Age divisions.</strong> ${val(ev.divisions)} &middot; ${esc(plain(ev.divisions))}</p>` : '',
    ev.seniorVersion ? `<p class="note"><strong>Age divisions.</strong> ${val(ev.seniorVersion)} &middot; ${esc(plain(ev.seniorVersion))}</p>` : '',
    ev.companyCount ? `<p class="note"><strong>Company structure.</strong> ${val(ev.companyCount)} &middot; ${esc(plain(ev.companyCount))}</p>` : '',
  ].filter(Boolean).join('\n      ');

  const body = phead({
    slug: 'events', sheet: '02',
    crumb: `<span class="crumbs"><a href="../events.html">Events</a> <span>/</span> <span>${esc(ev.brand)}</span></span>`,
    title: esc(ev.brand),
    lede: esc(ev.lede),
  }) + `
    <section class="band band--tight">
      <p class="annot annot--sig">${esc(ev.technical)}</p>
      <h2 class="h-sub" style="margin-top:8px;max-width:26ch">${esc(ev.tagline)}</h2>
      <div style="margin-top:28px">${figure(ev)}</div>
    </section>

    <section class="band split">
      <div>
        <p class="annot">Rules</p>
        <h2 class="h-section">How it runs</h2>
        <ol class="phases">${ev.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
        ${extras}
      </div>
      <div>
        <div class="legend">
          <div class="legend-head"><p class="annot">Event details</p></div>
          <dl>
          ${spec}
          </dl>
        </div>
        <p class="annot" style="margin-top:26px">Judging</p>
        <ul class="bullets">${ev.judging.map((j) => `<li>${esc(j)}</li>`).join('')}</ul>
        ${ev.motto ? `<blockquote class="axiom"><p>${esc(ev.motto)}</p></blockquote>` : ''}
      </div>
    </section>
    ${rubric}
    ${eventDocs(ev)}
    ${eventStaff(ev, '../')}

    <section class="band field">
      <div class="split split--even">
        <div>
          <p class="annot">Next</p>
          <h2 class="h-section">${esc(next.brand)}</h2>
          <p class="lede" style="margin-top:16px">${esc(next.summary)}</p>
          <div class="actions">
            <a class="btn btn-fill" href="${next.slug}.html">${esc(next.brand)} ${ARROW}</a>
            <a class="btn btn-line" href="${prev.slug}.html">Back to ${esc(prev.brand)}</a>
          </div>
        </div>
        <div>
          <p class="annot">Questions</p>
          <p class="lede" style="margin-top:16px">Full rules for ${esc(ev.brand)}, including ${ev.category === 'robotics' ? 'the robot and arena specifications' : 'the platform and environment specification'} and the detailed judging rubric, will be released to registered schools soon. Until then, do write to us with anything you would like to know.</p>
          <div class="actions">
            <a class="btn btn-line" href="../resources.html">Resources</a>
            <a class="btn btn-line" href="../registration.html">Register</a>
          </div>
        </div>
      </div>
    </section>`;

  /* Event pages carry their own previous/next event band, so they skip the
     sheet-level pager rather than showing two navigators. */
  return shell({
    slug: 'events', depth: 1, nav: false,
    title: `${ev.brand} · ${ev.technical}`,
    description: ev.summary,
    body,
  });
}

/* ── Page: schedule ──────────────────────────────────────────────────────── */

function pageSchedule() {
  /* Setup day is ours, not the visiting schools'. It stays in the data for the
     committee's own use and off the published programme. */
  const days = SCHEDULE.filter((d) => !d.internal).map((d) => `
      <section class="day">
        <div class="day-head">
          <h2 class="day-title">${esc(d.date)}</h2>
          <p class="day-role">${esc(d.role)}</p>
          <p class="annot">${esc(d.day)}</p>
        </div>
        <div class="slots">
          ${d.slots.map((s) => `
          <div class="slot slot--${esc(s.track)}${s.key ? ' slot--key' : ''}">
            <p class="slot-time">${esc(s.time)}</p>
            <span class="slot-mark" aria-hidden="true"></span>
            <div>
              <p class="slot-title">${s.event ? `<a href="events/${s.event}.html">${esc(s.title)}</a>` : esc(s.title)}</p>
              ${s.detail ? `<p class="slot-detail">${esc(s.detail)}</p>` : ''}
            </div>
            <p class="slot-venue">${esc(VENUES[s.venue] || s.venue || '')}</p>
          </div>`).join('')}
        </div>
      </section>`).join('');

  const body = phead({
    slug: 'schedule', sheet: '03', kicker: 'Programme',
    title: 'The programme',
    lede: 'Delegations arrive on Monday 7 December and depart after the Closing Ceremony on Thursday 10 December. Competition runs across the three days between.',
  }) + `
    <section class="band band--tight">
      <div class="key" aria-label="Key">
        ${[['key', 'Ceremony or final'], ['robotics', 'Robotics arena'], ['code', 'Coding event'],
           ['ml', 'Machine learning'], ['hack', 'Hackathon'], ['meal', 'Meal or break'],
           ['logistics', 'Logistics']]
          .map(([k, label]) => `<span class="key-item"><span class="slot-mark mark--${k}" aria-hidden="true"></span>${esc(label)}</span>`).join('\n        ')}
      </div>
      ${days}
    </section>`;

  return shell({
    slug: 'schedule',
    title: 'The Programme',
    description: `Day-by-day programme for the IPSC IT Fest 2026 at The Doon School, ${CONFIG.dates.label}.`,
    body,
  });
}

/* ── Page: registration ──────────────────────────────────────────────────── */

function pageRegistration() {
  const steps = [
    ['Confirm eligibility', `Your school is an IPSC member school, and your participants are in ${CONFIG.eligibility.classes}.`],
    ['Choose your events', `Decide which of the eight events you are entering and who from your delegation is entering each. One student may enter a maximum of ${CONFIG.eligibility.maxEventsPerStudent} events.`],
    ['Complete the form', 'The registration form asks for school details and event-wise participant information.'],
    ['Forward the participant list', `By ${CONFIG.registration.closesLabel}, the event-wise list of participants must be with the organising committee.`],
    ['Await the documentation', 'We will release complete rulebooks, detailed judging rubrics and charges to registered schools soon.'],
  ].map(([t, d]) => `<li><div><p class="slot-title">${esc(t)}</p><p class="slot-detail">${esc(d)}</p></div></li>`).join('');

  const body = phead({
    slug: 'registration', sheet: '04', kicker: 'Registration',
    title: 'Enter a<br>delegation',
    lede: `Registration is open to all IPSC member schools and closes on <strong>${esc(CONFIG.registration.closesLabel)}</strong>.`,
  }) + `
    <section class="band split">
      <div class="prose">
        <p>We are delighted to invite all IPSC member schools to participate in the ${esc(CONFIG.name)}, hosted by ${esc(CONFIG.venue.school)} from ${esc(CONFIG.dates.long)}. The fest is open to students of ${esc(CONFIG.eligibility.classes)}, with each school permitted to register a maximum of ${CONFIG.eligibility.maxStudents} students accompanied by one faculty advisor.</p>
        <p>Registration requires schools to provide school details and event-wise participant information. ${esc(CONFIG.registration.note)}</p>
        <p>For any queries regarding registration or participation, please write to <a href="mailto:${esc(CONFIG.contact.email)}">${esc(CONFIG.contact.email)}</a>, or contact ${CONFIG.contact.people.map((p) => `${esc(p.name)} (${esc(p.phone)})`).join(' or ')}.</p>
      </div>
      <div class="legend">
        <div class="legend-head"><p class="annot">Requirements</p></div>
        <dl>
          <dt>Open to</dt><dd>IPSC member schools</dd>
          <dt>Eligible</dt><dd>${esc(CONFIG.eligibility.classes)}</dd>
          <dt>Maximum</dt><dd>${esc(CONFIG.eligibility.delegation)}</dd>
          <dt>Per student</dt><dd>Maximum ${CONFIG.eligibility.maxEventsPerStudent} events</dd>
          <dt>Closes</dt><dd><em>${esc(CONFIG.registration.closesLabel)}</em></dd>
          <dt>Arrival</dt><dd>${esc(CONFIG.arrival.label)}</dd>
        </dl>
      </div>
    </section>

    <section class="band band--tight">
      <p class="annot">Procedure</p>
      <h2 class="h-section">Five steps</h2>
      <ol class="phases" style="max-width:70ch">${steps}</ol>

    </section>

    <section class="band field">
      <div class="split split--even">
        <div>
          <p class="annot">Registration</p>
          <h2 class="h-section">The form</h2>
          <p class="lede" style="margin-top:18px">School details and event-wise participant information. Submit before ${esc(CONFIG.registration.closesLabel)}.</p>
          <div class="actions">
            <a class="btn btn-fill" href="${esc(CONFIG.registration.formUrl)}" target="_blank" rel="noopener">Open the registration form ${ARROW}</a>
            <a class="btn btn-line" href="mailto:${esc(CONFIG.contact.email)}?subject=IPSC%20IT%20Fest%202026%20enquiry">Email the committee</a>
          </div>
        </div>
        <div class="est">
          <div class="est-head"><span class="annot">Time remaining</span><span class="annot">Closes ${esc(CONFIG.registration.closesLabel)}</span></div>
          <div class="est-total"><p class="est-figure" data-countdown="${CONFIG.registration.closesISO}" data-past="Registration closed">&nbsp;</p></div>
          <div class="est-rows">
            <div class="est-row"><label>Arrival</label><span>7 December, by 17:00</span></div>
            <div class="est-row"><label>Departure</label><span>After the Closing Ceremony, 10 December</span></div>
            <div class="est-row" style="border-bottom:0"><label>Documentation</label><span>${esc(CONFIG.documentation.releaseLabel)}</span></div>
          </div>
        </div>
      </div>
    </section>`;

  return shell({
    slug: 'registration',
    title: 'Registration',
    description: `How IPSC member schools enter the IT Fest 2026. Registration closes ${CONFIG.registration.closesLabel}.`,
    body,
  });
}

/* ── Page: rules ─────────────────────────────────────────────────────────── */

function pageRules() {
  const items = RULES.map((r, i) => `
        <li><span class="rn">R&middot;${String(i + 1).padStart(2, '0')}</span><span>${esc(r)}</span></li>`).join('');

  const body = phead({
    slug: 'rules', sheet: '05', kicker: 'Rules',
    title: 'Rules and<br>regulations',
    lede: 'These are the rules and regulations circulated to Heads of School with the brochure, and they apply across all eight events. Individual event rulebooks add detail specific to each event.',
  }) + `
    <section class="band band--tight">
      <ol class="clauses clauses--2col">${items}</ol>
      <p class="note note--wide"><strong>A note for robotics teams.</strong> Battery limits are set out in each event&rsquo;s robot specification, and damaged or swollen cells cannot be brought onto campus. Destructive mechanisms are not permitted in any of the four robotics events. Internet access is provided where an event needs it, and each rulebook says which.</p>
      <div class="actions">
        <a class="btn btn-line" href="events.html">The eight events ${ARROW}</a>
        <a class="btn btn-line" href="faq.html">Frequently asked</a>
      </div>
    </section>`;

  return shell({
    slug: 'rules',
    title: 'Rules and Regulations',
    description: 'The fifteen clauses governing every event at the IPSC IT Fest 2026.',
    body,
  });
}

/* ── Page: resources ─────────────────────────────────────────────────────── */

/* Size of a file under assets/, for the label beside its Download button. */
const fileSize = (href) => {
  const p = join(ROOT, href);
  if (!existsSync(p)) return '';
  const mb = statSync(p).size / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(mb * 1024))} KB`;
};

function pageResources() {
  const rows = RESOURCES.map((r) => {
    const live = r.status === 'available' && !isTbc(r.href);
    /* A hosted file is saved, not opened: `download` names the saved copy.
       Local paths are URL-encoded because the source filenames carry spaces. */
    const file = live && r.download;
    const href = file ? encodeURI(r.href) : r.href;
    const size = file ? fileSize(r.href) : '';
    const linkAttrs = file ? ` download="${esc(r.download)}"` : ' target="_blank" rel="noopener"';
    return `
        <article class="res">
          <div>
            <p class="res-k">${esc(r.kind)}</p>
            ${live ? `<a class="res-t" href="${esc(href)}"${linkAttrs}>${esc(r.title)}</a>`
                   : `<p class="res-t">${esc(r.title)}</p>`}
            <p class="res-d">${esc(r.note)}${size ? ` PDF, ${esc(size)}.` : ''}${isTbc(r.href) ? ` ${val(r.href)}` : ''}</p>
          </div>
          ${file
            ? `<a class="doc-get" href="${esc(href)}"${linkAttrs}>${DOWNLOAD_ICON}<span>Download</span></a>`
            : `<span class="pill ${r.status === 'available' ? 'pill--on' : 'pill--wait'}">${r.status === 'available' ? 'Available' : CONFIG.documentation.releaseLabel}</span>`}
        </article>`;
  }).join('');

  const body = phead({
    slug: 'resources', sheet: '06', kicker: 'Resources',
    title: 'Documents',
    lede: 'Everything circulated so far, and everything still to come. We will release full documentation for all eight events to registered schools <strong>soon</strong>.',
  }) + `
    <section class="band band--tight">
      <div class="res-list">${rows}</div>
      <p class="note">Each event will have its own set of documents: rules, specifications, judging rubric, safety requirements and preparation material. They will be listed in full on each event&rsquo;s page.</p>
    </section>`;

  return shell({
    slug: 'resources',
    title: 'Resources',
    description: 'Brochure, registration form and the complete event documentation for the IPSC IT Fest 2026.',
    body,
  });
}

/* ── Page: committee ─────────────────────────────────────────────────────── */

function pageCommittee() {
  const group = (g) => `
      <section class="team-group">
        <div class="team-head">
          <h2 class="h-sub">${esc(g.label)}</h2>
          <p class="annot">${g.slugs.length} ${g.slugs.length === 1 ? 'member' : 'members'}</p>
        </div>
        <div class="bios">
          ${g.slugs.map((slug) => bioRow(slug)).join('')}
        </div>
      </section>`;

  /* Event heads, shown as people rather than as rows in a responsibility
     matrix. Each portrait leads to the event that person runs. */
  const seen = new Set();
  const heads = EVENTS.flatMap((ev) => (EVENT_STAFF[ev.slug]?.heads || [])
    .filter((slug) => !seen.has(slug) && seen.add(slug))
    .map((slug) => {
      const runs = EVENTS.filter((e) => EVENT_STAFF[e.slug]?.heads.includes(slug));
      return `
        <a class="head-card" href="events/${runs[0].slug}.html">
          ${portrait(slug)}
          <p class="head-n">${val(person(slug).name)}</p>
          <p class="head-e">${runs.map((e) => esc(e.brand)).join(' &middot; ')}</p>
        </a>`;
    })).join('');

  const body = phead({
    slug: 'committee', sheet: '07', kicker: 'Committee',
    title: 'Meet the team',
    lede: 'The IPSC IT Fest is run by students of The Doon School. Three Students-in-Charge lead the fest; each of the eight events is run by its own Event Head.',
  }) + `
    <section class="band band--tight">
      ${TEAM.map(group).join('')}
      <section class="team-group">
        <div class="team-head">
          <h2 class="h-sub">Event Heads</h2>
          <p class="annot">Eight events</p>
        </div>
        <div class="heads">${heads}</div>
      </section>
      <p class="note">For questions about registration or participation, please write to <a href="mailto:${esc(CONFIG.contact.email)}">${esc(CONFIG.contact.email)}</a>, or contact ${CONFIG.contact.people.map((p) => `${esc(p.name)} on ${esc(p.phone)}`).join(' or ')}.</p>
    </section>`;

  return shell({
    slug: 'committee',
    title: 'The Team',
    description: 'The students running the IPSC IT Fest 2026 at The Doon School.',
    body,
  });
}

/* ── Page: chandbagh ─────────────────────────────────────────────────────── */
/* ARCHIVED. Not in NAV and not in the page list below, so it is neither built
   nor linked. To restore it, add { slug: 'chandbagh', ... } back to NAV in
   data/fest.mjs and ['chandbagh.html', pageChandbagh()] back to build(). */

function pageChandbagh() {
  const spaces = CHANDBAGH.spaces.map((s) => `
        <div>
          <p class="card-t">${val(s.name)}</p>
          <p class="card-d">${esc(s.use)}</p>
        </div>`).join('');

  const travel = CHANDBAGH.travel.map((t) => `
        <div>
          <p class="card-k">${esc(t.mode)}</p>
          <p class="card-d" style="margin-top:8px">${val(t.detail)} &middot; ${esc(plain(t.detail))}</p>
        </div>`).join('');

  const v = CONFIG.venue;
  const body = phead({
    slug: 'chandbagh', sheet: '08', kicker: 'Chandbagh',
    title: 'Chandbagh',
    lede: esc(CHANDBAGH.lede),
  }) + `
    <section class="band split">
      <div class="prose">
        <p>${val(CHANDBAGH.history)}${isTbc(CHANDBAGH.history) ? ` &middot; ${esc(plain(CHANDBAGH.history))}` : ''}</p>
        <p>${val(CHANDBAGH.life)}${isTbc(CHANDBAGH.life) ? ` &middot; ${esc(plain(CHANDBAGH.life))}` : ''}</p>
        <p>${esc(CHANDBAGH.houses)} Delegations are expected by <strong>${esc(CONFIG.arrival.label.toLowerCase())}</strong>, or on the morning of 8 December.</p>
      </div>
      <div class="legend">
        <div class="legend-head"><p class="annot">Address</p></div>
        <dl>
          <dt>School</dt><dd>${esc(v.school)}</dd>
          <dt>Campus</dt><dd>${esc(v.campus)}</dd>
          <dt>Address</dt><dd>${esc(v.street)}, ${esc(v.city)}</dd>
          <dt>State</dt><dd>${esc(v.state)} ${esc(v.pin)}</dd>
          <dt>Telephone</dt><dd>${esc(v.tel)}</dd>
        </dl>
      </div>
    </section>

    <section class="band">
      <p class="annot">On campus</p>
      <h2 class="h-section">Where the fest runs</h2>
      <div class="cards">${spaces}</div>
    </section>

    <section class="band band--tight">
      <p class="annot">Getting here</p>
      <h2 class="h-sub">Travel</h2>
      <div class="cards">${travel}</div>
      <p class="note"><a href="https://www.google.com/maps/search/${encodeURIComponent(v.mapQuery)}" target="_blank" rel="noopener">Open ${esc(v.school)} in Maps ${ARROW}</a></p>
    </section>`;

  return shell({
    slug: 'chandbagh',
    title: 'Chandbagh',
    description: `The Doon School campus at Chandbagh, ${CONFIG.venue.city}, where the IPSC IT Fest 2026 is held.`,
    body,
  });
}

/* ── Page: FAQ ───────────────────────────────────────────────────────────── */

function pageFaq() {
  const groups = FAQ.map((g) => `
      <section class="faq-group">
        <p class="annot">${esc(g.group)}</p>
        <div class="faq-list">
          ${g.items.map((it) => `
          <details class="qa">
            <summary>${esc(it.q)}<span class="qa-plus" aria-hidden="true"></span></summary>
            <div class="qa-body"><div><p>${esc(it.a)}</p></div></div>
          </details>`).join('')}
        </div>
      </section>`).join('');

  const body = phead({
    slug: 'faq', sheet: '09', kicker: 'FAQ',
    title: 'Frequently<br>asked',
  }) + `
    <section class="band band--tight">
      ${groups}
      <p class="note">Still unanswered? Write to <a href="mailto:${esc(CONFIG.contact.email)}">${esc(CONFIG.contact.email)}</a>, or contact ${CONFIG.contact.people.map((p) => `${esc(p.name)} (${esc(p.phone)})`).join(' or ')}.</p>
    </section>`;

  return shell({
    slug: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Registration, travel, equipment, internet access and judging questions for the IPSC IT Fest 2026.',
    body,
  });
}

/* ── Favicon ─────────────────────────────────────────────────────────────── */

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#EEF0EA"/>
  <path d="M6 24V8h3v16zM13 24V8h4.6c3.4 0 5.4 1.9 5.4 5s-2 5.1-5.4 5.1H16V24zM16 15.4h1.4c1.6 0 2.5-.8 2.5-2.4s-.9-2.4-2.5-2.4H16z" fill="#171C1A"/>
  <rect x="24" y="20" width="4" height="4" fill="#E0004D"/>
</svg>`;

/* ── Build ───────────────────────────────────────────────────────────────── */

/* Index is populated first so the palette on every page can see everything. */
function buildIndex() {
  NAV.filter((n) => n.nav !== false).forEach((n) =>
    idx(n.title, `${n.slug}.html`, { g: 'Pages', r: '', top: true }));

  EVENTS.forEach((ev) =>
    idx(ev.brand, `events/${ev.slug}.html`, { g: 'Events', r: ev.categoryLabel, b: ev.summary, top: true }));

  RULES.forEach((r, i) =>
    idx(`R·${String(i + 1).padStart(2, '0')} ${r.slice(0, 58)}${r.length > 58 ? '…' : ''}`,
      'rules.html', { g: 'Rules', r: `R·${String(i + 1).padStart(2, '0')}`, b: r }));

  FAQ.forEach((g) => g.items.forEach((it) =>
    idx(it.q, 'faq.html', { g: 'FAQ', r: g.group, b: it.a })));

  MILESTONES.forEach((m) =>
    idx(m.title, 'schedule.html', { g: 'Dates', r: m.date, b: m.detail }));

  SCHEDULE.forEach((d) => d.slots.filter((s) => s.event || s.key).forEach((s) =>
    idx(s.title, s.event ? `events/${s.event}.html` : 'schedule.html',
      { g: 'Schedule', r: d.date.split(',')[1]?.trim() || d.day, b: `${s.time} · ${VENUES[s.venue] || s.venue || ''}` })));

  /* Everyone is searchable by name. An event head resolves to their event;
     everyone else to the team sheet. */
  const eventOf = {};
  Object.entries(EVENT_STAFF).forEach(([evSlug, st]) =>
    st.heads.forEach((s) => { eventOf[s] = evSlug; }));

  Object.entries(PEOPLE)
    .filter(([, p]) => !isTbc(p.name))
    .forEach(([slug, p]) => idx(plain(p.name),
      eventOf[slug] ? `events/${eventOf[slug]}.html` : 'committee.html',
      { g: 'People', r: p.code || '', b: p.role || '' }));

  LETTERS.forEach((L) =>
    idx(`Letter from ${plain(person(L.slug).name)}`, 'index.html',
      { g: 'Letters', r: '', b: 'Students-in-Charge' }));
}

async function build() {
  /* Fingerprint the assets before any page is rendered, so every page links
     the version of the CSS and JS it was actually built against. */
  const css = await readFile(join(ROOT, 'assets', 'fest.css'));
  const js = await readFile(join(ROOT, 'assets', 'fest.js'));
  STAMP = createHash('sha256').update(css).update(js).digest('hex').slice(0, 8);

  buildIndex();

  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'events'), { recursive: true });
  await mkdir(join(OUT, 'assets'), { recursive: true });

  const pages = [
    ['index.html', pageIndex()],
    ['events.html', pageEvents()],
    ['schedule.html', pageSchedule()],
    ['registration.html', pageRegistration()],
    ['rules.html', pageRules()],
    ['resources.html', pageResources()],
    ['committee.html', pageCommittee()],
    ['faq.html', pageFaq()],
    ...EVENTS.map((ev, i) => [`events/${ev.slug}.html`, pageEvent(ev, i)]),
  ];

  for (const [name, html] of pages) await writeFile(join(OUT, name), html, 'utf8');

  /* Copy assets at any depth, so assets/people and assets/images/logos
     both come across. The committee's draft schedule is a source for
     data/fest.mjs, not a public download, so it stays out of site/. */
  const PRIVATE = new Set([join(ROOT, 'assets', 'event schedule')]);
  const copyTree = async (from, to) => {
    await mkdir(to, { recursive: true });
    for (const e of await readdir(from, { withFileTypes: true })) {
      if (PRIVATE.has(join(from, e.name))) continue;
      if (e.isDirectory()) await copyTree(join(from, e.name), join(to, e.name));
      else await copyFile(join(from, e.name), join(to, e.name));
    }
  };
  await copyTree(join(ROOT, 'assets'), join(OUT, 'assets'));
  await mkdir(join(OUT, 'assets', 'people'), { recursive: true });
  await writeFile(join(OUT, 'assets', 'mark.svg'), MARK, 'utf8');

  /* robots + sitemap, so the site is deployable as-is */
  const urls = pages.map(([n]) => n.replace(/index\.html$/, '')).sort();
  await writeFile(join(OUT, 'sitemap.txt'), urls.join('\n'), 'utf8');
  await writeFile(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n', 'utf8');

  /* ── Report ── */
  const slugs = [...SHOWN];
  const missing = slugs.filter((s) => !HAS_PORTRAIT.has(s));

  console.log(`\n  IPSC IT Fest 2026 — build complete`);
  console.log(`  ${pages.length} pages · ${INDEX.length} search entries · site/`);
  console.log(`  portraits ${slugs.length - missing.length}/${slugs.length} of the people shown on the site
`);

  if (missing.length) {
    console.log(`  ${missing.length} still missing — add to Mugshots/ and run  python tools/portraits.py
`);
    missing.forEach((s) => console.log(`      ${plain(PEOPLE[s].name)}`));
    console.log('');
  }
  if (TBC_REGISTRY.length) {
    console.log(`  ${TBC_REGISTRY.length} placeholders still to fill:\n`);
    TBC_REGISTRY.forEach((t, i) => console.log(`   ${String(i + 1).padStart(2, ' ')}. ${t}`));
    console.log('');
  }
}

build().catch((e) => { console.error(e); process.exit(1); });
