// Baut die Seite nach dist/. Folgen kommen aus dem Podigee-Feed.
// Lokal testen ohne Netz: FEED_FILE=test/sample-feed.xml node build.mjs
import { readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import config from './site.config.mjs';

const OUT = 'dist';
// Versionsnummer aus dem Dateiinhalt, damit Browser neue CSS/JS sofort laden.
const ver = async (f) => createHash('sha1').update(await readFile(f)).digest('hex').slice(0, 8);
const V = { css: await ver('src/style.css'), js: await ver('src/player.js'), cd: await ver('src/countdown.js'), mo: await ver('src/motion.js') };
const exists = (p) => access(p).then(() => true, () => false);

// ---------- Feed lesen ----------
async function loadFeed() {
  if (process.env.FEED_FILE) return readFile(process.env.FEED_FILE, 'utf8');
  const res = await fetch(config.feed, { headers: { 'user-agent': 'vierkippenzweibier.de site build' } });
  if (!res.ok) throw new Error(`Feed nicht erreichbar: ${res.status}`);
  return res.text();
}

const decode = (s = '') => s
  .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n))
  .replace(/&amp;/g, '&').trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};
const attr = (xml, name, a) => {
  const m = xml.match(new RegExp(`<${name}\\s[^>]*?${a}="([^"]*)"`));
  return m ? decode(m[1]) : '';
};

function toSeconds(v) {
  if (!v) return 0;
  if (/^\d+$/.test(v)) return Number(v);
  return v.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
}

