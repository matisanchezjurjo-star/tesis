/* Per-slide effects that need JS: number count-ups and SMIL restarts. */
(() => {
  const reading = () => matchMedia('(max-width: 820px), (max-aspect-ratio: 4/5)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SEL = '.step .num, .big-note .num, .bar .lbl .num, .country .num, .count';
  const fmt = (v, dec) => {
    const [i, d] = v.toFixed(dec).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '');
  };
  const timers = new WeakMap();

  function countUp(el, delay) {
    if (!el.dataset.final) el.dataset.final = el.textContent;
    const m = el.dataset.final.match(/^(\D*?)(\d[\d.,]*)(.*)$/s);
    if (!m) return;
    const [, pre, num, post] = m;
    const dec = num.includes(',') ? num.split(',')[1].length : 0;
    const target = parseFloat(num.replace(/\./g, '').replace(',', '.'));
    cancelAnimationFrame(timers.get(el));
    el.textContent = pre + fmt(0, dec) + post;
    const dur = 1400, t0 = performance.now() + delay;
    const tick = now => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(target * e, dec) + post;
      if (p < 1) timers.set(el, requestAnimationFrame(tick));
      else el.textContent = el.dataset.final;
    };
    timers.set(el, requestAnimationFrame(tick));
  }

  addEventListener('slidechange', e => {
    const slide = e.detail;
    slide.querySelectorAll('animateMotion, animate').forEach(a => { try { a.beginElement(); } catch (_) {} });
    if (reduce || reading()) return;
    slide.querySelectorAll(SEL).forEach((el, i) => countUp(el, 250 + i * 160));
  });
  addEventListener('load', () => {
    if (reading()) document.querySelectorAll('animateMotion, animate').forEach(a => { try { a.beginElement(); } catch (_) {} });
  });
})();
