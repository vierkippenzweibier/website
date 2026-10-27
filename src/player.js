// Kleiner Player: lädt Audio erst beim ersten Abspielen (keine Daten an Podigee vorher).
(function () {
  var root = document.querySelector('[data-player]');
  if (!root) return;
  var data = JSON.parse(document.getElementById('episodes-data').textContent);
  var audio = new Audio();
  audio.preload = 'none';

  var playBtn = root.querySelector('.play');
  var bar = root.querySelector('.bar');
  var cur = root.querySelector('[data-cur]');
  var dur = root.querySelector('[data-dur]');
  var now = root.querySelector('.now');
  var speedBtn = root.querySelector('.speed');
  var speeds = [1, 1.25, 1.5, 2];
  var current = 0;
  var activeCh = -1;

  // Kopfbereich (Titel, Text, Cover, Kapitel) auf die gewählte Folge umstellen.
  var $ = function (sel) { return document.querySelector(sel); };
  var eyebrowEl = $('[data-eyebrow]'), hookEl = $('[data-hook]'), ledeEl = $('[data-lede]');
  var coverEl = $('[data-cover]'), chaptersEl = $('[data-chapters]');
  var spEl = $('[data-spotify]');
  var chWrap = $('[data-chapters-wrap]'), chCount = $('[data-ch-count]');
  // Am Handy sind die Kapitel zugeklappt, am Desktop immer offen.
  var mobile = window.matchMedia && window.matchMedia('(max-width: 760px)');
  if (chWrap && mobile && mobile.matches) chWrap.open = false;
  if (mobile && mobile.addEventListener) mobile.addEventListener('change', function (m) { if (chWrap && !m.matches) chWrap.open = true; });

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function showEpisode(ep) {
    if (eyebrowEl) eyebrowEl.textContent = ep.eyebrow;
    if (hookEl) hookEl.textContent = ep.hook;
    if (ledeEl) { ledeEl.textContent = ep.subtitle || ''; ledeEl.hidden = !ep.subtitle; }
    if (spEl && ep.spotify) spEl.href = ep.spotify;
    if (coverEl) {
      if (ep.cover) { coverEl.src = ep.cover; coverEl.alt = ep.coverAlt; coverEl.hidden = false; }
      else coverEl.hidden = true;
    }
    if (chaptersEl) {
      chaptersEl.innerHTML = ep.chapters.map(function (c) {
        return '<li><button type="button" data-seek="' + c.start + '"><span class="t">' + c.t + '</span><span class="ct">' + esc(c.title) + '</span></button></li>';
      }).join('');
      if (chWrap) chWrap.hidden = !ep.chapters.length;
      if (chCount) chCount.textContent = ep.chapters.length;
    }
    activeCh = -1;
  }

  function markChapter(t) {
    if (!chaptersEl) return;
    var chs = data[current].chapters, idx = -1;
    for (var k = 0; k < chs.length; k++) if (t >= chs[k].start) idx = k;
    if (idx === activeCh) return;
    activeCh = idx;
    var items = chaptersEl.children;
    for (var j = 0; j < items.length; j++) items[j].classList.toggle('is-active', j === idx);
  }

  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  }

  function select(i, autoplay, seek) {
    var ep = data[i];
    if (!ep) return;
    if (current !== i || !audio.src) {
      current = i;
      audio.src = ep.audio;
      now.textContent = ep.label;
      dur.textContent = fmt(ep.duration);
      bar.value = 0; bar.style.setProperty('--p', '0%');
      cur.textContent = '0:00';
      showEpisode(ep);
      // Die Folge oben im Player steht nicht doppelt in der Liste, alle anderen schon.
      document.querySelectorAll('.episodes li').forEach(function (li) {
        var on = Number(li.dataset.i) === i;
        li.classList.toggle('is-current', on);
        li.hidden = on;
      });
    }
    if (seek != null) {
      var go = function () { audio.currentTime = seek; };
      if (audio.readyState > 0) go(); else audio.addEventListener('loadedmetadata', go, { once: true });
    }
    if (autoplay) { var pr = audio.play(); if (pr && pr.catch) pr.catch(function () {}); }
  }

  playBtn.addEventListener('click', function () {
    if (!audio.src) select(current, false);
    if (audio.paused) audio.play(); else audio.pause();
  });
  audio.addEventListener('play', function () { root.classList.add('is-playing'); playBtn.setAttribute('aria-label', 'Pause'); });
  audio.addEventListener('pause', function () { root.classList.remove('is-playing'); playBtn.setAttribute('aria-label', 'Abspielen'); });
  audio.addEventListener('loadedmetadata', function () { if (isFinite(audio.duration)) dur.textContent = fmt(audio.duration); });
  audio.addEventListener('timeupdate', function () {
    var d = audio.duration || data[current].duration || 1;
    var p = audio.currentTime / d * 100;
    bar.value = p; bar.style.setProperty('--p', p + '%');
    cur.textContent = fmt(audio.currentTime);
    markChapter(audio.currentTime);
  });
  bar.addEventListener('input', function () {
    if (!audio.src) select(current, false);
    var d = audio.duration || data[current].duration;
    bar.style.setProperty('--p', bar.value + '%');
    if (d) select(current, false, bar.value / 100 * d);
  });
  speedBtn.addEventListener('click', function () {
    var n = speeds[(speeds.indexOf(audio.playbackRate) + 1) % speeds.length];
    audio.playbackRate = n;
    speedBtn.textContent = String(n).replace('.', ',') + '×';
  });

  document.querySelectorAll('[data-play]').forEach(function (b) {
    b.addEventListener('click', function () {
      select(Number(b.dataset.play), true);
      document.getElementById('folge').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  // Kapitel springen in der Folge, die gerade oben steht.
  if (chaptersEl) chaptersEl.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-seek]');
    if (b) select(current, true, Number(b.dataset.seek));
  });
})();