// "#38 – HOOK – Ding1, Ding2 & Ding3" bzw. alt "4K2B - EP19 - HOOK"
function splitTitle(title, epNo) {
  const t = title.trim();
  let m = t.match(/^#(\d+)\s*[–-]\s*(.+?)\s+[–-]\s+(.+)$/);
  if (m) return { no: m[1], hook: m[2], things: m[3] };
  m = t.match(/^4K2B\s*-\s*EP\s*(\d+)\s*-\s*(.+)$/i);
  if (m) return { no: String(Number(m[1])), hook: m[2], things: '' };
  return { no: epNo || '', hook: t, things: '' };
}

function parse(xml) {
  const items = xml.split(/<item[\s>]/).slice(1).map((chunk) => chunk.split('</item>')[0]);
  return items.map((it) => {
    const title = tag(it, 'title');
    const t = splitTitle(title, tag(it, 'itunes:episode'));
    const chapters = [...it.matchAll(/<psc:chapter\s([^>]*?)\/?>/g)].map((m) => ({
      start: toSeconds((m[1].match(/start="([^"]*)"/) || [])[1]?.split('.')[0]),
      title: decode((m[1].match(/title="([^"]*)"/) || [])[1] || ''),
    })).filter((c) => c.title && !/^Kapitel\s*\d+$/i.test(c.title))
      .sort((a, b) => a.start - b.start)
      .filter((c, k, arr) => k === 0 || c.start !== arr[k - 1].start || c.title !== arr[k - 1].title);
    return {
      title,
      ...t,
      subtitle: tag(it, 'itunes:subtitle'),
      date: new Date(tag(it, 'pubDate')),
      audio: attr(it, 'enclosure', 'url'),
      duration: toSeconds(tag(it, 'itunes:duration')),
      link: tag(it, 'link'),
      image: attr(it, 'itunes:image', 'href'),
      chapters,
      notes: (it.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/) || [])[1] || (it.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '',
    };
  }).filter((e) => e.audio).sort((a, b) => b.date - a.date);
}

// ---------- HTML ----------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const date = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
const clock = (s) => [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
const mins = (s) => `${Math.round(s / 60)} Min`;

function layout({ title, description, body, path = '', stage = '', ogImage = '' }) {
  const url = `https://${config.domain}/${path}`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
${ogImage ? `<meta property="og:image" content="https://${config.domain}/${ogImage}">
<meta name="twitter:card" content="summary">` : config.ogImage ? `<meta property="og:image" content="https://${config.domain}/${config.ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="VIER KIPPEN ZWEI BIER – Podcast-Cover">
<meta name="twitter:card" content="summary_large_image">` : hasPhoto ? `<meta property="og:image" content="https://${config.domain}/${config.photo}">` : ''}
<meta name="theme-color" content="#eaeff1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<meta property="og:site_name" content="VIER KIPPEN ZWEI BIER">
<meta property="og:locale" content="de_DE">
<link rel="alternate" type="application/rss+xml" title="VIER KIPPEN ZWEI BIER" href="${config.feed}">
<link rel="stylesheet" href="/style.css?v=${V.css}">
<script>document.documentElement.classList.add('js')</script>
</head>
<body>
<div class="topbar" role="status"><div class="wrap"><span data-countdown>${esc(config.release)}</span></div></div>
${stage ? '<div class="buehne">' : ''}<header class="head wrap">
<a class="logo" href="/">VIER KIPPEN ZWEI BIER</a>
<nav aria-label="Hauptmenü"><ul class="nav">
<li><a href="/">Podcast</a></li>
<li><a href="/#folge">Folgen</a></li>
<li><a href="/#wir">Über uns</a></li>
<li><a href="mailto:vierkippenzweibier@web.de">Kontakt</a></li>
</ul></nav>
</header>
${stage ? `${stage}\n</div>` : ''}
${body}
<footer class="site-foot"><div class="wrap">
<div class="foot">
<span class="foot-say">${esc(config.footer)}</span>
<nav class="foot-soc" aria-label="Hören und folgen"><a href="${config.links.spotify}">Spotify</a><a href="${config.links.apple}">Apple Podcasts</a><a href="${config.links.instagram}">Instagram</a><a href="${config.links.tiktok}">TikTok</a></nav>
<nav class="foot-legal" aria-label="Rechtliches"><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a></nav>
</div>
</div>
<div class="wordmark" aria-hidden="true"><span>VIER KIPPEN ZWEI BIER</span></div>
</footer>
<script src="/countdown.js?v=${V.cd}" defer></script>
<script src="/motion.js?v=${V.mo}" defer></script>
</body>
</html>
`;
}

// Sagt Google: Diese Domain, Spotify, Apple, Instagram und TikTok sind alle derselbe Podcast.
// Hilft, dass bei der Suche nach dem Namen die eigene Seite oben steht.
function brandData(eps) {
  const site = `https://${config.domain}/`;
  const L = config.links;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': `${site}#website`, url: site,
        name: 'VIER KIPPEN ZWEI BIER', alternateName: config.alternateNames || [], inLanguage: 'de-DE',
      },
      {
        '@type': 'PodcastSeries', '@id': `${site}#podcast`, url: site,
        name: 'VIER KIPPEN ZWEI BIER', alternateName: config.alternateNames || [],
        description: config.metaDescription, inLanguage: 'de-DE',
        ...(hasPhoto ? { image: `${site}${config.photo}` } : {}),
        webFeed: config.feed,
        author: (config.people || []).map((name) => ({ '@type': 'Person', name })),
        sameAs: [L.spotify, L.apple, L.instagram, L.tiktok, ...(config.sameAs || [])].filter(Boolean),
        numberOfEpisodes: eps.length,
      },
    ],
  };
}


// Spotify-Link pro Folge. Braucht SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET (GitHub-Secrets).
// Ohne Zugangsdaten oder wenn eine Folge (noch) nicht gefunden wird, führt der Link zur Show.
async function addSpotifyLinks(eps) {
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  const show = ((config.links.spotify || '').match(/show\/([A-Za-z0-9]+)/) || [])[1];
  if (!id || !secret || !show || process.env.FEED_FILE) { console.log('Spotify: keine Zugangsdaten, Folgen verlinken auf die Show'); return; }
  try {
    const t = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    }).then((r) => r.json());
    if (!t.access_token) throw new Error('kein Token');
    const list = [];
    let url = `https://api.spotify.com/v1/shows/${show}/episodes?market=DE&limit=50`;
    while (url && list.length < 1000) {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${t.access_token}` } });
      if (!r.ok) throw new Error(`Spotify antwortet ${r.status}`);
      const j = await r.json();
      list.push(...(j.items || []).filter(Boolean));
      url = j.next;
    }
    const norm = (x = '') => x.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    const num = (x = '') => { const m = x.match(/^#\s*(\d+)/) || x.match(/EP\s*(\d+)/i); return m ? Number(m[1]) : null; };
    let hit = 0;
    for (const e of eps) {
      const m = list.find((s) => (e.no && num(s.name) === Number(e.no)) || norm(s.name) === norm(e.title));
      if (m && m.external_urls && m.external_urls.spotify) { e.spotify = m.external_urls.spotify; hit++; }
    }
    console.log(`Spotify: ${hit} von ${eps.length} Folgen direkt verlinkt`);
  } catch (err) {
    console.log(`Spotify-Abgleich übersprungen (${err.message}), Folgen verlinken auf die Show`);
  }
}

let hasPhoto = false;
const photoSizes = [];

function home(eps) {
  const latest = eps[0];
  const list = eps.slice(0, config.episodesOnStart + 1);
  const L = config.links;
  const photo = hasPhoto
    ? `<img src="/${esc(config.photo)}" srcset="${photoSizes.map((s) => `/${esc(s.file)} ${s.w}w`).join(', ')}" sizes="(max-width: 760px) 100vw, min(100vw, 1280px)" alt="${esc(config.photoAlt)}" width="1708" height="1281" fetchpriority="high">`
    : `<div class="ph" role="img" aria-label="${esc(config.photoAlt)}">[ Foto folgt ]</div>`;

  const chapterItems = (e) => e.chapters.map((c) => `<li><button type="button" data-seek="${c.start}"><span class="t">${clock(c.start)}</span><span class="ct">${esc(c.title)}</span></button></li>`).join('\n');
  const eyebrow = (e, i) => `${i === 0 ? 'Neue Folge' : 'Folge'} · #${e.no} · ${date(e.date)}`;
  const cover = latest.coverFile;

  // Alles, was der Player beim Wechsel der Folge oben anzeigt.
  const data = list.map((e, i) => ({
    audio: e.audio, duration: e.duration, no: e.no, label: `#${e.no} ${e.hook}`,
    eyebrow: eyebrow(e, i), hook: e.hook, subtitle: e.subtitle,
    cover: e.coverFile ? `/${e.coverFile}` : '', coverAlt: `Cover von Folge #${e.no}`,
    spotify: e.spotify || L.spotify,
    chapters: e.chapters.map((c) => ({ start: c.start, t: clock(c.start), title: c.title })),
  }));

  return layout({
    title: config.metaTitle,
    description: config.metaDescription,
    stage: `<section class="hero" aria-label="Willkommen">
<ul class="listen wrap" aria-label="Hier hören und folgen">
<li><a class="btn" href="${L.spotify}"><small>Hören auf</small><span>Spotify</span></a></li>
<li><a class="btn" href="${L.apple}"><small>Hören auf</small><span>Apple Podcasts</span></a></li>
<li class="soc"><a class="btn" href="${L.instagram}"><small>Folgen auf</small><span>Instagram</span></a></li>
<li class="soc"><a class="btn" href="${L.tiktok}"><small>Folgen auf</small><span>TikTok</span></a></li>
</ul>
<div class="stage">
<figure class="photo">${photo}</figure>
<a class="newcta" href="#folge" data-play="0"><span class="newcta-t"><small>Neue Folge · #${esc(latest.no)}</small><span>${esc(latest.hook)}</span></span><span class="newcta-i" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg></span></a>
<p class="claim">${esc(config.claim)}</p>
</div>
</section>`,
    body: `<main>

<div class="ticker" aria-hidden="true"><div class="ticker-in">${Array(2).fill(`<span>${(config.ticker || []).map((t) => `${esc(t)}<i>/</i>`).join('')}</span>`).join('')}</div></div>

<section id="folge" class="nf"><div class="wrap">
<p class="kicker" data-reveal><span data-eyebrow>${esc(eyebrow(latest, 0))}</span></p>
<div class="ep-head${cover ? ' has-cover' : ''}">
<div class="ep-text">
<span class="nf-no" aria-hidden="true" data-no>#${esc(latest.no)}</span>
<h2 class="nf-h" data-hook data-reveal>${esc(latest.hook)}</h2>
<p class="lede" data-lede data-reveal${latest.subtitle ? '' : ' hidden'}>${esc(latest.subtitle)}</p>
<p class="sp-link" data-reveal><a data-spotify href="${esc(latest.spotify || L.spotify)}">Auf Spotify hören</a></p>
</div>
<div class="cover-wrap" data-reveal><img class="cover" data-cover src="${cover ? `/${cover}` : ''}" alt="Cover von Folge #${esc(latest.no)}" width="600" height="600" loading="lazy"${cover ? '' : ' hidden'}></div>
</div>
<div class="player" data-player data-reveal>
<button class="play" type="button" aria-label="Abspielen">
<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>
<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>
</button>
<div class="track">
<div class="now"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="now-t">#${esc(latest.no)} ${esc(latest.hook)}</span></div>
<input class="bar" type="range" min="0" max="100" step="0.1" value="0" aria-label="Position in der Folge">
<div class="times"><span data-cur>0:00</span><span data-dur>${clock(latest.duration)}</span></div>
</div>
<button class="speed" type="button" aria-label="Wiedergabegeschwindigkeit">1×</button>
</div>
<details class="acc ch-acc" open data-chapters-wrap${latest.chapters.length ? '' : ' hidden'}>
<summary><h3 class="ch-h">Kapitel <span data-ch-count>${latest.chapters.length}</span></h3><span class="acc-i" aria-hidden="true"></span></summary>
<ol class="chapters" data-chapters>
${chapterItems(latest)}
</ol>
</details>
</div></section>

<section class="stats dark" aria-label="Zahlen"><div class="wrap">
<p class="kicker kicker-c" data-reveal>Bis hierhin</p>
<h2 class="stats-h" data-reveal>Jede Woche. Seit Folge eins.</h2>
<ul class="stats-l">
${[
  // Alles aus dem Feed. Kippen: 4 pro Folge und Kopf, Bier: 2 pro Folge und Kopf, zu zweit. "mind.", weil wir manchmal überziehen.
  [eps.length, 'Folgen', ''],
  [Math.round(eps.reduce((s, e) => s + e.duration, 0) / 60), 'Minuten am Tresen', ''],
  [eps.length * 4 * 2, 'Kippen geraucht', 'mind.'],
  [eps.length * 2 * 2, 'Bier getrunken', 'mind.'],
].map(([n, t, pre], i) => `<li data-reveal style="--d:${i}"><span class="pre"${pre ? '' : ' aria-hidden="true"'}>${pre || '&nbsp;'}</span><b data-count="${n}">${n.toLocaleString('de-DE')}</b><span class="lbl">${esc(t)}</span></li>`).join('\n')}
</ul>
</div></section>

<section id="folgen" class="tl"><div class="wrap">
<h2 class="giant" data-reveal>Letzte Folgen</h2>
<div class="tl-head" aria-hidden="true"><span>#</span><span>Folge</span><span>Datum</span><span>Länge</span><span></span></div>
<ul class="episodes" data-reveal>
${list.map((e, i) => `<li data-i="${i}"${i === 0 ? ' class="is-current" hidden' : ''} style="--d:${i}">
<span class="no">#${esc(e.no)}</span>
${e.coverFile ? `<img class="th" src="/${esc(e.coverFile)}" alt="" width="56" height="56" loading="lazy">` : '<span class="th"></span>'}
<div class="txt"><a class="eh eh-link" href="/${slug(e)}">${esc(e.hook)}</a>${e.things ? `<div class="et">${esc(e.things)}</div>` : ''}</div>
<span class="dt"><span class="no-m">#${esc(e.no)} · </span>${i === 0 ? '<span class="new">Neu</span> ' : ''}${date(e.date)}</span>
<span class="ln">${mins(e.duration)}</span>
<button class="go" type="button" data-play="${i}" aria-label="Folge #${esc(e.no)} hören"><span>Hören</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg></button>
</li>`).join('\n')}
</ul>
<p class="more" data-reveal><a class="pill" href="/folgen/">Alle ${eps.length} Folgen <span aria-hidden="true">→</span></a></p>
</div></section>

<section id="wir" class="wir dark"><div class="wrap">
<div class="wir-grid">
<h2 class="giant giant-side" data-reveal>Über <br>uns</h2>
${(config.about || []).length ? `<div class="about">${config.about.map((t, i) => `<p${i === 0 ? ' class="about-lead"' : ''} data-reveal>${esc(t)}</p>`).join('\n')}</div>` : ''}
</div>
${(config.rubriken || []).length ? `<ol class="rubs">
${config.rubriken.map((r, i) => `<li data-reveal style="--d:${i}"><span class="rub-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(r.name)}</h3><p>${esc(r.text)}</p></li>`).join('\n')}
</ol>` : ''}
${config.hosts.length ? `<div class="hosts">
${config.hosts.map((h) => `<div><div class="h h-m">${esc(h.name)}</div><p>${esc(h.text)}</p></div>`).join('\n')}
</div>` : ''}
${(config.press || []).map((a) => `<article class="press">
<figure class="press-img" data-reveal><img src="/${esc(a.image)}" alt="${esc(a.imageAlt)}" width="970" height="546" loading="lazy"><figcaption>Foto: ${esc(a.photographer)} / ${esc(a.outlet)}</figcaption></figure>
<div class="press-txt" data-reveal>
<p class="press-tag">Presse · ${esc(a.outlet)} · ${esc(a.date)}</p>
<h3 class="press-h"><a href="${esc(a.url)}">${esc(a.title)}</a></h3>
<p>${esc(a.intro)}</p>
<p class="press-by">Text: ${a.authorUrl ? `<a href="${esc(a.authorUrl)}">${esc(a.author)}</a>` : esc(a.author)} · ${esc(a.outletLong)}</p>
<p class="press-go"><a class="pill pill-light" href="${esc(a.url)}">Artikel lesen auf bnn.de <span aria-hidden="true">→</span></a></p>
</div>
</article>`).join('\n')}
</div></section>
${(config.faq || []).length ? `
<section id="faq" class="faqs"><div class="wrap">
<h2 class="giant" data-reveal>Fragen?</h2>
<div class="faq">
${config.faq.map((f, i) => `<details class="acc faq-item" data-reveal style="--d:${i}">
<summary><span class="faq-n">${String(i + 1).padStart(2, '0')}</span><h3 class="faq-q">${esc(f.q)}</h3><span class="acc-i" aria-hidden="true"></span></summary>
<div class="faq-a"><p>${f.a}</p></div>
</details>`).join('\n')}
</div>
</div></section>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: config.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })),
}).replace(/</g, '\\u003c')}</script>` : ''}
<script type="application/ld+json">${JSON.stringify(brandData(eps)).replace(/</g, '\\u003c')}</script>
</main>
<script type="application/json" id="episodes-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="/player.js?v=${V.js}" defer></script>`,
  });
}

