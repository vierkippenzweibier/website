// Countdown bis zur nächsten Folge: Donnerstag 00:00 Uhr deutscher Zeit.
(function () {
  var el = document.querySelector('[data-countdown]');
  if (!el || !window.Intl) return;

  var fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', weekday: 'short', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  var days = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  var pad = function (n) { return String(n).padStart(2, '0'); };

  // Uhrzeit in Berlin als "Wanduhr" in Millisekunden.
  function berlinNow() {
    var p = {};
    fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var h = Number(p.hour) % 24;
    return {
      wall: Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second),
      day: days[p.weekday], h: h,
    };
  }

  function tick() {
    var b = berlinNow();
    // Donnerstag bis 18 Uhr: frisch raus.
    if (b.day === 4 && b.h < 18) {
      el.innerHTML = 'Die neue Folge ist da. <a href="/#folge">Jetzt hören</a>';
      return;
    }
    var daysUntil = (4 - b.day + 7) % 7 || 7;
    var today = new Date(b.wall);
    var target = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + daysUntil);
    var s = Math.max(0, Math.floor((target - b.wall) / 1000));
    var d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    var left = (d ? d + (d === 1 ? ' Tag ' : ' Tagen ') : '') + pad(hh) + ':' + pad(mm) + ':' + pad(ss);
    el.innerHTML = 'Jeden Donnerstag eine neue Folge. <span class="cd-line">Die nächste in <b class="cd">' + left + '</b></span>';
  }

  tick();
  setInterval(tick, 1000);
})();
