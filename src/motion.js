// Bewegung unterhalb der Bühne: Elemente blenden beim Scrollen ein, Zahlen zählen hoch.
// Wer im Betriebssystem "Bewegung reduzieren" eingestellt hat, sieht alles sofort und ohne Animation.
(function () {
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('[data-reveal]');
  var counts = document.querySelectorAll('[data-count]');

  function countUp(el) {
    var target = Number(el.dataset.count) || 0;
    if (still || target < 5) { el.textContent = target; return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3); // bremst zum Ende hin ab
      el.textContent = Math.round(target * e);
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  if (still || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  items.forEach(function (el) { io.observe(el); });
  counts.forEach(function (el) { if (!el.closest('[data-reveal]')) io.observe(el); });
})();