// ---------- Folgen-Unterseiten ----------
// Shownotes aus dem Feed aufräumen: nur einfache Tags, Zeitstempel-Listen raus (stehen schon als Kapitel da).
function cleanNotes(raw = '') {
  if (!raw) return '';
  let h = raw.replace(/<!\[CDATA\[|\]\]>/g, '');
  if (!/<\w/.test(h)) h = decode(h); // manche Feeds liefern das HTML maskiert (&lt;p&gt;)
  const paras = h.split(/<\/p>\s*/i).map((p) => p.replace(/<p[^>]*>/gi, '')).filter((p) => p.trim());
  const out = [];
  for (const p of (paras.length ? paras : [h])) {
    const lines = p.split(/<br\s*\/?>|\n/i).map((l) => l.trim()).filter(Boolean);
    const kept = lines.filter((l) => {
      const txt = l.replace(/<[^>]+>/g, '').trim();
      return txt && !/^\d{1,2}:\d{2}(:\d{2})?\s/.test(txt) && !/^Kapitel(übersicht)?:?$/i.test(txt);
    });
    if (!kept.length) continue;
    const safe = kept.join('<br>')
      .replace(/<(?!\/?(strong|b|em|i|br|a)\b)[^>]*>/gi, '')
      .replace(/<a\s[^>]*?href="(https?:\/\/[^"]+)"[^>]*>/gi, '<a href="$1" rel="noopener">')
      .replace(/<a(?![^>]*href)[^>]*>/gi, '');
    out.push(`<p>${safe}</p>`);
  }
  return out.join('\n');
}
const plain = (h = '') => decode(h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const slug = (e) => `folge/${e.no}/`;
const isoDur = (s) => `PT${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}H` : ''}${Math.floor(s % 3600 / 60)}M${s % 60}S`;
const tickerOf = (items) => `<div class="ticker" aria-hidden="true"><div class="ticker-in">${Array(2).fill(`<span>${items.map((t) => `${esc(t)}<i>/</i>`).join('')}</span>`).join('')}</div></div>`;
const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';

function playerBlock(e) {
  return `<div class="player" data-player data-reveal>
