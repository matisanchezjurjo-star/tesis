/* Intro: radar sweep that detects a contact, locks on, and opens the deck. */
(() => {
  const start = parseInt(location.hash.slice(1)) || 1;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.getElementById('intro');
  if (!intro) return;
  if (start !== 1 || reduce) { intro.remove(); return; }

  const cover = document.querySelector('.slide');
  document.body.classList.add('intro-on');
  cover.classList.remove('active');

  const cv = intro.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const status = intro.querySelector('.ir-status');
  const lockBox = intro.querySelector('.ir-lock');
  const readout = intro.querySelector('.ir-readout');
  const coords = intro.querySelector('.ir-coords');
  const counter = intro.querySelector('.ir-count');

  const PERIOD = 2.2;           // seconds per sweep
  const TARGET = { a: 42, r: .58 };   // degrees from north, radius fraction
  const LOCK_T = 3.3;           // when lock-on starts
  const OPEN_T = 6.2;           // when the deck opens
  const blips = [
    { a: 118, r: .72 }, { a: 205, r: .44 }, { a: 300, r: .81 }, { a: 252, r: .63 },
    { a: 160, r: .31 }, { a: 330, r: .38 }, { a: 75, r: .86 }, { ...TARGET, target: true }
  ].map(b => ({ ...b, lit: -9 }));

  let W, H, R, cx, cy, dpr;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * .42; cx = W / 2; cy = H / 2;
    placeTarget();
  }
  const pos = (a, r) => {
    const t = (a - 90) * Math.PI / 180;
    return [cx + Math.cos(t) * R * r, cy + Math.sin(t) * R * r];
  };
  function placeTarget() {
    const [x, y] = pos(TARGET.a, TARGET.r);
    lockBox.style.left = x + 'px'; lockBox.style.top = y + 'px';
    const rw = readout.offsetWidth || 240;
    if (x + 46 + rw < W - 12) { readout.style.left = (x + 46) + 'px'; readout.style.top = (y - 70) + 'px'; }
    else { readout.style.left = Math.max(12, Math.min(x - rw / 2, W - rw - 12)) + 'px'; readout.style.top = (y + 60) + 'px'; }
    intro.style.setProperty('--tx', x + 'px'); intro.style.setProperty('--ty', y + 'px');
  }

  // schematic border line (Bolivia / Argentina) across the scope
  const border = [[-1, -.18], [-.62, -.26], [-.35, -.12], [-.1, -.2], [.18, -.05], [.42, -.15], [.7, .02], [1, -.06]];

  const gold = '217,150,26', green = '120,214,170';
  let t0 = performance.now(), locked = false, done = false;

  function draw(now) {
    if (done) return;
    const t = (now - t0) / 1000;
    const sweep = (t / PERIOD * 360) % 360;
    ctx.clearRect(0, 0, W, H);

    // scope background
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, 'rgba(24,44,70,.55)'); g.addColorStop(1, 'rgba(10,20,38,.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    // border line
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    border.forEach(([x, y], i) => { const px = cx + x * R, py = cy + y * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 11px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillText('BOLIVIA', cx - R * .55, cy - R * .36);
    ctx.fillText('ARGENTINA', cx - R * .55, cy - R * .04);

    // sweep wedge
    const rad = (sweep - 90) * Math.PI / 180;
    if (ctx.createConicGradient) {
      const cg = ctx.createConicGradient(rad - Math.PI * .5, cx, cy);
      cg.addColorStop(0, `rgba(${green},0)`);
      cg.addColorStop(.25, `rgba(${green},.28)`);
      cg.addColorStop(.2501, `rgba(${green},0)`);
      cg.addColorStop(1, `rgba(${green},0)`);
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, rad - Math.PI * .5, rad); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // rings and cross
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    // ticks + bearings
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '500 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let d = 0; d < 360; d += 10) {
      const a = (d - 90) * Math.PI / 180, l = d % 30 ? 6 : 12;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.lineTo(cx + Math.cos(a) * (R + l), cy + Math.sin(a) * (R + l)); ctx.stroke();
      if (d % 30 === 0) ctx.fillText(String(d).padStart(3, '0'), cx + Math.cos(a) * (R + 26), cy + Math.sin(a) * (R + 26));
    }

    // sweep line
    ctx.strokeStyle = `rgba(${green},.9)`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R); ctx.stroke();

    // blips
    blips.forEach(b => {
      const diff = (sweep - b.a + 360) % 360;
      if (diff < 6 && t - b.lit > PERIOD * .5) b.lit = t;
      const age = t - b.lit;
      const isT = !!b.target;
      let alpha = Math.max(0, 1 - age / (PERIOD * .9));
      if (isT && locked) alpha = 1;
      if (alpha <= 0) return;
      const [x, y] = pos(b.a, b.r);
      const col = isT && t > LOCK_T - PERIOD ? gold : green;
      ctx.fillStyle = `rgba(${col},${alpha})`;
      ctx.shadowColor = `rgba(${col},${alpha})`; ctx.shadowBlur = isT ? 18 : 10;
      ctx.beginPath(); ctx.arc(x, y, isT ? 7 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (isT && locked) {
        const p = (t * 1.4) % 1;
        ctx.strokeStyle = `rgba(${gold},${1 - p})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 8 + p * 36, 0, Math.PI * 2); ctx.stroke();
      }
    });

    // phases
    counter.textContent = String(Math.min(190, Math.floor(t * 34))).padStart(3, '0');
    if (t > 1.1 && !intro.classList.contains('p1')) { intro.classList.add('p1'); type(status, 'Contacto no identificado · Sector norte'); }
    if (t > LOCK_T && !locked) {
      locked = true; intro.classList.add('p2');
      type(status, 'Vuelo irregular detectado');
      type(coords, '22°06′S · 65°36′W  ·  ALT 1.200 m  ·  SIN PLAN DE VUELO');
    }
    if (t > OPEN_T) return finish();
    requestAnimationFrame(draw);
  }

  function type(el, txt) {
    let i = 0; el.textContent = '';
    const step = () => { el.textContent = txt.slice(0, ++i); if (i < txt.length) setTimeout(step, 22); };
    step();
  }

  function finish() {
    if (done) return; done = true;
    intro.classList.add('out');
    cover.classList.add('active');
    document.body.classList.remove('intro-on');
    setTimeout(() => intro.remove(), 1100);
    removeEventListener('keydown', skip, true);
  }
  function skip(e) { e.preventDefault(); e.stopImmediatePropagation(); finish(); }

  addEventListener('keydown', skip, true);
  intro.addEventListener('click', skip);
  addEventListener('resize', size);
  size();
  requestAnimationFrame(draw);
})();
