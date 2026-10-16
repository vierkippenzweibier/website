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
      document.querySelectorAll('.episodes li').forEach(function (li) {
        li.classList.toggle('is-current', Number(li.dataset.i) === i);
      });
    }
    if (seek != null) {
      var go = function () { audio.currentTime = seek; };
      if (audio.readyState > 0) go(); else audio.addEventListener('loadedmetadata', go, { once: true });
    }
    if (autoplay) audio.play();
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
      root.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
  document.querySelectorAll('[data-seek]').forEach(function (b) {
    b.addEventListener('click', function () { select(0, true, Number(b.dataset.seek)); });
  });
})();
