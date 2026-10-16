# vierkippenzweibier.de

Die Website von VIER KIPPEN ZWEI BIER.

## Wie das funktioniert

Die Folgen kommen automatisch aus dem Podigee-Feed. Die Seite baut sich selbst neu:
- direkt nach jedem Release (Mittwochnacht),
- jeden Morgen,
- bei jeder Änderung hier im Repository.

Nach einem Release muss also niemand etwas tun.

Von Hand neu bauen: Reiter **Actions** → „Seite bauen und veröffentlichen" → **Run workflow**.

## Was man selbst ändern kann

Alles direkt hier auf github.com, Datei anklicken, Stift-Symbol, ändern, „Commit changes":

| Was | Wo |
|---|---|
| Claim, Links, Texte über Fritz und Till | `site.config.mjs` |
| Foto | `assets/venus.jpg` ersetzen (Querformat, mindestens 1280 px breit) |
| Impressum, Datenschutz | `pages/impressum.html`, `pages/datenschutz.html` |
| Farben und Abstände | `src/style.css` (oben bei `:root`) |

Nach dem Speichern ist die Änderung nach ca. 1 Minute live.

## Lokal bauen (optional)

```
npm install
node build.mjs          # holt den echten Feed
npx serve dist          # Vorschau
```