<button class="play" type="button" aria-label="Abspielen">
<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>
<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>
</button>
<div class="track">
<div class="now"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="now-t">#${esc(e.no)} ${esc(e.hook)}</span></div>
<input class="bar" type="range" min="0" max="100" step="0.1" value="0" aria-label="Position in der Folge">
<div class="times"><span data-cur>0:00</span><span data-dur>${clock(e.duration)}</span></div>
</div>
<button class="speed" type="button" aria-label="Wiedergabegeschwindigkeit">1×</button>
</div>`;
}

function episodePage(e, i, eps) {
  const L = config.links;
  const site = `https://${config.domain}/`;
  const newer = eps[i - 1], older = eps[i + 1];
  const notes = cleanNotes(e.notes);
  const desc = (e.subtitle || plain(e.notes) || `Folge #${e.no} von VIER KIPPEN ZWEI BIER.`).slice(0, 158);
  const chs = e.chapters.filter((c) => !/^(4K2B\s*)?(intro|outro)\b/i.test(c.title));
  const tick = chs.length >= 3 ? chs.map((c) => c.title) : (config.ticker || []);
  const cover = e.coverFile ? `/${e.coverFile}` : '';
  const data = [{
    audio: e.audio, duration: e.duration, no: e.no, label: `#${e.no} ${e.hook}`, hook: e.hook,
    cover, coverAlt: `Cover von Folge #${e.no}`, spotify: e.spotify || L.spotify,
    chapters: e.chapters.map((c) => ({ start: c.start, t: clock(c.start), title: c.title })),
  }];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'PodcastEpisode', '@id': `${site}${slug(e)}#episode`, url: `${site}${slug(e)}`,
        name: `#${e.no} ${e.hook}${e.things ? ` – ${e.things}` : ''}`, episodeNumber: Number(e.no) || undefined,
        datePublished: e.date.toISOString().slice(0, 10), description: desc, timeRequired: isoDur(e.duration),
        inLanguage: 'de-DE', ...(cover ? { image: `${site}${e.coverFile}` } : {}),
        associatedMedia: { '@type': 'MediaObject', contentUrl: e.audio },
        partOfSeries: { '@type': 'PodcastSeries', '@id': `${site}#podcast`, name: 'VIER KIPPEN ZWEI BIER', url: site },
        author: (config.people || []).map((name) => ({ '@type': 'Person', name })),
      },
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'VIER KIPPEN ZWEI BIER', item: site },
          { '@type': 'ListItem', position: 2, name: 'Alle Folgen', item: `${site}folgen/` },
          { '@type': 'ListItem', position: 3, name: `#${e.no} ${e.hook}`, item: `${site}${slug(e)}` },
        ],
      },
    ],
  };
  const card = (x, dir) => x ? `<a class="pn-card pn-${dir}" href="/${slug(x)}" data-reveal${dir === 'next' ? ' style="--d:1"' : ''}>
<span class="pn-dir">${dir === 'prev' ? '← Vorherige Folge' : 'Nächste Folge →'}</span>
<span class="pn-no" aria-hidden="true">#${esc(x.no)}</span>
<span class="pn-h">${esc(x.hook)}</span>
</a>` : `<span class="pn-card pn-empty pn-${dir}"><span class="pn-dir">${dir === 'next' ? 'Nächste Folge' : ''}</span><span class="pn-h">${dir === 'next' ? 'Kommt Donnerstag.' : ''}</span></span>`;

  return layout({
    title: `#${e.no} ${e.hook}${e.things ? ` – ${e.things}` : ''} | VIER KIPPEN ZWEI BIER`,
    description: desc,
    path: slug(e),
    ogImage: cover ? e.coverFile : '',
    stage: tick.length ? tickerOf(tick) : '',
    body: `<main>
<section id="folge" class="nf ep-top"><div class="wrap">
<nav class="crumbs" aria-label="Brotkrumen"><a href="/folgen/">Alle Folgen</a><span aria-hidden="true">/</span><span>#${esc(e.no)}</span></nav>
<p class="kicker">${i === 0 ? 'Neue Folge' : 'Folge'} · #${esc(e.no)} · ${date(e.date)} · ${mins(e.duration)}</p>
<div class="ep-head${cover ? ' has-cover' : ''}">
<div class="ep-text">
<span class="nf-no" aria-hidden="true">#${esc(e.no)}</span>
<h1 class="nf-h eh-in">${esc(e.hook)}</h1>
${e.things ? `<p class="lede eh-in">${esc(e.things)}</p>` : ''}
<div class="eh-cta eh-in">
<button class="eh-play" type="button" data-play="0"><span class="eh-play-i">${playIcon}</span><span>Jetzt reinhören</span></button>
<a class="pill" href="${esc(e.spotify || L.spotify)}">Spotify</a>
<a class="pill" href="${esc(L.apple)}">Apple Podcasts</a>
</div>
</div>
${cover ? `<div class="cover-wrap eh-in"><img class="cover" src="${cover}" alt="Cover von Folge #${esc(e.no)}" width="600" height="600" fetchpriority="high"></div>` : ''}
</div>
${playerBlock(e)}
${e.chapters.length ? `<details class="acc ch-acc" open data-chapters-wrap>
<summary><h2 class="ch-h">Kapitel <span data-ch-count>${e.chapters.length}</span></h2><span class="acc-i" aria-hidden="true"></span></summary>
<ol class="chapters" data-chapters>
${e.chapters.map((c) => `<li><button type="button" data-seek="${c.start}"><span class="t">${clock(c.start)}</span><span class="ct">${esc(c.title)}</span></button></li>`).join('\n')}
</ol>
</details>` : ''}
${notes ? `<div class="notes-grid">
<h2 class="giant giant-side" data-reveal>Worum's <br>geht</h2>
<div class="notes" data-reveal>${notes}</div>
</div>` : ''}
</div></section>
<nav class="pn dark" aria-label="Weitere Folgen"><div class="wrap">
<div class="pn-grid">${card(older, 'prev')}${card(newer, 'next')}</div>
<p class="pn-all" data-reveal><a class="pill pill-light" href="/folgen/">Alle ${eps.length} Folgen <span aria-hidden="true">→</span></a></p>
</div></nav>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</main>
<script type="application/json" id="episodes-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="/player.js?v=${V.js}" defer></script>`,
  });
}

