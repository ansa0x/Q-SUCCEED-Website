// ==========================================
// Q-SUCCEED-NORTH — homepage behaviour
// ==========================================
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ==========================================
  // MOBILE MENU
  // ==========================================
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuClose = mobileMenu.querySelector('.mobile-menu-close');
  const menuPanel = mobileMenu.querySelector('.mobile-menu-panel');

  function openMenu() {
    mobileMenu.classList.add('active');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    menuClose.focus();
  }

  function closeMenu(returnFocus) {
    if (!mobileMenu.classList.contains('active')) return;
    mobileMenu.classList.remove('active');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (returnFocus) hamburger.focus();
  }

  hamburger.addEventListener('click', openMenu);
  menuClose.addEventListener('click', () => closeMenu(true));

  // Close when a link is tapped
  mobileMenu.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => closeMenu(false));
  });

  // Close when tapping the backdrop outside the panel
  mobileMenu.addEventListener('click', (e) => {
    if (!menuPanel.contains(e.target)) closeMenu(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu(true);
  });

  // Close if the viewport grows past the mobile breakpoint
  window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
    if (e.matches) closeMenu(false);
  });

  // ==========================================
  // HEADER + BACK-TO-TOP ON SCROLL
  // ==========================================
  const header = document.querySelector('.header');
  const toTop = document.querySelector('.scroll-to-top');

  function onScroll() {
    const y = window.pageYOffset;
    header.classList.toggle('scrolled', y > 50);
    toTop.classList.toggle('visible', y > 500);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  // ==========================================
  // SCROLL REVEAL
  // ==========================================
  const revealEls = document.querySelectorAll('.reveal');

  // Stagger siblings inside grids
  document.querySelectorAll('.team-grid').forEach(grid => {
    grid.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.setProperty('--reveal-delay', (i * 0.1) + 's');
    });
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ==========================================
  // BEAM RUSH (arcade take on the Lab 2 laser setup)
  // Laser -> flip mirror -> upper OR lower steering mirror -> target.
  // Each steering mirror has a limited range, so the player flips between
  // them depending on where the target is. One target at a time.
  // Scoring: hit +5, target expires -3, beam clips a block -1 (never below 0).
  // Everything lives in a 1600 x 900 unit space.
  // ==========================================
  const bench = document.querySelector('.bench');

  if (bench) {
    const UW = 1600, UH = 900, DEG = Math.PI / 180;
    const RUN = 60;                 // seconds per run
    const LOCK = 0.3;               // seconds the beam must stay on a card
    const REACH = 25;               // each steering mirror can send the beam +/- this many degrees
    const ORIGIN = { x: 370, y: 450 };
    const FLIP = { x: 620, y: 450 };
    const PATHS = {
      up:   { mirror: { x: 620, y: 185 }, incoming: { x: 0, y: -1 }, flipAngle: -45, bias: 8 },
      down: { mirror: { x: 620, y: 715 }, incoming: { x: 0, y: 1 },  flipAngle: 45,  bias: -8 }
    };
    const ART = {
      laser:   { w: 320, ratio: 310 / 560, ax: 0.994, ay: 0.2 },
      mirror:  { w: 150, ratio: 501 / 560, ax: 0.488, ay: 0.449 },
      goggles: { w: 190, ratio: 306 / 560, ax: 0.5, ay: 0.5 }
    };

    const items = {};
    bench.querySelectorAll('[data-item]').forEach(el => { items[el.dataset.item] = el; });
    const canvas = bench.querySelector('.bench-beam');
    const ctx = canvas.getContext('2d');
    const timeBar = bench.querySelector('.rush-time');
    const scoreEl = bench.querySelector('.rush-score');
    const switchBtn = bench.querySelector('.rush-switch');
    const playBtn = bench.querySelector('.rush-play');
    const resultEl = bench.querySelector('.rush-result');
    const status = document.getElementById('lab-status');

    const faceImg = new Image(); faceImg.src = 'images/game/target-face.png';
    const blockImg = new Image(); blockImg.src = 'images/game/block.png';
    const irisImg = new Image(); irisImg.src = 'images/game/iris.png';

    function place(el, art, x, y, rot) {
      const w = art.w, h = art.w * art.ratio;
      el.style.left = ((x - art.ax * w) / UW * 100) + '%';
      el.style.top = ((y - art.ay * h) / UH * 100) + '%';
      el.style.width = (w / UW * 100) + '%';
      if (rot) el.style.transform = 'rotate(' + rot + 'deg)';
    }
    place(items.laser, ART.laser, ORIGIN.x, ORIGIN.y);
    place(items.mf, ART.mirror, FLIP.x, FLIP.y);
    place(items.mu, ART.mirror, PATHS.up.mirror.x, PATHS.up.mirror.y);
    place(items.ml, ART.mirror, PATHS.down.mirror.x, PATHS.down.mirror.y);
    place(items.goggles, ART.goggles, 200, 780, -14);

    // ---------- difficulty: hard from the first second, no levels ----------
    // posts = fixed obstacles, blocks = moving beam blocks, gates = moving iris plates (shoot through the hole)
    const HARD = { r: 30, life: 3.8, move: 90, posts: 2, blocks: 2, gates: 2, blockSpeed: 150 };
    function params() { return HARD; }
    const GATE = { w: 64, ratio: 560 / 252, ay: 0.491, top: 0.17, bottom: 0.86, hole: 10 };

    // ---------- state ----------
    let best = 0;
    try { best = parseInt(localStorage.getItem('qsn-beam-rush-best'), 10) || 0; } catch (e) { best = 0; }

    let playing = false;
    let timeLeft = RUN, clock = 0;
    let score = 0, hits = 0;
    let target = null, nextIn = 0.5;
    let posts = [], blocks = [], gates = [], sparks = [], popups = [];
    let path = 'up';
    let aim = { x: 1300, y: 300 };
    const steer = { up: { angle: -45, vel: 0 }, down: { angle: 45, vel: 0 } };
    let flipAngle = -45;
    let blockedLast = false, blockCooldown = 0;
    let onScreen = false, raf = 0, lastT = 0;

    function rand(a, b) { return a + Math.random() * (b - a); }
    function norm90(a) { while (a > 90) a -= 180; while (a <= -90) a += 180; return a; }

    // Mirror angle that turns incoming direction d into the beam heading at angle phi (degrees, 0 = right)
    function mirrorFor(d, phi) {
      const ux = Math.cos(phi * DEG), uy = Math.sin(phi * DEG);
      return norm90(Math.atan2(d.y - uy, d.x - ux) / DEG + 90);
    }

    function reflect(d, angle) {
      const a = angle * DEG, nx = -Math.sin(a), ny = Math.cos(a);
      const dot = d.x * nx + d.y * ny;
      return { x: d.x - 2 * dot * nx, y: d.y - 2 * dot * ny };
    }

    // Heading (deg) the active mirror would like, clamped to its reach
    function wantedHeading(p) {
      const m = PATHS[p].mirror;
      const phi = Math.atan2(aim.y - m.y, Math.max(40, aim.x - m.x)) / DEG;
      const centre = PATHS[p].bias;
      return Math.max(centre - REACH, Math.min(centre + REACH, phi));
    }

    function canReach(p, x, y) {
      const m = PATHS[p].mirror;
      const phi = Math.atan2(y - m.y, x - m.x) / DEG;
      return Math.abs(phi - PATHS[p].bias) <= REACH - 2;
    }

    // ---------- spawning ----------
    function clearOfTargets(x, y, pad) {
      return !target || Math.hypot(target.x - x, target.y - y) > target.r + pad;
    }

    function syncObstacles() {
      const P = params();
      while (posts.length < P.posts) {
        let x, y, tries = 0;
        do { x = rand(920, 1440); y = rand(150, 750); tries++; }
        while (tries < 30 && (posts.some(p => Math.hypot(p.x - x, p.y - y) < 220) || !clearOfTargets(x, y, 90)));
        posts.push({ x, y, r: 36 });
      }
      while (posts.length > P.posts) posts.pop();
      while (blocks.length < P.blocks) {
        const lane = [980, 1300][blocks.length % 2];
        blocks.push({ x: lane, y: rand(150, 750), vy: Math.random() < 0.5 ? -1 : 1, r: 34 });
      }
      while (blocks.length > P.blocks) blocks.pop();
      while (gates.length < P.gates) {
        const lane = [1140, 900][gates.length % 2];
        gates.push({ x: lane, y: rand(200, 700), vy: Math.random() < 0.5 ? -1 : 1 });
      }
      while (gates.length > P.gates) gates.pop();
    }

    function obstacleNear(x, y, pad) {
      return posts.some(p => Math.hypot(p.x - x, p.y - y) < p.r + pad) ||
             blocks.some(b => Math.abs(b.x - x) < b.r + pad && Math.abs(b.y - y) < 120) ||
             gates.some(g => Math.abs(g.x - x) < pad);
    }

    function spawnTarget() {
      const P = params();
      let x, y, tries = 0;
      do {
        x = rand(1020, 1520); y = rand(90, 820); tries++;
        // must be reachable by at least one path, not under a block, not on the current beam
      } while (tries < 40 && (!(canReach('up', x, y) || canReach('down', x, y)) ||
               obstacleNear(x, y, P.r + 30) ||
               onBeam(x, y, P.r + 50)));
      const dir = Math.random() < 0.5 ? -1 : 1;
      target = { x, y, r: P.r, born: clock, life: P.life, hold: 0, vy: dir * P.move, pop: 0 };
    }

    // ---------- beam ----------
    function currentRay() {
      const P = PATHS[path];
      const d = reflect(P.incoming, steer[path].angle);
      return { ox: P.mirror.x, oy: P.mirror.y, dx: d.x, dy: d.y };
    }

    function onBeam(x, y, margin) {
      const r = currentRay();
      const fx = x - r.ox, fy = y - r.oy;
      return fx * r.dx + fy * r.dy > 0 && Math.abs(fx * r.dy - fy * r.dx) < margin;
    }

    function traceBeam() {
      const r = currentRay();
      const ts = [];
      if (r.dx > 0) ts.push((UW - r.ox) / r.dx); if (r.dx < 0) ts.push(-r.ox / r.dx);
      if (r.dy > 0) ts.push((UH - r.oy) / r.dy); if (r.dy < 0) ts.push(-r.oy / r.dy);
      let hit = { t: Math.min(...ts), kind: 'edge' };
      const circle = (cx, cy, rad) => {
        const fx = cx - r.ox, fy = cy - r.oy, tc = fx * r.dx + fy * r.dy;
        if (tc <= 0) return null;
        const perp = Math.abs(fx * r.dy - fy * r.dx);
        if (perp > rad) return null;
        return tc - Math.sqrt(rad * rad - perp * perp);
      };
      posts.concat(blocks).forEach(b => { const t = circle(b.x, b.y, b.r); if (t !== null && t < hit.t) hit = { t, kind: 'block' }; });
      gates.forEach(g => {
        if (Math.abs(r.dx) < 1e-6) return;
        const t = (g.x - r.ox) / r.dx;
        if (t <= 0 || t >= hit.t) return;
        const y = r.oy + r.dy * t;
        const h = GATE.w * GATE.ratio, top = g.y - GATE.ay * h;
        const onPlate = y > top + GATE.top * h && y < top + GATE.bottom * h;
        if (onPlate && Math.abs(y - g.y) > GATE.hole) hit = { t, kind: 'block' };
      });
      if (target) {
        const t = circle(target.x, target.y, target.r * Math.min(1, target.pop));
        if (t !== null && t < hit.t) hit = { t, kind: 'target' };
      }
      hit.end = { x: r.ox + r.dx * hit.t, y: r.oy + r.dy * hit.t };
      return hit;
    }

    // ---------- feedback ----------
    function burst(x, y, n, colour) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(120, 480);
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7), age: 0, colour });
      }
    }

    function popup(x, y, text, good) { popups.push({ x, y, text, good, age: 0 }); }

    function bump(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

    function shake() {
      if (reducedMotion.matches) return;
      bench.classList.remove('is-shaking'); void bench.offsetWidth; bench.classList.add('is-shaking');
    }

    function addScore(n) {
      score = Math.max(0, score + n);
      scoreEl.textContent = score;
      scoreEl.classList.toggle('neg', n < 0);
      bump(scoreEl);
    }

    function flip(to) {
      path = to || (path === 'up' ? 'down' : 'up');
    }

    // ---------- game flow ----------
    function startRun() {
      playing = true;
      timeLeft = RUN; clock = 0; score = 0; hits = 0;
      target = null; nextIn = 0.6; posts = []; blocks = []; gates = []; sparks = []; popups = [];
      scoreEl.textContent = '0'; scoreEl.classList.remove('neg');
      bench.classList.add('is-playing');
      bench.focus({ preventScroll: true });
      status.textContent = 'Beam Rush started. ' + RUN + ' seconds.';
      wake();
    }

    function endRun() {
      playing = false;
      bench.classList.remove('is-playing');
      timeBar.classList.remove('is-low');
      const record = score > best;
      if (record) {
        best = score;
        try { localStorage.setItem('qsn-beam-rush-best', String(best)); } catch (e) { /* storage unavailable */ }
      }
      resultEl.textContent = record ? 'New best! ' + score : 'Score ' + score + '  ·  Best ' + best;
      playBtn.textContent = 'Play again';
      status.textContent = 'Time up. Score ' + score + ', ' + hits + ' hits. Best ' + best + '.';
      target = null; nextIn = 1;
      playBtn.focus({ preventScroll: true });
    }

    // Back to the default title screen: stop any run, clear the last result
    function resetToTitle() {
      if (playing) {
        playing = false;
        bench.classList.remove('is-playing');
        timeBar.classList.remove('is-low');
        status.textContent = 'Beam Rush stopped.';
      }
      resultEl.textContent = '';
      playBtn.textContent = 'Play';
      target = null; nextIn = 1; sparks = []; popups = [];
    }

    playBtn.addEventListener('click', startRun);
    switchBtn.addEventListener('click', (e) => { e.stopPropagation(); flip(); bench.focus({ preventScroll: true }); });
    items.mf.addEventListener('click', (e) => { e.stopPropagation(); if (playing) flip(); });

    // ---------- input ----------
    function toUnits(e) {
      const r = bench.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * UW, y: (e.clientY - r.top) / r.height * UH };
    }
    bench.addEventListener('pointermove', (e) => { if (playing) aim = toUnits(e); });
    bench.addEventListener('pointerdown', (e) => { if (playing && e.button === 0) aim = toUnits(e); });
    bench.addEventListener('contextmenu', (e) => { if (playing) { e.preventDefault(); flip(); } });
    // Space switches mirrors from anywhere on the page while a run is going
    // (not just when the bench has focus), and never scrolls the page mid-game
    document.addEventListener('keydown', (e) => {
      if (!playing || (e.key !== ' ' && e.code !== 'Space')) return;
      e.preventDefault();
      if (!e.repeat) flip();
    });
    // stop Space from also "clicking" a focused button (that would flip twice)
    document.addEventListener('keyup', (e) => {
      if (playing && (e.key === ' ' || e.code === 'Space')) e.preventDefault();
    });
    bench.addEventListener('keydown', (e) => {
      if (!playing) return;
      const step = { ArrowUp: -40, ArrowDown: 40 }[e.key];
      if (step) { e.preventDefault(); aim = { x: 1300, y: Math.max(0, Math.min(UH, aim.y + step)) }; }
    });

    // ---------- loop ----------
    function spring(s, want, dt) {
      const diff = norm90(want - s.angle);
      s.vel += (diff * 140 - s.vel * 22) * dt;
      s.angle = norm90(s.angle + s.vel * dt);
    }

    function update(dt) {
      clock += dt;
      if (playing) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endRun(); }
        timeBar.style.setProperty('--t', (timeLeft / RUN).toFixed(4));
        timeBar.classList.toggle('is-low', playing && timeLeft < 10);
      }

      syncObstacles();

      // demo: pick the path that reaches the target and aim at it
      if (!playing) {
        if (target) {
          const want = canReach(path, target.x, target.y) ? path : (path === 'up' ? 'down' : 'up');
          if (want !== path && clock % 1 < dt * 2) flip(want);
          aim = { x: target.x + Math.sin(clock * 3) * 6, y: target.y + Math.cos(clock * 2.3) * 8 };
        }
      }

      // flip mirror swings to the chosen path, steering mirrors chase the aim
      const flipWant = PATHS[path].flipAngle;
      flipAngle += (flipWant - flipAngle) * Math.min(1, dt * 25);
      items.mf.style.setProperty('--angle', flipAngle.toFixed(2) + 'deg');
      ['up', 'down'].forEach(p => {
        const heading = p === path ? wantedHeading(p) : PATHS[p].bias;
        spring(steer[p], mirrorFor(PATHS[p].incoming, heading), dt);
      });
      items.mu.style.setProperty('--angle', steer.up.angle.toFixed(2) + 'deg');
      items.ml.style.setProperty('--angle', steer.down.angle.toFixed(2) + 'deg');

      // blocks drift up and down
      const bs = HARD.blockSpeed;
      blocks.forEach(b => { b.y += b.vy * bs * dt; if (b.y < 120 || b.y > 780) b.vy *= -1; });
      gates.forEach(g => { g.y += g.vy * (bs * 0.6) * dt; if (g.y < 170 || g.y > 730) g.vy *= -1; });

      // one target at a time
      if (!target) {
        nextIn -= dt;
        if (nextIn <= 0) spawnTarget();
      } else {
        target.pop = Math.min(1, target.pop + dt * 6);
        target.y += target.vy * dt;
        if (target.y < 90 || target.y > 820) target.vy *= -1;
      }

      const beam = traceBeam();
      const flipping = Math.abs(flipWant - flipAngle) > 8;    // no beam while the flip mirror is moving

      // beam clips a block: -1 (once per contact)
      blockCooldown -= dt;
      const blocked = !flipping && beam.kind === 'block';
      if (blocked && !blockedLast && blockCooldown <= 0) {
        if (playing) { addScore(-1); popup(beam.end.x, beam.end.y - 30, 'BLOCKED -1', false); shake(); }
        burst(beam.end.x, beam.end.y, 10, '255, 120, 60');
        blockCooldown = 0.7;
      }
      blockedLast = blocked;

      if (target) {
        if (!flipping && beam.kind === 'target') target.hold += dt;
        else target.hold = Math.max(0, target.hold - dt * 2);

        if (target.hold >= LOCK) {
          burst(target.x, target.y, 26, '255, 220, 120');
          if (playing) {
            hits++;
            addScore(5);
            popup(target.x, target.y - target.r - 14, '+5', true);
            shake();
          }
          target = null; nextIn = 0.45;
        } else if (clock - target.born > target.life) {
          if (playing) { addScore(-3); popup(target.x, target.y - target.r - 14, '-3', false); }
          burst(target.x, target.y, 8, '120, 140, 170');
          target = null; nextIn = 0.45;
        }
      }

      sparks.forEach(s => { s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.92; s.vy *= 0.92; });
      sparks = sparks.filter(s => s.age < s.life);
      popups.forEach(p => { p.age += dt; p.y -= 50 * dt; });
      popups = popups.filter(p => p.age < 1);

      return { beam, flipping };
    }

    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bench.clientWidth * dpr);
      canvas.height = Math.round(bench.clientHeight * dpr);
    }

    // little pixel-font name tags so players know what each part is
    const TAG = {
      laser:   '#ffb3c6', mirror: '#a8ecff', flip: '#ffd59e',
      target:  '#b8ffb0', block: '#ffd27f', post: '#ffc1a1', gate: '#d9b8ff', goggles: '#ffcf8a'
    };
    function tag(text, x, y, colour, seed) {
      const bob = reducedMotion.matches ? 0 : Math.sin(clock * 2.2 + (seed || 0)) * 3;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // no box: just the text, with a dark halo so it reads on the breadboard
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = colour;
      ctx.fillText(text, x, y + bob);
      ctx.shadowBlur = 0;
      ctx.textBaseline = 'alphabetic';
    }

    // put the tag above an object, or below it if that would hit the HUD
    function above(y, gap) { return y - gap < 100 ? y + gap : y - gap; }

    function drawTags() {
      if (bench.clientWidth < 560) return;     // too small to read on phones
      tag('LASER', 205, 612, TAG.laser, 0);
      tag('FLIP MIRROR', FLIP.x, FLIP.y + 72, TAG.flip, 1);
      tag('MIRROR', PATHS.up.mirror.x, PATHS.up.mirror.y - 72, TAG.mirror, 2);
      tag('SAFETY GOGGLES', 200, 845, TAG.goggles, 4);
      // only the first of each kind gets a name
      if (posts[0]) tag('POST', posts[0].x, above(posts[0].y, 58), TAG.post, 5);
      if (blocks[0]) tag('BEAM BLOCK', blocks[0].x, above(blocks[0].y, 58), TAG.block, 7);
      if (gates[0]) tag('IRIS GATE', gates[0].x, above(gates[0].y, GATE.w * GATE.ratio * GATE.ay + 2), TAG.gate, 9);
      if (target && target.pop > 0.6) tag('TARGET', target.x, above(target.y, target.r + 34), TAG.target, 11);
    }

    function glow(x, y, r) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      g.addColorStop(0.3, 'rgba(255, 70, 50, 0.8)');
      g.addColorStop(1, 'rgba(255, 30, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    function draw(state) {
      const { beam, flipping } = state;
      ctx.setTransform(canvas.width / UW, 0, 0, canvas.height / UH, 0, 0);
      ctx.clearRect(0, 0, UW, UH);

      // reach fan of the active steering mirror
      if (playing) {
        const m = PATHS[path].mirror, c = PATHS[path].bias;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 900);
        g.addColorStop(0, 'rgba(255, 80, 60, 0.10)');
        g.addColorStop(1, 'rgba(255, 80, 60, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.arc(m.x, m.y, 1000, (c - REACH) * DEG, (c + REACH) * DEG);
        ctx.closePath();
        ctx.fill();
      }

      posts.concat(blocks).forEach(b => {
        if (!blockImg.complete) return;
        const w = 92, h = w * 560 / 496;
        ctx.drawImage(blockImg, b.x - w * 0.44, b.y - h * 0.3, w, h);
      });
      gates.forEach(g => {
        if (!irisImg.complete) return;
        const w = GATE.w, h = w * GATE.ratio;
        ctx.drawImage(irisImg, g.x - w * 0.492, g.y - h * GATE.ay, w, h);
      });

      if (target) {
        const tg = target;
        const sc = 1 - Math.pow(1 - tg.pop, 3);
        const w = tg.r * 2 / 0.973 * sc, h = w * 560 / 331;
        if (faceImg.complete) ctx.drawImage(faceImg, tg.x - w * 0.495, tg.y - h * 0.291, w, h);
        const left = Math.max(0, 1 - (clock - tg.born) / tg.life);
        ctx.lineWidth = 4;
        ctx.strokeStyle = left < 0.3 ? 'rgba(255, 80, 60, 0.95)' : 'rgba(63, 216, 255, 0.85)';
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * sc + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
        if (tg.hold > 0) {
          ctx.lineWidth = 6;
          ctx.strokeStyle = 'rgba(125, 255, 154, 0.95)';
          ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * sc + 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, tg.hold / LOCK)); ctx.stroke();
        }
      }

      // beam: laser -> flip mirror -> steering mirror -> end
      const m = PATHS[path].mirror;
      const pts = flipping
        ? [[ORIGIN.x, ORIGIN.y], [FLIP.x, FLIP.y]]
        : [[ORIGIN.x, ORIGIN.y], [FLIP.x, FLIP.y], [m.x, m.y], [beam.end.x, beam.end.y]];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const stroke = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); };
      ctx.shadowColor = 'rgba(255, 30, 20, 0.9)';
      ctx.shadowBlur = 18; ctx.strokeStyle = 'rgba(255, 40, 30, 0.45)'; ctx.lineWidth = 9; stroke();
      ctx.shadowBlur = 6; ctx.strokeStyle = 'rgba(255, 90, 80, 0.95)'; ctx.lineWidth = 3; stroke();
      ctx.strokeStyle = 'rgba(255, 235, 230, 0.9)'; ctx.lineWidth = 1.2; stroke();
      ctx.shadowBlur = 0;
      glow(FLIP.x, FLIP.y, 18);
      if (!flipping) {
        glow(m.x, m.y, 18);
        if (beam.kind !== 'edge') glow(beam.end.x, beam.end.y, 26);
      }

      sparks.forEach(sp => {
        const a = 1 - sp.age / sp.life;
        ctx.strokeStyle = 'rgba(' + sp.colour + ', ' + a.toFixed(3) + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.03, sp.y - sp.vy * 0.03); ctx.stroke();
      });

      drawTags();

      ctx.textAlign = 'center';
      ctx.font = '22px "Press Start 2P", monospace';
      popups.forEach(p => {
        ctx.fillStyle = p.good ? 'rgba(125, 255, 154, ' + (1 - p.age) + ')' : 'rgba(255, 110, 95, ' + (1 - p.age) + ')';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
      });

      ctx.shadowBlur = 0;
    }

    function frame(t) {
      const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
      lastT = t;
      draw(update(dt));
      raf = onScreen ? requestAnimationFrame(frame) : 0;
    }

    function wake() {
      if (!raf && onScreen) { lastT = 0; raf = requestAnimationFrame(frame); }
    }

    if (document.fonts && document.fonts.load) document.fonts.load('22px "Press Start 2P"').catch(() => {});
    sizeCanvas();
    if ('ResizeObserver' in window) new ResizeObserver(sizeCanvas).observe(bench);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[0].isIntersecting;
        if (onScreen) wake();
        else resetToTitle();   // scrolled away: next time it shows the default Beam Rush screen
      }).observe(bench);
    } else {
      onScreen = true;
      wake();
    }
  }

  // ==========================================
  // CHIP-TO-QUBIT BAND (scroll-linked drift + reticle lock-on)
  // ==========================================
  const nexus = document.querySelector('.nexus');
  const nexusLayer = nexus && nexus.querySelector('.nexus-layer');

  if (nexus && nexusLayer) {
    let nexusVisible = false;
    let ticking = false;

    function updateNexus() {
      ticking = false;
      if (!nexusVisible || reducedMotion.matches) return;
      const rect = nexus.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 when the band enters at the bottom, 1 when it leaves at the top
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const centred = 1 - Math.abs(p - 0.5) * 2;
      nexusLayer.style.setProperty('--nexus-y', ((0.5 - p) * 70).toFixed(1) + 'px');
      nexusLayer.style.setProperty('--nexus-op', (0.12 + 0.26 * centred).toFixed(3));
    }

    function requestNexus() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateNexus);
      }
    }

    if ('IntersectionObserver' in window) {
      // Re-lock the reticles each time the band comes back into view
      new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          nexusVisible = entry.isIntersecting;
          // "Learn about:" eases in first, then the reticles lock on
          if (entry.isIntersecting) nexus.classList.add('intro-in');
          if (entry.intersectionRatio >= 0.35) nexus.classList.add('in-view');
          else if (!entry.isIntersecting) nexus.classList.remove('in-view');
          requestNexus();
        });
      }, { threshold: [0, 0.35] }).observe(nexus);
    } else {
      nexus.classList.add('intro-in', 'in-view');
    }

    window.addEventListener('scroll', requestNexus, { passive: true });
    window.addEventListener('resize', requestNexus);
    reducedMotion.addEventListener('change', () => {
      nexusLayer.style.removeProperty('--nexus-y');
      nexusLayer.style.removeProperty('--nexus-op');
      requestNexus();
    });
  }

  // ==========================================
  // THREE.JS LATTICE BACKGROUND
  // ==========================================
  const canvas = document.getElementById('lattice');
  let lattice = null;

  function createLattice() {
    if (typeof THREE === 'undefined' || !canvas) return null;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (err) {
      canvas.style.display = 'none';
      return null;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
    camera.position.z = 60;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Triangular lattice of nodes
    const small = window.innerWidth < 700;
    const COLS = small ? 12 : 22;
    const ROWS = small ? 18 : 13;
    const SP = 7;
    const N = COLS * ROWS;

    const base = new Float32Array(N * 3);
    const pos = new Float32Array(N * 3);
    const phase = new Float32Array(N);
    const colors = new Float32Array(N * 3);
    const cyan = new THREE.Color(0x3fd8ff);
    const orange = new THREE.Color(0xe36515);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        base[i * 3] = (c - (COLS - 1) / 2) * SP + (r % 2 ? SP / 2 : 0);
        base[i * 3 + 1] = (r - (ROWS - 1) / 2) * SP * 0.87;
        base[i * 3 + 2] = (Math.random() - 0.5) * 10;
        phase[i] = Math.random() * Math.PI * 2;
        const col = Math.random() < 0.15 ? orange : cyan;
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
    }
    pos.set(base);

    // Neighbour links: right, and the two nodes below
    const links = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        if (c + 1 < COLS) links.push(i, i + 1);
        if (r + 1 < ROWS) {
          links.push(i, i + COLS);
          const dc = r % 2 ? 1 : -1;
          if (c + dc >= 0 && c + dc < COLS) links.push(i, i + COLS + dc);
        }
      }
    }
    const linePos = new Float32Array(links.length * 3);

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(pointGeo, new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      color: 0x3fd8ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));

    const group = new THREE.Group();
    group.add(lines);
    group.add(points);
    group.rotation.x = -0.18;
    scene.add(group);

    // Mouse in normalised device coords, smoothed
    let mx = 0, my = 0, sx = 0, sy = 0;
    function onMove(e) {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onResize() {
      // Guard against a zero-height viewport (hidden iframe/tab), which makes aspect Infinity
      camera.aspect = window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    const R = 14; // mouse influence radius (world units)
    let raf = 0;

    function frame(t) {
      raf = requestAnimationFrame(frame);

      sx += (mx - sx) * 0.06;
      sy += (my - sy) * 0.06;

      const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const wx = sx * halfH * camera.aspect - group.position.x;
      const wy = sy * halfH;

      for (let i = 0; i < N; i++) {
        const k = i * 3;
        const p = phase[i];
        let x = base[k] + Math.sin(t * 0.0004 + p) * 0.9;
        let y = base[k + 1] + Math.cos(t * 0.00035 + p) * 0.9;
        const z = base[k + 2] + Math.sin(t * 0.0003 + p * 2) * 1.5;

        const dx = x - wx;
        const dy = y - wy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < R) {
          const f = (1 - d / R) * 3;
          x += (dx / d) * f;
          y += (dy / d) * f;
        }
        pos[k] = x;
        pos[k + 1] = y;
        pos[k + 2] = z;
      }

      for (let j = 0; j < links.length; j++) {
        const s = links[j] * 3;
        linePos[j * 3] = pos[s];
        linePos[j * 3 + 1] = pos[s + 1];
        linePos[j * 3 + 2] = pos[s + 2];
      }

      pointGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.position.needsUpdate = true;

      group.position.x = Math.sin(t * 0.00005) * 3;
      group.rotation.z = Math.sin(t * 0.00003) * 0.05;

      camera.position.x += (sx * 3 - camera.position.x) * 0.03;
      camera.position.y += (sy * 2 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }

    return {
      start() {
        if (raf) return;
        canvas.style.display = '';
        document.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('resize', onResize);
        onResize();
        raf = requestAnimationFrame(frame);
      },
      stop() {
        cancelAnimationFrame(raf);
        raf = 0;
        document.removeEventListener('mousemove', onMove);
        window.removeEventListener('resize', onResize);
        renderer.clear();
        canvas.style.display = 'none';
      }
    };
  }

  function syncMotion() {
    if (reducedMotion.matches) {
      if (lattice) lattice.stop();
      return;
    }
    if (!lattice) lattice = createLattice();
    if (lattice) lattice.start();
  }

  syncMotion();
  reducedMotion.addEventListener('change', syncMotion);
})();
