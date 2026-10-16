// Baut die Seite nach dist/. Folgen kommen aus dem Podigee-Feed.
// Lokal testen ohne Netz: FEED_FILE=test/sample-feed.xml node build.mjs
import { readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import config from './site.config.mjs';

const OUT = 'dist';
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
    })).filter((c) => c.title);
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
    };
  }).filter((e) => e.audio).sort((a, b) => b.date - a.date);
}

// ---------- HTML ----------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const date = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
const clock = (s) => [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
const mins = (s) => `${Math.round(s / 60)} Min`;

function layout({ title, description, body, path = '' }) {
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
${hasPhoto ? `<meta property="og:image" content="https://${config.domain}/${config.photo}">` : ''}
<meta name="theme-color" content="#fcf7e5">
<link rel="alternate" type="application/rss+xml" title="VIER KIPPEN ZWEI BIER" href="${config.feed}">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header class="head wrap">
<a class="logo" href="/">VIER KIPPEN ZWEI BIER</a>
<nav aria-label="Hauptmenü"><ul class="nav">
<li><a href="/#folge">Podcast</a></li>
<li><a href="/#folgen">Folgen</a></li>
<li><a href="/#wir">Über uns</a></li>
<li><a href="mailto:vierkippenzweibier@web.de">Kontakt</a></li>
</ul></nav>
</header>
${body}
<footer class="wrap"><div class="foot">
<span>${esc(config.footer)}</span>
<nav aria-label="Rechtliches"><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a></nav>
</div></footer>
</body>
</html>
`;
}

let hasPhoto = false;
let cover = '';
const photoSizes = [];

function home(eps) {
  const latest = eps[0];
  const list = eps.slice(0, config.episodesOnStart + 1);
  const L = config.links;
  const photo = hasPhoto
    ? `<img src="/${esc(config.photo)}" srcset="${photoSizes.map((s) => `/${esc(s.file)} ${s.w}w`).join(', ')}" sizes="(max-width: 760px) 100vw, 640px" alt="${esc(config.photoAlt)}" width="1280" height="960" fetchpriority="high">`
    : `<div class="ph" role="img" aria-label="${esc(config.photoAlt)}">[ Foto folgt ]</div>`;

  const chapters = latest.chapters.length ? `
<h3 class="sr">Kapitel</h3>
<ol class="chapters">
${latest.chapters.map((c) => `<li><button type="button" data-seek="${c.start}"><span class="t">${clock(c.start)}</span><span class="ct">${esc(c.title)}</span></button></li>`).join('\n')}
</ol>` : '';

  const data = list.map((e) => ({ audio: e.audio, duration: e.duration, label: `#${e.no} ${e.hook}` }));

  return layout({
    title: 'VIER KIPPEN ZWEI BIER – Podcast aus Karlsruhe',
    description: `${config.claim} ${config.release}`.replace(/^./, (c) => c.toUpperCase()),
    body: `<main>
<section class="hero wrap" aria-label="Willkommen">
<ul class="listen" aria-label="Hier hören und folgen">
<li><a href="${L.spotify}">Spotify</a></li>
<li><a href="${L.apple}">Apple</a></li>
<li><a href="${L.instagram}">Instagram</a></li>
<li><a href="${L.tiktok}">TikTok</a></li>
</ul>
<div class="stage">
<figure class="photo">${photo}</figure>
<p class="claim">${esc(config.claim)}</p>
</div>
<p class="release">${esc(config.release)}</p>
</section>

<section id="folge" class="wrap"><div class="section">
<div class="ep-head${cover ? ' has-cover' : ''}">
<div class="ep-text">
<p class="eyebrow">Neue Folge · #${esc(latest.no)} · ${date(latest.date)}</p>
<h2 class="h h-xl">${esc(latest.hook)}</h2>
${latest.subtitle ? `<p class="lede">${esc(latest.subtitle)}</p>` : ''}
</div>
${cover ? `<img class="cover" src="/${cover}" alt="Cover von Folge #${esc(latest.no)}" width="600" height="600" loading="lazy">` : ''}
</div>
<div class="player" data-player>
<button class="play" type="button" aria-label="Abspielen">
<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>
<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>
</button>
<div class="track">
<div class="now">#${esc(latest.no)} ${esc(latest.hook)}</div>
<input class="bar" type="range" min="0" max="100" step="0.1" value="0" aria-label="Position in der Folge">
<div class="times"><span data-cur>0:00</span><span data-dur>${clock(latest.duration)}</span></div>
</div>
<button class="speed" type="button" aria-label="Wiedergabegeschwindigkeit">1×</button>
</div>
${chapters}
</div></section>

<section id="folgen" class="wrap"><div class="section">
<h2 class="h h-m">LETZTE FOLGEN</h2>
<ul class="episodes">
${list.slice(1).map((e, i) => `<li data-i="${i + 1}">
<span class="no">#${esc(e.no)}</span>
<div class="txt"><div class="eh">${esc(e.hook)}</div>${e.things ? `<div class="et">${esc(e.things)}</div>` : ''}<div class="et">${date(e.date)} · ${mins(e.duration)}</div></div>
<button class="go" type="button" data-play="${i + 1}">Hören</button>
</li>`).join('\n')}
</ul>
<p class="more"><a href="https://vierkippenzweibier.podigee.io/episodes">Alle ${eps.length} Folgen</a></p>
</div></section>

<section id="wir" class="wrap"><div class="section">
<h2 class="sr">Über uns</h2>
<div class="hosts">
${config.hosts.map((h) => `<div><div class="h h-m">${esc(h.name)}</div><p>${esc(h.text)}</p></div>`).join('\n')}
</div>
</div></section>
</main>
<script type="application/json" id="episodes-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="/player.js" defer></script>`,
  });
}

// ---------- Bauen ----------
const xml = await loadFeed();
const eps = parse(xml);
if (!eps.length) throw new Error('Keine Folgen im Feed gefunden');

await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/fonts`, { recursive: true });
await cp('src/style.css', `${OUT}/style.css`);
await cp('src/player.js', `${OUT}/player.js`);
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

// Cover der neuesten Folge, sonst das Podcast-Cover. Wird lokal gespeichert.
const coverUrl = eps[0].image || attr(xml.split(/<item[\s>]/)[0], 'itunes:image', 'href');
if (coverUrl && !process.env.FEED_FILE) {
  try {
    const res = await fetch(coverUrl);
    if (!res.ok) throw new Error(res.status);
    const ext = /png/.test(res.headers.get('content-type') || coverUrl) ? 'png' : 'jpg';
    cover = `cover.${ext}`;
    await writeFile(`${OUT}/${cover}`, Buffer.from(await res.arrayBuffer()));
  } catch (e) { console.warn('Cover nicht geladen:', e.message); cover = ''; }
} else if (process.env.COVER_FILE) {
  cover = 'cover.jpg';
  await cp(process.env.COVER_FILE, `${OUT}/${cover}`);
}

await writeFile(`${OUT}/index.html`, home(eps));
for (const p of ['impressum', 'datenschutz']) {
  const src = await readFile(`pages/${p}.html`, 'utf8');
  const title = src.match(/<h1>(.*?)<\/h1>/)?.[1] || p;
  await mkdir(`${OUT}/${p}`, { recursive: true });
  await writeFile(`${OUT}/${p}/index.html`, layout({ title: `${title} – VIER KIPPEN ZWEI BIER`, description: title, path: `${p}/`, body: `<main class="wrap page">${src}</main>` }));
}
await writeFile(`${OUT}/CNAME`, `${config.domain}\n`);
await writeFile(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\n`);

console.log(`Fertig: ${eps.length} Folgen, neueste #${eps[0].no} ${eps[0].hook}${hasPhoto ? '' : ' (noch ohne Foto)'}${cover ? ', mit Cover' : ', ohne Cover'}`);
