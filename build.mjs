// Baut die Seite nach dist/. Folgen kommen aus dem Podigee-Feed.
// Lokal testen ohne Netz: FEED_FILE=test/sample-feed.xml node build.mjs
import { readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import config from './site.config.mjs';

const OUT = 'dist';
// Versionsnummer aus dem Dateiinhalt, damit Browser neue CSS/JS sofort laden.
const ver = async (f) => createHash('sha1').update(await readFile(f)).digest('hex').slice(0, 8);
const V = { css: await ver('src/style.css'), js: await ver('src/player.js') };
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
<link rel="stylesheet" href="/style.css?v=${V.css}">
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
const photoSizes = [];

function home(eps) {
  const latest = eps[0];
  const list = eps.slice(0, config.episodesOnStart + 1);
  const L = config.links;
  const photo = hasPhoto
    ? `<img src="/${esc(config.photo)}" srcset="${photoSizes.map((s) => `/${esc(s.file)} ${s.w}w`).join(', ')}" sizes="(max-width: 760px) 100vw, 640px" alt="${esc(config.photoAlt)}" width="1280" height="960" fetchpriority="high">`
    : `<div class="ph" role="img" aria-label="${esc(config.photoAlt)}">[ Foto folgt ]</div>`;

  const chapterItems = (e) => e.chapters.map((c) => `<li><button type="button" data-seek="${c.start}"><span class="t">${clock(c.start)}</span><span class="ct">${esc(c.title)}</span></button></li>`).join('\n');
  const eyebrow = (e, i) => `${i === 0 ? 'Neue Folge' : 'Folge'} · #${e.no} · ${date(e.date)}`;
  const cover = latest.coverFile;

  // Alles, was der Player beim Wechsel der Folge oben anzeigt.
  const data = list.map((e, i) => ({
    audio: e.audio, duration: e.duration, label: `#${e.no} ${e.hook}`,
    eyebrow: eyebrow(e, i), hook: e.hook, subtitle: e.subtitle,
    cover: e.coverFile ? `/${e.coverFile}` : '', coverAlt: `Cover von Folge #${e.no}`,
    chapters: e.chapters.map((c) => ({ start: c.start, t: clock(c.start), title: c.title })),
  }));

  return layout({
    title: 'VIER KIPPEN ZWEI BIER – Podcast aus Karlsruhe',
    description: `${config.claim} ${config.release}`.replace(/^./, (c) => c.toUpperCase()),
    body: `<main>
<section class="hero wrap" aria-label="Willkommen">
<ul class="listen" aria-label="Hier hören und folgen">
<li><a class="btn" href="${L.spotify}"><small>Hören auf</small><span>Spotify</span></a></li>
<li><a class="btn" href="${L.apple}"><small>Hören auf</small><span>Apple Podcasts</span></a></li>
<li><a class="btn" href="${L.instagram}"><small>Folgen auf</small><span>Instagram</span></a></li>
<li><a class="btn" href="${L.tiktok}"><small>Folgen auf</small><span>TikTok</span></a></li>
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
<p class="eyebrow" data-eyebrow>${esc(eyebrow(latest, 0))}</p>
<h2 class="h h-xl" data-hook>${esc(latest.hook)}</h2>
<p class="lede" data-lede${latest.subtitle ? '' : ' hidden'}>${esc(latest.subtitle)}</p>
</div>
<img class="cover" data-cover src="${cover ? `/${cover}` : ''}" alt="Cover von Folge #${esc(latest.no)}" width="600" height="600" loading="lazy"${cover ? '' : ' hidden'}>
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
<h3 class="sr">Kapitel</h3>
<ol class="chapters" data-chapters${latest.chapters.length ? '' : ' hidden'}>
${chapterItems(latest)}
</ol>
</div></section>

<section id="folgen" class="wrap"><div class="section">
<details class="acc">
<summary><h2 class="h h-m">LETZTE FOLGEN</h2><span class="acc-i" aria-hidden="true"></span></summary>
<ul class="episodes">
${list.slice(1).map((e, i) => `<li data-i="${i + 1}">
<span class="no">#${esc(e.no)}</span>
<div class="txt"><div class="eh">${esc(e.hook)}</div>${e.things ? `<div class="et">${esc(e.things)}</div>` : ''}<div class="et">${date(e.date)} · ${mins(e.duration)}</div></div>
<button class="go" type="button" data-play="${i + 1}">Hören</button>
</li>`).join('\n')}
</ul>
<p class="more"><a href="https://vierkippenzweibier.podigee.io/episodes">Alle ${eps.length} Folgen</a></p>
</details>
</div></section>

<section id="wir" class="wrap"><div class="section">
<h2 class="h h-m">ÜBER UNS</h2>
${(config.about || []).length ? `<div class="about">${config.about.map((t) => `<p>${esc(t)}</p>`).join('\n')}</div>` : ''}
${config.hosts.length ? `<div class="hosts">
${config.hosts.map((h) => `<div><div class="h h-m">${esc(h.name)}</div><p>${esc(h.text)}</p></div>`).join('\n')}
</div>` : ''}
</div></section>
</main>
<script type="application/json" id="episodes-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="/player.js?v=${V.js}" defer></script>`,
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

// Cover jeder Folge auf der Startseite (sonst das Podcast-Cover). Wird lokal gespeichert,
// damit Besucher nichts von Podigee laden, bevor sie auf Play drücken.
const showCover = attr(xml.split(/<item[\s>]/)[0], 'itunes:image', 'href');
await mkdir(`${OUT}/covers`, { recursive: true });
const fetched = new Map();
for (const e of eps.slice(0, config.episodesOnStart + 1)) {
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
for (const p of ['impressum', 'datenschutz']) {
  const src = await readFile(`pages/${p}.html`, 'utf8');
  const title = src.match(/<h1>(.*?)<\/h1>/)?.[1] || p;
  await mkdir(`${OUT}/${p}`, { recursive: true });
  await writeFile(`${OUT}/${p}/index.html`, layout({ title: `${title} – VIER KIPPEN ZWEI BIER`, description: title, path: `${p}/`, body: `<main class="wrap page">${src}</main>` }));
}
await writeFile(`${OUT}/CNAME`, `${config.domain}\n`);
await writeFile(`${OUT}/robots.txt`, `User-agent: *\nAllow: /\n`);

console.log(`Fertig: ${eps.length} Folgen, neueste #${eps[0].no} ${eps[0].hook}${hasPhoto ? '' : ' (noch ohne Foto)'}, ${eps.filter((e) => e.coverFile).length} Cover`);
