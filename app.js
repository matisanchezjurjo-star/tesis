(() => {
  const stage = document.getElementById('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const total = slides.length;
  const $ = id => document.getElementById(id);
  const progress = $('progress'), count = $('count');
  const notesPanel = $('notesPanel'), overview = $('overview'), ovGrid = $('ovGrid');
  let cur = 0;

  // footers
  slides.forEach((s, i) => {
    if (i === 0) return;
    const f = document.createElement('div');
    f.className = 'foot';
    const src = s.dataset.source ? `<span class="src">${s.dataset.source}</span>` : '<span>Narcotráfico en la frontera norte · TIF UADE 2026</span>';
    f.innerHTML = `${src}<span>${i + 1}</span>`;
    s.appendChild(f);
  });

  // dot grid (190 flights, 5 linked)
  const dots = $('dots');
  if (dots) {
    const hits = new Set([23, 61, 98, 140, 177]);
    dots.innerHTML = Array.from({ length: 190 }, (_, i) => `<i${hits.has(i) ? ' class="hit"' : ''}></i>`).join('');
  }

  // overview
  ovGrid.innerHTML = slides.map((s, i) =>
    `<button class="ov-item" data-i="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${s.dataset.title || ''}</button>`).join('');
  ovGrid.addEventListener('click', e => {
    const b = e.target.closest('.ov-item'); if (!b) return;
    go(+b.dataset.i); toggleOverview(false);
  });

  const reading = () => matchMedia('(max-width: 820px), (max-aspect-ratio: 4/5)').matches;

  function fit() {
    if (reading()) { stage.style.transform = ''; return; }
    const s = Math.min(innerWidth / 1600, innerHeight / 900);
    stage.style.transform = `scale(${s})`;
  }

  function go(n, push = true) {
    n = Math.max(0, Math.min(total - 1, n));
    slides[cur].classList.remove('active');
    cur = n;
    slides[cur].classList.add('active');
    count.textContent = `${cur + 1} / ${total}`;
    progress.style.width = `${((cur + 1) / total) * 100}%`;
    const note = slides[cur].querySelector('.notes');
    notesPanel.innerHTML = `<b>Notas · ${cur + 1}</b>${note ? note.innerHTML : 'Sin notas.'}`;
    [...ovGrid.children].forEach((c, i) => c.classList.toggle('cur', i === cur));
    if (push) history.replaceState(null, '', `#${cur + 1}`);
  }

  function toggleOverview(force) {
    const open = force ?? !overview.classList.contains('open');
    overview.classList.toggle('open', open);
    if (open) ovGrid.children[cur].focus();
  }
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  $('prev').onclick = () => go(cur - 1);
  $('next').onclick = () => go(cur + 1);
  $('ovBtn').onclick = () => toggleOverview();
  $('notesBtn').onclick = () => notesPanel.classList.toggle('open');
  $('fsBtn').onclick = toggleFs;

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (reading()) return;
    const k = e.key;
    if (overview.classList.contains('open')) {
      if (k === 'Escape' || k === 'o' || k === 'O') toggleOverview(false);
      return;
    }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(cur + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(cur - 1); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(total - 1);
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'o' || k === 'O' || k === 'Escape') toggleOverview();
    else if (k === 'n' || k === 'N') notesPanel.classList.toggle('open');
  });

  // click halves + swipe
  $('deck').addEventListener('click', e => {
    if (reading() || e.target.closest('a,button')) return;
    go(e.clientX > innerWidth / 3 ? cur + 1 : cur - 1);
  });
  let tx = null;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => {
    if (tx === null || reading()) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? cur + 1 : cur - 1);
  });

  // auto-hide UI hint
  let t; addEventListener('mousemove', () => {
    document.body.classList.add('ui'); clearTimeout(t);
    t = setTimeout(() => document.body.classList.remove('ui'), 1800);
  });

  addEventListener('resize', fit);
  addEventListener('hashchange', () => go((parseInt(location.hash.slice(1)) || 1) - 1, false));
  fit();
  go((parseInt(location.hash.slice(1)) || 1) - 1, false);
  // in reading mode every slide is visible
  if (reading()) slides.forEach(s => s.classList.add('active'));
  matchMedia('(max-width: 820px), (max-aspect-ratio: 4/5)').addEventListener('change', () => { fit(); if (reading()) slides.forEach(s => s.classList.add('active')); else { slides.forEach(s => s.classList.remove('active')); go(cur, false); } });
})();
