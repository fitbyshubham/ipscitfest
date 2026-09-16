/* ============================================================================
   IPSC IT FEST 2026 — SITE SCRIPT
   No framework, no build step, no dependencies.

   Everything below degrades: with JavaScript off, every page still reads in
   full. The interactive figures are the events themselves, simulated — a SLAM
   rover that actually accumulates odometry error and closes the loop, an A*
   search that actually expands a frontier, a sumo ring with real contact
   impulses, a confusion matrix you can interrogate. They are the argument that
   this is an IT fest, made in the medium of the thing.
   ========================================================================== */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp  = (a, b, t) => a + (b - a) * t;

  /* Deterministic PRNG. The figures must look identical on every load —
     a hero that reshuffles on refresh reads as noise, not instrumentation. */
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }
  /* Box–Muller, for odometry noise that is actually Gaussian. */
  function gauss(rand) {
    const u = Math.max(rand(), 1e-9), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const css = (name, el = document.documentElement) =>
    getComputedStyle(el).getPropertyValue(name).trim();

  /* ══ 1. THEME ═══════════════════════════════════════════════════════════ */

  const Theme = {
    key: 'ipsc-itfest-theme',
    init() {
      const btn = $('#themeBtn');
      if (!btn) return;
      const saved = (() => { try { return localStorage.getItem(this.key); } catch { return null; } })();
      if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
      this.sync(btn);
      btn.addEventListener('click', () => {
        const isDark = document.documentElement.dataset.theme
          ? document.documentElement.dataset.theme === 'dark'
          : matchMedia('(prefers-color-scheme: dark)').matches;
        const next = isDark ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem(this.key, next); } catch { /* private mode */ }
        this.sync(btn);
        document.dispatchEvent(new CustomEvent('themechange'));
      });
    },
    sync(btn) {
      const isDark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches;
      btn.setAttribute('aria-label', isDark ? 'Switch to the light theme' : 'Switch to the dark theme');
      const t = $('.bar-icon-t', btn);
      if (t) t.textContent = isDark ? 'Light' : 'Dark';
    },
  };

  /* ══ 2. DRAWER ══════════════════════════════════════════════════════════ */

  function initDrawer() {
    const drawer = $('#drawer'), open = $('#menuBtn'), close = $('#drawerClose');
    if (!drawer || !open) return;
    const set = (on) => {
      drawer.classList.toggle('open', on);
      open.setAttribute('aria-expanded', String(on));
      document.body.style.overflow = on ? 'hidden' : '';
      if (on) (drawer.querySelector('a') || close)?.focus();
      else open.focus();
    };
    open.addEventListener('click', () => set(true));
    close?.addEventListener('click', () => set(false));
    drawer.addEventListener('click', (e) => { if (e.target.tagName === 'A') set(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) set(false);
    });
  }

  /* ══ 3. COUNTDOWN ═══════════════════════════════════════════════════════ */

  function initCountdown() {
    const nodes = $$('[data-countdown]');
    const units = $$('[data-countdown-units]');
    if (!nodes.length && !units.length) return;

    /* The segmented display on the home page. Each unit lives in its own cell
       so the figures can be set large without the seconds column shoving the
       rest of the row about every tick. */
    const tickUnits = (now) => units.forEach((n) => {
      const target = Date.parse(n.dataset.countdownUnits);
      if (Number.isNaN(target)) return;
      let ms = target - now;
      if (ms <= 0) {
        if (!n.classList.contains('cd--past')) {
          n.classList.add('cd--past');
          n.innerHTML = `<div class="cd-cell"><span class="cd-n">${n.dataset.past || 'Under way'}</span></div>`;
        }
        return;
      }
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5);  ms -= h * 36e5;
      const m = Math.floor(ms / 6e4);   ms -= m * 6e4;
      const s = Math.floor(ms / 1e3);
      const pad = (v, w = 2) => String(v).padStart(w, '0');
      const vals = { d: pad(d, 3), h: pad(h), m: pad(m), s: pad(s) };
      $$('[data-unit]', n).forEach((el) => {
        const v = vals[el.dataset.unit];
        if (el.textContent !== v) el.textContent = v;
      });
    });

    const tick = () => {
      const now = Date.now();
      tickUnits(now);
      nodes.forEach((n) => {
        const target = Date.parse(n.dataset.countdown);
        if (Number.isNaN(target)) return;
        let ms = target - now;
        if (ms <= 0) { n.textContent = n.dataset.past || 'Closed'; return; }
        const d = Math.floor(ms / 864e5); ms -= d * 864e5;
        const h = Math.floor(ms / 36e5);  ms -= h * 36e5;
        const m = Math.floor(ms / 6e4);   ms -= m * 6e4;
        const s = Math.floor(ms / 1e3);
        const pad = (v) => String(v).padStart(2, '0');
        n.innerHTML = n.dataset.compact === ''
          ? `<b>${d}</b>d`
          : `<b>${d}</b>d <b>${pad(h)}</b>h <b>${pad(m)}</b>m <b>${pad(s)}</b>s`;
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ══ 4. REVEAL — schematics draw themselves once, in place ══════════════ */

  function initReveal() {
    const plans = $$('.arena-plan');
    plans.forEach((p) => {
      $$('[data-draw]', p).forEach((el) => {
        const len = typeof el.getTotalLength === 'function' ? el.getTotalLength() : 400;
        el.style.setProperty('--len', String(Math.ceil(len)));
      });
    });
    const stations = $$('.station');
    if (REDUCED || !('IntersectionObserver' in window)) {
      plans.forEach((p) => p.classList.add('drawn'));
      stations.forEach((s) => s.classList.add('lit'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains('station') ? 'lit' : 'drawn');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    [...plans, ...stations].forEach((el) => io.observe(el));
  }

  /* ══ 5. EVENT FILTERS ═══════════════════════════════════════════════════ */

  function initFilters() {
    const bar = $('#filters');
    if (!bar) return;
    const rows = $$('.arena');
    const count = $('#filterCount');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter');
      if (!btn) return;
      const f = btn.dataset.f;
      $$('.filter', bar).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let shown = 0;
      rows.forEach((r) => {
        const on = f === 'all' || r.dataset.cat === f;
        if (on) shown++;
        r.classList.toggle('out', !on);
        setTimeout(() => { r.hidden = !on; }, on || REDUCED ? 0 : 320);
        if (on) r.hidden = false;
      });
      if (count) count.textContent = shown === rows.length
        ? `All ${rows.length} events` : `${shown} of ${rows.length} events`;
    });
  }

  /* ══ 6. COMMAND PALETTE ═════════════════════════════════════════════════
     Nineteen pages is past the point where a nav bar is enough. */

  function initPalette() {
    const modal = $('#cmdk');
    if (!modal || !window.FEST_INDEX) return;
    const input = $('#cmdkInput'), list = $('#cmdkResults');
    const items = window.FEST_INDEX;
    let active = 0, current = [], lastFocus = null;

    const norm = (s) => s.toLowerCase().normalize('NFKD');
    const mark = (text, q) => {
      if (!q) return escapeHtml(text);
      const i = norm(text).indexOf(norm(q));
      if (i < 0) return escapeHtml(text);
      return escapeHtml(text.slice(0, i)) + '<mark>' +
        escapeHtml(text.slice(i, i + q.length)) + '</mark>' + escapeHtml(text.slice(i + q.length));
    };
    const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* Rank: title prefix beats title contains beats body contains. */
    function search(q) {
      if (!q.trim()) return items.filter((i) => i.top).slice(0, 12);
      const n = norm(q.trim());
      return items
        .map((i) => {
          const t = norm(i.t), b = norm(i.b || '');
          let score = -1;
          if (t.startsWith(n)) score = 0;
          else if (t.includes(n)) score = 1;
          else if (b.includes(n)) score = 2;
          return score < 0 ? null : { ...i, score };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score || a.t.length - b.t.length)
        .slice(0, 24);
    }

    function render(q) {
      current = search(q);
      active = 0;
      if (!current.length) {
        list.innerHTML = `<p class="cmdk-empty">Nothing matches “${escapeHtml(q)}”. Try an event name, a rule, or a date.</p>`;
        return;
      }
      let html = '', group = null;
      current.forEach((it, i) => {
        if (it.g !== group) { group = it.g; html += `<p class="cmdk-group">${escapeHtml(group)}</p>`; }
        html += `<a class="cmdk-item" role="option" id="cmdk-o${i}" href="${it.u}" aria-selected="${i === 0}">
            <span><span class="cmdk-t">${mark(it.t, q.trim())}</span>${it.b ? `<span class="cmdk-s">${escapeHtml(it.b)}</span>` : ''}</span>
            <span class="cmdk-r">${escapeHtml(it.r || '')}</span></a>`;
      });
      list.innerHTML = html;
      input.setAttribute('aria-activedescendant', 'cmdk-o0');
    }

    function move(d) {
      const els = $$('.cmdk-item', list);
      if (!els.length) return;
      els[active]?.setAttribute('aria-selected', 'false');
      active = (active + d + els.length) % els.length;
      const el = els[active];
      el.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    }

    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      input.value = '';
      render('');
      input.focus();
    }
    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
      lastFocus?.focus();
    }

    $$('[data-cmdk-open]').forEach((b) => b.addEventListener('click', open));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); $$('.cmdk-item', list)[active]?.click(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); modal.hidden ? open() : close(); }
      else if (e.key === '/' && modal.hidden && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); open();
      }
    });
  }

  /* ══ 7. FIGURE HOST — shared canvas plumbing ════════════════════════════
     Handles DPR scaling, resize, theme repaint and reduced-motion. Each
     simulation supplies step() and draw(); none of them worry about pixels. */

  function mountCanvas(fig, { aspect = 0.66, sim }) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', fig.dataset.alt || 'Simulation figure');
    $('.fig-body', fig).prepend(canvas);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, raf = 0, running = false;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || fig.clientWidth || 600;
      W = w; H = Math.round(w * aspect);
      canvas.style.height = H + 'px';
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.layout?.(W, H);
      sim.draw(ctx, W, H);
    }

    let last = 0;
    function frame(t) {
      if (!running) return;
      const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      sim.step(dt);
      sim.draw(ctx, W, H);
      raf = requestAnimationFrame(frame);
    }
    const api = {
      canvas, fig,
      start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); },
      repaint() { sim.draw(ctx, W, H); },
      resize,
    };

    addEventListener('resize', () => { resize(); }, { passive: true });
    document.addEventListener('themechange', () => { sim.themed?.(); resize(); });

    /* Only run while on screen. */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        es.forEach((e) => (e.isIntersecting && !REDUCED ? api.start() : api.stop()));
      }, { threshold: 0.15 }).observe(fig);
    }
    resize();
    if (REDUCED) { for (let i = 0; i < 900; i++) sim.step(1 / 60); sim.draw(ctx, W, H); }
    return api;
  }

  /* ══ 8. SLAM — Terra Incognita ══════════════════════════════════════════
     A rover with no prior map runs a coverage sweep, ranging as it goes.
     Two paths are drawn: where it actually is, and where it believes it is.
     Odometry noise pushes them apart; recognising previously-mapped ground
     closes the loop and pulls the belief back. That divergence, and its
     correction, is the event. */

  function slamSim() {
    const COLS = 56, ROWS = 34;
    let W = 600, H = 400, cw = 10, ch = 10, ox = 0, oy = 0;

    /* Ground truth the rover cannot see. Walls plus interior obstacles. */
    const truth = new Uint8Array(COLS * ROWS);
    const at = (x, y) => y * COLS + x;
    const rand = rng(20261208);
    (function buildArena() {
      for (let x = 0; x < COLS; x++) { truth[at(x, 0)] = 1; truth[at(x, ROWS - 1)] = 1; }
      for (let y = 0; y < ROWS; y++) { truth[at(0, y)] = 1; truth[at(COLS - 1, y)] = 1; }
      const blocks = [
        [8, 6, 5, 9], [20, 4, 4, 7], [33, 8, 8, 4], [46, 5, 4, 11],
        [12, 21, 9, 4], [27, 18, 4, 10], [38, 24, 10, 4], [6, 28, 5, 3],
      ];
      blocks.forEach(([bx, by, bw, bh]) => {
        for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++)
          if (x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1) truth[at(x, y)] = 1;
      });
    })();

    /* Belief: log-odds occupancy. 0 unknown, <0 free, >0 occupied. */
    const grid = new Float32Array(COLS * ROWS);

    /* Boustrophedon coverage waypoints, in cell coordinates. */
    const route = [];
    for (let i = 0, y = 3; y < ROWS - 3; y += 5, i++) {
      const l = 3, r = COLS - 4;
      route.push(i % 2 ? [r, y] : [l, y], i % 2 ? [l, y] : [r, y]);
    }
    const START = { x: 3, y: 3 };

    const state = {
      true: { x: START.x, y: START.y, th: 0 },
      belief: { x: START.x, y: START.y, th: 0 },
      wp: 1, t: 0, closures: 0, blockPushed: false, done: false,
      truePath: [[START.x, START.y]], beliefPath: [[START.x, START.y]],
      visited: new Set(['3,3']),
      pulse: 0,
    };

    function layout(w, h) {
      W = w; H = h;
      const pad = 14;
      cw = (W - pad * 2) / COLS; ch = (H - pad * 2) / ROWS;
      const s = Math.min(cw, ch); cw = ch = s;
      ox = (W - s * COLS) / 2; oy = (H - s * ROWS) / 2;
    }
    const px = (cx) => ox + cx * cw;
    const py = (cy) => oy + cy * ch;

    /* Range sensing: cast rays, mark free space along each, occupied at hit.
       Ultrasonic/ToF class sensor — short range, a handful of beams. */
    function sense() {
      const RAYS = 24, MAXR = 7.5;
      const { x, y, th } = state.true;
      for (let i = 0; i < RAYS; i++) {
        const a = th + (i / RAYS) * Math.PI * 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        for (let r = 0.3; r < MAXR; r += 0.28) {
          const gx = Math.round(x + dx * r), gy = Math.round(y + dy * r);
          if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) break;
          const k = at(gx, gy);
          if (truth[k]) { grid[k] = Math.min(grid[k] + 1.4, 5); break; }
          grid[k] = Math.max(grid[k] - 0.32, -3);
        }
      }
    }

    function driveTowards(tx, ty, dt) {
      const s = state.true;
      const dx = tx - s.x, dy = ty - s.y;
      const dist = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx);
      let da = ((want - s.th + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      s.th += clamp(da, -3.2 * dt, 3.2 * dt);
      const speed = 5.6 * dt * clamp(1 - Math.abs(da), 0.25, 1);
      s.x += Math.cos(s.th) * speed; s.y += Math.sin(s.th) * speed;
      return dist;
    }

    function step(dt) {
      if (state.done) { state.pulse = Math.max(0, state.pulse - dt); return; }
      state.t += dt;

      const target = state.wp < route.length ? route[state.wp] : [START.x, START.y];
      const dist = driveTowards(target[0], target[1], dt);

      /* Odometry integrates with drift — the belief is always a little wrong. */
      const b = state.belief;
      const driftScale = 1 + gauss(rand) * 0.055;
      const dxT = state.true.x - state.truePath[state.truePath.length - 1][0];
      const dyT = state.true.y - state.truePath[state.truePath.length - 1][1];
      b.th = state.true.th + gauss(rand) * 0.02;
      b.x += dxT * driftScale + gauss(rand) * 0.014;
      b.y += dyT * driftScale + gauss(rand) * 0.014;

      sense();

      const lastT = state.truePath[state.truePath.length - 1];
      if (Math.hypot(state.true.x - lastT[0], state.true.y - lastT[1]) > 0.5) {
        state.truePath.push([state.true.x, state.true.y]);
        state.beliefPath.push([b.x, b.y]);
      }

      /* Loop closure: the rover recognises ground it has already mapped and
         snaps its estimate back toward truth. This is the correction the
         rulebook is really asking teams to implement. */
      const key = `${Math.round(state.true.x)},${Math.round(state.true.y)}`;
      if (state.visited.has(key) && Math.hypot(b.x - state.true.x, b.y - state.true.y) > 0.75) {
        b.x = lerp(b.x, state.true.x, 0.65);
        b.y = lerp(b.y, state.true.y, 0.65);
        state.closures++; state.pulse = 0.55;
      }
      state.visited.add(key);

      /* The movable block, pushed partway round — brochure rule 2. */
      if (!state.blockPushed && state.wp > route.length * 0.45) state.blockPushed = true;

      if (dist < 0.8) {
        state.wp++;
        if (state.wp > route.length) { state.done = true; state.pulse = 1; }
      }
      readout();
    }

    let known = 0;
    function readout() {
      known = 0;
      for (let i = 0; i < grid.length; i++) if (grid[i] !== 0) known++;
      const cov = Math.round((known / grid.length) * 100);
      const err = Math.hypot(state.belief.x - state.true.x, state.belief.y - state.true.y);
      const rd = $('#slamRead');
      if (rd) rd.textContent = `coverage ${String(cov).padStart(2, '0')}%   drift ${err.toFixed(2)}   closures ${state.closures}`;
      const st = $('#slamStatus');
      if (st) st.textContent = state.done
        ? 'Traverse complete · returned to start, map closed'
        : state.blockPushed ? 'Block located and pushed · continuing sweep'
        : 'Surveying · obstacles resolve as they are found';
    }

    function draw(ctx, w, h) {
      const C = {
        sheet: css('--sheet-hi'), rule: css('--rule-soft'), ruleH: css('--rule'),
        ink: css('--ink'), faint: css('--ink-faint'), sig: css('--signal'),
      };
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.sheet; ctx.fillRect(0, 0, w, h);

      /* Drafting grid */
      ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= COLS; x += 4) { ctx.moveTo(px(x) + .5, py(0)); ctx.lineTo(px(x) + .5, py(ROWS)); }
      for (let y = 0; y <= ROWS; y += 4) { ctx.moveTo(px(0), py(y) + .5); ctx.lineTo(px(COLS), py(y) + .5); }
      ctx.stroke();

      /* Discovered map: free space pale, occupied solid. Undiscovered stays blank —
         the rover only knows what it has seen. */
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const v = grid[at(x, y)];
          if (v === 0) continue;
          if (v > 0.6) { ctx.fillStyle = C.ink; ctx.globalAlpha = clamp(v / 4, 0.35, 0.92); }
          else if (v < -0.4) { ctx.fillStyle = C.faint; ctx.globalAlpha = 0.10; }
          else continue;
          ctx.fillRect(px(x), py(y), cw + 0.6, ch + 0.6);
        }
      }
      ctx.globalAlpha = 1;

      /* Arena boundary — the reference the map is scored against. */
      ctx.strokeStyle = C.faint; ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]);
      ctx.strokeRect(px(0.5), py(0.5), cw * (COLS - 1), ch * (ROWS - 1));
      ctx.setLineDash([]);

      const path = (pts, stroke, width, alpha = 1, dash = null) => {
        if (pts.length < 2) return;
        ctx.save();
        ctx.globalAlpha = alpha; ctx.strokeStyle = stroke; ctx.lineWidth = width;
        ctx.lineJoin = ctx.lineCap = 'round';
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(px(pts[0][0]), py(pts[0][1]));
        for (let i = 1; i < pts.length; i++) ctx.lineTo(px(pts[i][0]), py(pts[i][1]));
        ctx.stroke(); ctx.restore();
      };
      path(state.truePath, C.faint, 1.2, 0.55, [3, 3]);   // where it really went
      path(state.beliefPath, C.sig, 2, 1);                 // where it thinks it went

      /* The pushed block */
      const bx = px(COLS * 0.52), by = py(ROWS * 0.5);
      ctx.fillStyle = state.blockPushed ? C.sig : C.faint;
      ctx.fillRect(bx - 5, by - 5, 10, 10);

      /* Rover: true pose hollow, believed pose solid. */
      const T = state.true, B = state.belief;
      ctx.strokeStyle = C.faint; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(px(T.x), py(T.y), 4.5, 0, 7); ctx.stroke();

      if (state.pulse > 0) {
        ctx.strokeStyle = C.sig; ctx.globalAlpha = state.pulse;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(px(B.x), py(B.y), 6 + (1 - state.pulse) * 22, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = C.sig;
      ctx.beginPath(); ctx.arc(px(B.x), py(B.y), 4, 0, 7); ctx.fill();
      ctx.strokeStyle = C.sig; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px(B.x), py(B.y));
      ctx.lineTo(px(B.x) + Math.cos(B.th) * 11, py(B.y) + Math.sin(B.th) * 11); ctx.stroke();

      /* Start marker — the point it must return to. */
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(px(START.x) - 6, py(START.y)); ctx.lineTo(px(START.x) + 6, py(START.y));
      ctx.moveTo(px(START.x), py(START.y) - 6); ctx.lineTo(px(START.x), py(START.y) + 6);
      ctx.stroke();
    }

    function reset() {
      grid.fill(0);
      Object.assign(state, {
        true: { x: START.x, y: START.y, th: 0 },
        belief: { x: START.x, y: START.y, th: 0 },
        wp: 1, t: 0, closures: 0, blockPushed: false, done: false,
        truePath: [[START.x, START.y]], beliefPath: [[START.x, START.y]],
        visited: new Set(['3,3']), pulse: 0,
      });
    }
    return { layout, step, draw, reset };
  }

  function initSlam() {
    const fig = $('[data-sim="slam"]');
    if (!fig) return;
    const sim = slamSim();
    const host = mountCanvas(fig, { aspect: 0.62, sim });
    $('#slamReplay')?.addEventListener('click', () => { sim.reset(); host.resize(); host.start(); });
  }

  /* ══ 9. A* — Half-Life ══════════════════════════════════════════════════
     The AGV carries objects through a corridor network to coloured bins, and
     a symbol shown before the run can redirect a class to a different bin.
     Flip the symbol and watch the search re-plan: the frontier expands in
     real time, so the cost of the rule change is visible, not asserted. */

  function initAstar() {
    const fig = $('[data-sim="astar"]');
    if (!fig) return;

    const COLS = 30, ROWS = 19;
    const wall = new Uint8Array(COLS * ROWS);
    const at = (x, y) => y * COLS + x;
    for (let x = 0; x < COLS; x++) { wall[at(x, 0)] = 1; wall[at(x, ROWS - 1)] = 1; }
    for (let y = 0; y < ROWS; y++) { wall[at(0, y)] = 1; wall[at(COLS - 1, y)] = 1; }
    /* Corridor network: partitions with doorways. */
    [[7, 1, 12], [15, 4, 18], [22, 1, 10], [22, 13, 17]].forEach(([x, y0, y1]) => {
      for (let y = y0; y <= y1; y++) wall[at(x, y)] = 1;
    });
    [[1, 12, 6, 9], [8, 21, 12, 5]].forEach(([x0, x1, y]) => {
      for (let x = x0; x <= x1; x++) wall[at(x, y)] = 1;
    });
    [[7, 6], [7, 7], [15, 10], [15, 11], [22, 6], [22, 7], [4, 9], [10, 12], [22, 12]].forEach(([x, y]) => { wall[at(x, y)] = 0; });

    const BINS = {
      hazardous: { x: 27, y: 3, label: 'HAZ' },
      fragile:   { x: 27, y: 9, label: 'FRG' },
      normal:    { x: 27, y: 15, label: 'NRM' },
    };
    const START = { x: 3, y: 16 };
    const OBJECT = { x: 11, y: 4 };

    let cls = 'hazardous';
    let symbol = 'none';         // none | redirect | reverse
    const target = () => {
      if (symbol === 'redirect') return cls === 'hazardous' ? BINS.normal : cls === 'normal' ? BINS.fragile : BINS.hazardous;
      return BINS[cls];
    };

    /* A* with a visit-order stamp, so the expansion can be animated. */
    function plan(from, to) {
      const g = new Float32Array(COLS * ROWS).fill(Infinity);
      const came = new Int32Array(COLS * ROWS).fill(-1);
      const order = new Int32Array(COLS * ROWS).fill(-1);
      const h = (x, y) => Math.abs(x - to.x) + Math.abs(y - to.y);
      const open = [[h(from.x, from.y), at(from.x, from.y)]];
      g[at(from.x, from.y)] = 0;
      let stamp = 0, found = false;
      while (open.length) {
        open.sort((a, b) => a[0] - b[0]);
        const [, k] = open.shift();
        if (order[k] >= 0) continue;
        order[k] = stamp++;
        const cx = k % COLS, cy = (k / COLS) | 0;
        if (cx === to.x && cy === to.y) { found = true; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || wall[at(nx, ny)]) continue;
          const nk = at(nx, ny), ng = g[k] + 1;
          if (ng < g[nk]) { g[nk] = ng; came[nk] = k; open.push([ng + h(nx, ny), nk]); }
        }
      }
      const path = [];
      if (found) { let k = at(to.x, to.y); while (k >= 0) { path.push([k % COLS, (k / COLS) | 0]); k = came[k]; } path.reverse(); }
      return { order, path, expanded: stamp };
    }

    let legA = plan(START, OBJECT), legB = plan(OBJECT, target());
    let anim = 0;

    const sim = {
      step(dt) { anim = Math.min(anim + dt * 0.55, 1); },
      draw(ctx, w, h) {
        const C = {
          sheet: css('--sheet-hi'), rule: css('--rule-soft'), ink: css('--ink'),
          faint: css('--ink-faint'), sig: css('--signal'),
        };
        const pad = 12;
        const s = Math.min((w - pad * 2) / COLS, (h - pad * 2) / ROWS);
        const ox = (w - s * COLS) / 2, oy = (h - s * ROWS) / 2;
        const X = (c) => ox + c * s, Y = (c) => oy + c * s;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = C.sheet; ctx.fillRect(0, 0, w, h);

        /* Expanded frontier — the search cost, drawn */
        const maxA = legA.expanded, maxB = legB.expanded;
        const drawOrder = (res, max, limit) => {
          for (let i = 0; i < res.order.length; i++) {
            const o = res.order[i];
            if (o < 0 || o > max * limit) continue;
            ctx.globalAlpha = 0.30 * (1 - o / max) + 0.05;
            ctx.fillStyle = C.faint;
            ctx.fillRect(X(i % COLS), Y((i / COLS) | 0), s, s);
          }
          ctx.globalAlpha = 1;
        };
        drawOrder(legA, maxA, clamp(anim * 2, 0, 1));
        if (anim > 0.5) drawOrder(legB, maxB, clamp((anim - 0.5) * 2, 0, 1));

        /* Walls */
        ctx.fillStyle = C.ink;
        for (let i = 0; i < wall.length; i++) if (wall[i]) ctx.fillRect(X(i % COLS), Y((i / COLS) | 0), s, s);

        /* Bins */
        Object.entries(BINS).forEach(([k, b]) => {
          const isTarget = target() === b;
          ctx.strokeStyle = isTarget ? C.sig : C.faint;
          ctx.lineWidth = isTarget ? 2 : 1.2;
          ctx.strokeRect(X(b.x) - s * 1.1, Y(b.y) - s * 1.1, s * 2.4, s * 2.4);
          ctx.fillStyle = isTarget ? C.sig : C.faint;
          ctx.font = `700 ${clamp(s * 0.5, 8, 11)}px ${css('--font')}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(b.label, X(b.x) + s / 2, Y(b.y) + s * 1.9);
        });

        /* Routes */
        const line = (pts, colour, width, limit) => {
          const n = Math.max(2, Math.floor(pts.length * limit));
          if (pts.length < 2) return;
          ctx.strokeStyle = colour; ctx.lineWidth = width;
          ctx.lineJoin = ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(X(pts[0][0]) + s / 2, Y(pts[0][1]) + s / 2);
          for (let i = 1; i < n; i++) ctx.lineTo(X(pts[i][0]) + s / 2, Y(pts[i][1]) + s / 2);
          ctx.stroke();
        };
        line(legA.path, C.faint, 2, clamp(anim * 2, 0, 1));
        if (anim > 0.5) line(legB.path, C.sig, 2.4, clamp((anim - 0.5) * 2, 0, 1));

        /* Markers */
        const dot = (c, colour, r = 4) => {
          ctx.fillStyle = colour; ctx.beginPath();
          ctx.arc(X(c.x) + s / 2, Y(c.y) + s / 2, r, 0, 7); ctx.fill();
        };
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(X(START.x) - 3, Y(START.y) + s / 2); ctx.lineTo(X(START.x) + s + 3, Y(START.y) + s / 2);
        ctx.moveTo(X(START.x) + s / 2, Y(START.y) - 3); ctx.lineTo(X(START.x) + s / 2, Y(START.y) + s + 3);
        ctx.stroke();
        dot(OBJECT, C.ink, 5);

        const read = $('#agvRead');
        if (read) read.textContent =
          `nodes ${legA.expanded + legB.expanded}   route ${legA.path.length + legB.path.length} cells   rule ${symbol}`;
      },
    };

    mountCanvas(fig, { aspect: 0.62, sim });

    function replan() { legA = plan(START, OBJECT); legB = plan(OBJECT, target()); anim = 0; }

    $$('[data-agv-class]', fig).forEach((b) => b.addEventListener('click', () => {
      cls = b.dataset.agvClass;
      $$('[data-agv-class]', fig).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      replan();
    }));
    $$('[data-agv-symbol]', fig).forEach((b) => b.addEventListener('click', () => {
      symbol = b.dataset.agvSymbol;
      $$('[data-agv-symbol]', fig).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      replan();
    }));
  }

  /* ══ 10. SUMO — Brinkmanship ════════════════════════════════════════════
     Two disks, real contact impulses, a warning band at the rim. The match
     opens autonomous, then control transfers on the referee's signal — which
     is exactly the rule, and exactly what you watch happen. */

  function initSumo() {
    const fig = $('[data-sim="sumo"]');
    if (!fig) return;

    const R = 1.0, BAND = 0.86, BOT = 0.1;
    const rand = rng(4815162342);
    let phase = 'auto', t = 0, score = [0, 0], round = 1;
    let bots = seed();

    function seed() {
      return [
        { x: -0.45, y: 0.0, vx: 0, vy: 0, m: 1, id: 0 },
        { x: 0.45, y: 0.0, vx: 0, vy: 0, m: 1, id: 1 },
      ];
    }

    function step(dt) {
      t += dt;
      if (phase === 'auto' && t > 3) phase = 'manual';

      bots.forEach((b, i) => {
        const o = bots[1 - i];
        let ax = 0, ay = 0;
        if (phase === 'auto') {
          /* Autonomous: search outward, then square up on the opponent. */
          const ang = Math.atan2(-b.y, -b.x) + Math.sin(t * 1.6 + i * 2) * 0.6;
          ax = Math.cos(ang) * 0.75; ay = Math.sin(ang) * 0.75;
        } else {
          /* Manual: drive at the opponent, with a shove toward the rim. */
          const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) || 1;
          const skill = i === 0 ? 1.0 : 0.86;   // one driver is sharper
          ax = (dx / d) * 1.5 * skill + Math.cos(t * 3 + i) * 0.18;
          ay = (dy / d) * 1.5 * skill + Math.sin(t * 3 + i) * 0.18;
        }
        b.vx = (b.vx + ax * dt) * 0.965;
        b.vy = (b.vy + ay * dt) * 0.965;
        b.x += b.vx * dt; b.y += b.vy * dt;
      });

      /* Contact impulse — a pushing contest, so equal and opposite. */
      const [a, b] = bots;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < BOT * 2 && d > 1e-6) {
        const nx = dx / d, ny = dy / d;
        const overlap = BOT * 2 - d;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const j = -1.35 * rel / 2;
          a.vx -= j * nx; a.vy -= j * ny;
          b.vx += j * nx; b.vy += j * ny;
        }
      }

      /* Push-out */
      bots.forEach((bot, i) => {
        if (Math.hypot(bot.x, bot.y) > R - BOT * 0.4) {
          score[1 - i]++; round++;
          bots = seed(); phase = 'auto'; t = 0;
        }
      });

      const read = $('#sumoRead');
      if (read) read.textContent = `round ${round}   ${score[0]}–${score[1]}   ${phase === 'auto' ? 'autonomous phase' : 'manual control'}`;
    }

    function draw(ctx, w, h) {
      const C = {
        sheet: css('--sheet-hi'), rule: css('--rule-soft'), ink: css('--ink'),
        faint: css('--ink-faint'), sig: css('--signal'),
      };
      const cx = w / 2, cy = h / 2, s = Math.min(w * 0.42, h * 0.44);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.sheet; ctx.fillRect(0, 0, w, h);

      /* Ring */
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(cx, cy, s, 0, 7); ctx.stroke();
      /* Warning band */
      ctx.strokeStyle = C.sig; ctx.lineWidth = Math.max(3, s * (1 - BAND));
      ctx.globalAlpha = 0.28;
      ctx.beginPath(); ctx.arc(cx, cy, s * (BAND + (1 - BAND) / 2), 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
      /* Centre lines */
      ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.3, cy); ctx.lineTo(cx + s * 0.3, cy);
      ctx.moveTo(cx, cy - s * 0.3); ctx.lineTo(cx, cy + s * 0.3);
      ctx.stroke();

      bots.forEach((b, i) => {
        const x = cx + b.x * s, y = cy + b.y * s, r = BOT * s;
        ctx.fillStyle = i === 0 ? C.ink : C.sig;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 0.05) {
          ctx.strokeStyle = i === 0 ? C.ink : C.sig; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.lineTo(x + (b.vx / sp) * r * 2.2, y + (b.vy / sp) * r * 2.2); ctx.stroke();
        }
      });

      ctx.fillStyle = C.faint;
      ctx.font = `600 10px ${css('--font')}`;
      ctx.textAlign = 'center';
      ctx.fillText(phase === 'auto' ? 'AUTONOMOUS · NO DRIVING' : 'MANUAL · REFEREE HAS SIGNALLED', cx, cy + s + 20);
    }

    mountCanvas(fig, { aspect: 0.54, sim: { step, draw } });
    $('#sumoReset')?.addEventListener('click', () => { bots = seed(); phase = 'auto'; t = 0; score = [0, 0]; round = 1; });
  }

  /* ══ 11. CONFUSION MATRIX — The Black Box ═══════════════════════════════
     Thirty unseen test images, a biased baseline, and ten targeted photos to
     spend. Click a cell to see which failure mode put it there; spend the fix
     budget and watch the diagonal firm up. That is the whole event. */

  function initConfusion() {
    const root = $('[data-sim="confusion"]');
    if (!root) return;
    const CLASSES = ['Bolt', 'Nut', 'Washer'];
    const FAULTS = ['Colour bias', 'Background bias', 'Angle', 'Occlusion', 'Too few samples'];

    /* Baseline: 30 test images, biased against Washer (under-sampled) and
       confusing Nut/Washer under poor lighting. */
    const before = [
      [8, 1, 1],
      [1, 6, 3],
      [2, 4, 4],
    ];
    const after = [
      [9, 1, 0],
      [1, 8, 1],
      [1, 2, 7],
    ];
    const faultOf = [
      [null, 'Angle', 'Occlusion'],
      ['Background bias', null, 'Colour bias'],
      ['Occlusion', 'Colour bias', null],
    ];

    let fixed = false, sel = null;
    const grid = $('#cmGrid'), detail = $('#cmDetail'), acc = $('#cmAcc'), btn = $('#cmFix');

    const total = (m) => m.flat().reduce((a, b) => a + b, 0);
    const correct = (m) => m.reduce((a, r, i) => a + r[i], 0);

    function render() {
      const m = fixed ? after : before;
      const max = Math.max(...m.flat());
      let html = '<div class="cm-corner"><span class="annot">true ↓ / pred →</span></div>';
      CLASSES.forEach((c) => { html += `<div class="cm-h">${c}</div>`; });
      m.forEach((row, i) => {
        html += `<div class="cm-h cm-h--row">${CLASSES[i]}</div>`;
        row.forEach((v, j) => {
          const diag = i === j;
          const a = max ? v / max : 0;
          html += `<button class="cm-cell${diag ? ' cm-cell--diag' : ''}${sel === `${i},${j}` ? ' cm-cell--sel' : ''}"
             data-cell="${i},${j}" aria-label="${CLASSES[i]} predicted as ${CLASSES[j]}: ${v}"
             style="--a:${a.toFixed(3)}">${v}</button>`;
        });
      });
      grid.innerHTML = html;
      const pct = Math.round((correct(m) / total(m)) * 100);
      acc.innerHTML = fixed
        ? `<b>${pct}%</b> <span class="cm-delta">▲ ${pct - Math.round((correct(before) / total(before)) * 100)} pts</span>`
        : `<b>${pct}%</b>`;
      if (sel) {
        const [i, j] = sel.split(',').map(Number);
        const v = m[i][j];
        detail.innerHTML = i === j
          ? `<strong>${v} of ${m[i].reduce((a, b) => a + b, 0)}</strong> ${CLASSES[i]} images classified correctly.`
          : `<strong>${v}</strong> ${CLASSES[i]} image${v === 1 ? '' : 's'} misread as <strong>${CLASSES[j]}</strong>. Dominant failure mode: <strong>${faultOf[i][j]}</strong>.`;
      } else {
        detail.innerHTML = 'Select a cell to read the failure mode behind it. Off-diagonal cells are where the marks are.';
      }
      if (btn) {
        btn.textContent = fixed ? 'Reset to baseline' : `Spend 10 targeted images`;
        btn.setAttribute('aria-pressed', String(fixed));
      }
    }

    grid?.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-cell]');
      if (!cell) return;
      sel = sel === cell.dataset.cell ? null : cell.dataset.cell;
      render();
    });
    btn?.addEventListener('click', () => { fixed = !fixed; render(); });

    const tally = $('#cmTally');
    if (tally) {
      const counts = {};
      faultOf.flat().filter(Boolean).forEach((f) => { counts[f] = (counts[f] || 0) + 1; });
      tally.innerHTML = FAULTS.map((f) => {
        const n = counts[f] || 0;
        return `<li><span>${f}</span><span class="cm-bar"><i style="width:${(n / 2) * 100}%"></i></span><span class="num">${n}</span></li>`;
      }).join('');
    }
    render();
  }

  /* ══ 12. COMPLEXITY — Algorithm Challenge ═══════════════════════════════
     The rulebook asks for programs that are "correct, efficient, and capable
     of handling all valid test cases". This is what efficient means at the
     input sizes a judge will use. */

  function initComplexity() {
    const fig = $('[data-sim="complexity"]');
    if (!fig) return;
    const CURVES = [
      { k: 'log n',  f: (n) => Math.log2(n),           sig: false },
      { k: 'n',      f: (n) => n,                      sig: false },
      { k: 'n log n',f: (n) => n * Math.log2(n),       sig: true  },
      { k: 'n²',     f: (n) => n * n,                  sig: false },
      { k: '2ⁿ',     f: (n) => Math.pow(2, Math.min(n, 40)), sig: false },
    ];
    let n = 512;

    const sim = {
      step() {},
      draw(ctx, w, h) {
        const C = {
          sheet: css('--sheet-hi'), rule: css('--rule-soft'), ink: css('--ink'),
          faint: css('--ink-faint'), sig: css('--signal'),
        };
        const L = 46, Rp = 58, T = 16, B = 30;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = C.sheet; ctx.fillRect(0, 0, w, h);

        const maxY = Math.log10(Math.max(1e2, CURVES[3].f(n)) + 1) + 0.4;
        const X = (v) => L + (v / n) * (w - L - Rp);
        const Y = (v) => h - B - (Math.log10(v + 1) / maxY) * (h - T - B);

        ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let g = 0; g <= 6; g++) {
          const y = T + ((h - T - B) / 6) * g;
          ctx.moveTo(L, y + .5); ctx.lineTo(w - Rp, y + .5);
        }
        ctx.stroke();

        ctx.strokeStyle = C.faint; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(L + .5, T); ctx.lineTo(L + .5, h - B + .5); ctx.lineTo(w - Rp, h - B + .5);
        ctx.stroke();

        ctx.font = `600 9.5px ${css('--font')}`;
        ctx.fillStyle = C.faint; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [1, 1e2, 1e4, 1e6, 1e8].forEach((v) => {
          if (Math.log10(v + 1) / maxY > 1.02) return;
          ctx.fillText(v >= 1e4 ? `1e${Math.log10(v)}` : String(v), L - 6, Y(v));
        });
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('0', L, h - B + 7);
        ctx.fillText(`n = ${n}`, (L + w - Rp) / 2, h - B + 7);

        CURVES.forEach((c) => {
          ctx.strokeStyle = c.sig ? C.sig : C.faint;
          ctx.lineWidth = c.sig ? 2.2 : 1.3;
          ctx.globalAlpha = c.sig ? 1 : 0.75;
          ctx.beginPath();
          for (let i = 0; i <= 120; i++) {
            const x = Math.max(1, (i / 120) * n);
            const y = c.f(x);
            const py = clamp(Y(y), T - 40, h - B);
            i ? ctx.lineTo(X(x), py) : ctx.moveTo(X(x), py);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
          const endY = clamp(Y(c.f(n)), T + 4, h - B - 2);
          ctx.fillStyle = c.sig ? C.sig : C.faint;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.font = `${c.sig ? 700 : 600} 10.5px ${css('--font')}`;
          ctx.fillText(c.k, w - Rp + 7, endY);
        });

        const read = $('#cxRead');
        if (read) {
          const ops = CURVES[3].f(n);
          read.textContent = `n = ${n}   n² = ${ops.toLocaleString('en-IN')} operations`;
        }
      },
    };
    const host = mountCanvas(fig, { aspect: 0.55, sim });
    host.stop();
    const slider = $('#cxN');
    slider?.addEventListener('input', () => { n = Number(slider.value); host.repaint(); });
  }

  /* ══ 13. BOOT ═══════════════════════════════════════════════════════════ */

  function boot() {
    Theme.init();
    initDrawer();
    initCountdown();
    initReveal();
    initFilters();
    initPalette();
    initSlam();
    initAstar();
    initSumo();
    initConfusion();
    initComplexity();
    document.documentElement.classList.add('js');
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();

/* ============================================================================
   PART TWO — people, letters, and finding your way around.
   Kept in its own scope so the simulation code above stays self-contained.
   ========================================================================== */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══ A. PORTRAITS ═══════════════════════════════════════════════════════
     Every portrait ships with its drawn stand-in already underneath. If the
     photograph is missing — and most of them are, for now — the image element
     takes itself out of the way and the frame shows what it is waiting for.
     No broken-image icon, no empty box, no silent gap. */

  function initPortraits() {
    $$('.mug-frame img').forEach((img) => {
      const drop = () => { img.remove(); };
      if (img.complete && img.naturalWidth === 0) drop();
      else img.addEventListener('error', drop, { once: true });
    });
  }

  /* ══ B. LETTERS ═════════════════════════════════════════════════════════
     Three letters in a row. Open one and it takes the full width: its portrait
     grows into the space, the text reflows beside it, and the other two fold
     into vertical spines that stay clickable. The row animates as one object
     because the movement is a single grid-template-columns transition — the
     cards are not individually animated, they are simply carried by it. */

  function initLetters() {
    const row = $('#letters');
    if (!row) return;
    const cards = $$('.letter', row);
    if (!cards.length) return;

    const SPINE = 68;                 // px, matches the spine padding in the CSS
    let open = -1;

    const columns = (k) => k < 0
      ? `repeat(${cards.length}, minmax(0, 1fr))`
      : cards.map((_, i) => (i === k ? 'minmax(0, 1fr)' : `${SPINE}px`)).join(' ');

    function apply(k, { focus = false } = {}) {
      open = k;
      row.style.gridTemplateColumns = columns(k);
      cards.forEach((c, i) => {
        c.dataset.state = k < 0 ? 'idle' : i === k ? 'open' : 'spine';
        const hit = $('.letter-hit', c);
        if (hit) {
          hit.setAttribute('aria-expanded', String(i === k));
          hit.setAttribute('aria-label',
            i === k ? `Close the letter from ${c.dataset.name}` : `Read the letter from ${c.dataset.name}`);
        }
        c.querySelectorAll('a, button').forEach((el) => {
          if (el.classList.contains('letter-hit') || el.classList.contains('letter-close')) return;
          /* Links inside a folded spine must leave the tab order. */
          if (c.dataset.state === 'spine') el.setAttribute('tabindex', '-1');
          else el.removeAttribute('tabindex');
        });
      });
      if (focus && k >= 0) {
        const close = $('.letter-close', cards[k]);
        close?.focus({ preventScroll: true });
      }
    }

    row.addEventListener('click', (e) => {
      const close = e.target.closest('.letter-close');
      if (close) {
        const i = cards.indexOf(close.closest('.letter'));
        apply(-1);
        $('.letter-hit', cards[i])?.focus({ preventScroll: true });
        return;
      }
      const hit = e.target.closest('.letter-hit');
      if (!hit) return;
      const card = hit.closest('.letter');
      const i = cards.indexOf(card);
      apply(i === open ? -1 : i, { focus: true });
      if (i !== open) return;
      if (!REDUCED) {
        /* Wait for the columns to settle before scrolling, or the target moves
           out from under the scroll. */
        setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 260);
      }
    });

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open >= 0) {
        const i = open;
        apply(-1);
        $('.letter-hit', cards[i])?.focus({ preventScroll: true });
      }
    });

    apply(-1);
    row.classList.add('letters--ready');
  }

  /* ══ C. FINDING YOUR WAY ════════════════════════════════════════════════
     The sheet rail carried numbers and ticks and nothing else — you had to
     already know what 04 was. It now opens on hover or keyboard focus to show
     the names, and pins open if you would rather it stayed. The preference is
     remembered, because a person who pins a nav open means it. */

  function initRail() {
    const rail = $('#rail'), pin = $('#railPin');
    if (!rail || !pin) return;
    const KEY = 'ipsc-itfest-rail';

    const set = (on) => {
      rail.dataset.pinned = String(on);
      pin.setAttribute('aria-pressed', String(on));
      const label = $('span', pin);
      if (label) label.textContent = on ? 'Unpin index' : 'Pin index';
    };

    let saved = false;
    try { saved = localStorage.getItem(KEY) === 'true'; } catch { /* private mode */ }
    set(saved);

    pin.addEventListener('click', () => {
      const next = rail.dataset.pinned !== 'true';
      set(next);
      try { localStorage.setItem(KEY, String(next)); } catch { /* ignore */ }
    });
  }

  /* ══ D. BOOT ════════════════════════════════════════════════════════════ */

  const start = () => { initPortraits(); initLetters(); initRail(); };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