function archivePage(eps) {
  const total = Math.round(eps.reduce((s, e) => s + e.duration, 0) / 60);
  const first = eps[eps.length - 1];
  return layout({
    title: `Alle Folgen | VIER KIPPEN ZWEI BIER`,
    description: `Alle ${eps.length} Folgen von VIER KIPPEN ZWEI BIER: Till und Fritz über Rap, Clubkultur und Fußball, aufgenommen in der Venus Bar Karlsruhe.`,
    path: 'folgen/',
    stage: `<section class="eh-hero arc-hero"><div class="wrap">
<p class="kicker">Archiv · seit ${first.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })}</p>
<h1 class="giant arc-h">Alle Folgen</h1>
<p class="arc-sub"><b>${eps.length}</b> Folgen <i>/</i> <b>${total.toLocaleString('de-DE')}</b> Minuten <i>/</i> jeden Donnerstag eine neue</p>
</div></section>`,
    body: `<main>
<section class="tl arc"><div class="wrap">
<div class="tl-head" aria-hidden="true"><span>#</span><span>Folge</span><span>Datum</span><span>Länge</span><span></span></div>
<ul class="episodes" data-reveal>
${eps.map((e, i) => `<li style="--d:${Math.min(i, 12)}">
<span class="no">#${esc(e.no)}</span>
${e.coverFile ? `<img class="th" src="/${esc(e.coverFile)}" alt="" width="56" height="56" loading="lazy">` : '<span class="th"></span>'}
<div class="txt"><a class="eh eh-link" href="/${slug(e)}">${esc(e.hook)}</a>${e.things ? `<div class="et">${esc(e.things)}</div>` : ''}</div>
<span class="dt"><span class="no-m">#${esc(e.no)} · </span>${i === 0 ? '<span class="new">Neu</span> ' : ''}${date(e.date)}</span>
<span class="ln">${mins(e.duration)}</span>
<span class="go go-arrow" aria-hidden="true"><span>Zur Folge</span>→</span>
</li>`).join('\n')}
</ul>
</div></section>
</main>`,
  });
}

// ---------- Bauen ----------
const xml = await loadFeed();
const eps = parse(xml);
await addSpotifyLinks(eps);
if (!eps.length) throw new Error('Keine Folgen im Feed gefunden');

await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/fonts`, { recursive: true });
await cp('src/style.css', `${OUT}/style.css`);
await cp('src/player.js', `${OUT}/player.js`);
await cp('src/countdown.js', `${OUT}/countdown.js`);
await cp('src/motion.js', `${OUT}/motion.js`);
if (await exists('assets')) await cp('assets', `${OUT}/assets`, { recursive: true });
hasPhoto = await exists(config.photo);
// Kleinere Fassungen (venus-800.jpg, venus-1280.jpg) werden genutzt, wenn sie daneben liegen.
for (const w of [800, 1280]) {
  const file = config.photo.replace(/(\.\w+)$/, `-${w}$1`);
  if (await exists(file)) photoSizes.push({ file, w });
}
if (hasPhoto) photoSizes.push({ file: config.photo, w: 1708 });

const fonts = {
  'anton.woff2': 'node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2',
  'courier-prime-400.woff2': 'node_modules/@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2',
  'courier-prime-700.woff2': 'node_modules/@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2',
};
for (const [name, src] of Object.entries(fonts)) {
  if (await exists(src)) await cp(src, `${OUT}/fonts/${name}`);
  else console.warn(`Schrift fehlt (npm install vergessen?): ${src}`);
}

// Cover jeder Folge auf der Startseite (sonst das Podcast-Cover). Wird lokal gespeichert,
// damit Besucher nichts von Podigee laden, bevor sie auf Play drücken.
const showCover = attr(xml.split(/<item[\s>]/)[0], 'itunes:image', 'href');
await mkdir(`${OUT}/covers`, { recursive: true });
const fetched = new Map();
for (const e of eps) {
  const url = e.image || showCover;
  if (process.env.COVER_FILE) {
    e.coverFile = 'covers/test.jpg';
    if (!fetched.size) { await cp(process.env.COVER_FILE, `${OUT}/${e.coverFile}`); fetched.set(1, 1); }
    continue;
  }
  if (!url || process.env.FEED_FILE) continue;
  if (fetched.has(url)) { e.coverFile = fetched.get(url); continue; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const ext = /png/.test(res.headers.get('content-type') || url) ? 'png' : 'jpg';
    const file = `covers/${e.no || fetched.size}.${ext}`;
    await writeFile(`${OUT}/${file}`, Buffer.from(await res.arrayBuffer()));
    fetched.set(url, file); e.coverFile = file;
  } catch (err) { console.warn(`Cover #${e.no} nicht geladen:`, err.message); }
}

await writeFile(`${OUT}/index.html`, home(eps));
for (const [i, e] of eps.entries()) {
  if (!e.no) continue;
  await mkdir(`${OUT}/${slug(e)}`, { recursive: true });
  await writeFile(`${OUT}/${slug(e)}index.html`, episodePage(e, i, eps));
}
await mkdir(`${OUT}/folgen`, { recursive: true });
await writeFile(`${OUT}/folgen/index.html`, archivePage(eps));
for (const p of ['impressum', 'datenschutz']) {
  const src = await readFile(`pages/${p}.html`, 'utf8');
  const title = src.match(/<h1>(.*?)<\/h1>/)?.[1] || p;
  await mkdir(`${OUT}/${p}`, { recursive: true });
  await writeFile(`${OUT}/${p}/index.html`, layout({ title: `${title} | VIER KIPPEN ZWEI BIER`, description: title, path: `${p}/`, body: `<main class="wrap page">${src}</main>` }));
}
await cp('assets/icons/favicon.ico', `${OUT}/favicon.ico`);
await writeFile(`${OUT}/CNAME`, `${config.domain}\n`);
// Sitemap für Google. Startseite ändert sich mit jeder Folge, daher deren Datum.
const day = (d) => d.toISOString().slice(0, 10);
const pages = [
  { loc: '', lastmod: day(eps[0].date) },
  { loc: 'folgen/', lastmod: day(eps[0].date) },
  ...eps.filter((e) => e.no).map((e) => ({ loc: slug(e), lastmod: day(e.date) })),
  { loc: 'impressum/', lastmod: day(new Date()) },
  { loc: 'datenschutz/', lastmod: day(new Date()) },
];
await writeFile(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `<url><loc>https://${config.domain}/${p.loc}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`);
await writeFile(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: https://${config.domain}/sitemap.xml\n`);

console.log(`Fertig: ${eps.length} Folgen, neueste #${eps[0].no} ${eps[0].hook}${hasPhoto ? '' : ' (noch ohne Foto)'}, ${eps.filter((e) => e.coverFile).length} Cover`);
