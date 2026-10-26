// Alles, was ihr selbst anpassen wollt, steht hier.
export default {
  domain: 'vierkippenzweibier.de',
  feed: 'https://vierkippenzweibier.podigee.io/feed/mp3',

  claim: 'till und fritz reden über rap, clubkultur, fußball und alles dazwischen. montags, wenn die venus bar zu hat. so lange, wie vier kippen und zwei bier halten.',
  release: 'Jeden Donnerstag eine neue Folge.',

  // Was Google und Link-Vorschauen (WhatsApp, Instagram) anzeigen.
  // Titel möglichst unter 60 Zeichen, Beschreibung unter 155.
  metaTitle: 'VIER KIPPEN ZWEI BIER | Podcast über Rap, Clubkultur & Fußball',
  metaDescription: 'Till und Fritz reden über Rap, Clubkultur, Fußball und alles dazwischen. Aufgenommen in der Venus Bar Karlsruhe, jeden Donnerstag eine neue Folge.',

  // Für Google: andere Schreibweisen des Namens, Hosts und weitere offizielle Profile.
  alternateNames: ['4K2B', 'Vier Kippen Zwei Bier'],
  people: ['Till', 'Fritz'],
  sameAs: ['https://vierkippenzweibier.podigee.io/'],

  links: {
    spotify: 'https://open.spotify.com/show/7zLEk5j2OvZNmY3BaYjprm',
    apple: 'https://podcasts.apple.com/de/podcast/id1872063614',
    instagram: 'https://www.instagram.com/vierkippenzweibier/',
    tiktok: 'https://www.tiktok.com/@vier.kippen.zwei.bier',
  },

  // Pressetext unter "Über uns". Jeder Eintrag ist ein Absatz.
  about: [
    'Montags hat die Venus Bar in Karlsruhe geschlossen. Dann gehört der Tresen zwei Mikrofonen: Till und Fritz nehmen hier jede Woche VIER KIPPEN ZWEI BIER auf, einen Podcast über Rap, Clubkultur, Fußball und alles, was zwischen zwei Bier so auf den Tisch kommt.',
    'Die beiden kommen aus derselben Szene, nur von verschiedenen Seiten. Till stand als Rapper Schote selbst auf der Bühne und betreibt die Venus Bar. Fritz legt seit 2010 als eine Hälfte des DJ-Duos Pneumatix auf, ist Düsseldorfer in Karlsruhe und hält der Fortuna die Treue. Einig sind sich die beiden dabei längst nicht immer.',
    'Ein Drehbuch gibt es nicht, ein festes Gerüst schon. In „Die dreisten Drei“ kommen jede Woche drei steile Thesen auf den Tisch, in der „Letzten Runde“ geht es um Fragen der Hörerinnen und Hörer. Dazu die Spieltage von KSC und Fortuna, neue Musik und das, was online gerade hochkocht. Wer aus Karlsruhe kommt, erkennt manches wieder. Kennen muss man die Stadt dafür nicht.',
    'Neue Folgen erscheinen in der Nacht auf Donnerstag, um Mitternacht, auf Spotify, Apple Podcasts und hier auf der Seite.',
  ],

  // Häufige Fragen ganz unten. Antworten dürfen Links enthalten (<a href="...">...</a>).
  faq: [
    {
      q: 'Was ist VIER KIPPEN ZWEI BIER?',
      a: 'Ein wöchentlicher Podcast von Till und Fritz. Die beiden reden über Rap, Clubkultur, Fußball und alles, was sie gerade beschäftigt. Aufgenommen wird montags in der Venus Bar in Karlsruhe, wenn die Bar geschlossen hat. Eine Folge dauert ungefähr so lange wie vier Kippen und zwei Bier, meistens gut eine Stunde.',
    },
    {
      q: 'Kann ich den Podcast auch hören, wenn ich nicht aus Karlsruhe komme?',
      a: 'Klar. Karlsruhe ist der Ort, an dem aufgenommen wird, nicht das Thema. Die meisten Gespräche drehen sich um Musik, Fußball, Nachtleben und das, was online gerade passiert. Ab und zu geht es auch um die Stadt, kennen muss man sie dafür nicht.',
    },
    {
      q: 'Was ist eine 1UP? Und was sind die dreisten Drei?',
      a: '1UP ist unsere Unpopular Opinion: eine Meinung, mit der man sich eher keine Freunde macht. Der Name ist eine Verbeugung vor der Graffiti- und HipHop-Kultur. Bei den dreisten Drei kommen jede Woche drei steile Thesen auf den Tisch, jede in einem Satz, zum Beispiel „Der Videobeweis hat den Fußball kaputt gemacht“. Danach wird gestritten.',
    },
    {
      q: 'Wann kommen die neuen Folgen?',
      a: 'Jede Woche in der Nacht von Mittwoch auf Donnerstag, um Mitternacht. Wie lange es bis zur nächsten Folge noch dauert, steht ganz oben auf der Seite.',
    },
    {
      q: 'Wo kann ich die neuen Folgen hören?',
      a: 'Auf <a href="https://open.spotify.com/show/7zLEk5j2OvZNmY3BaYjprm">Spotify</a>, <a href="https://podcasts.apple.com/de/podcast/id1872063614">Apple Podcasts</a> und in so gut wie jeder anderen Podcast-App, einfach nach VIER KIPPEN ZWEI BIER suchen. Oder direkt hier oben im Player. Ausschnitte gibt es auf <a href="https://www.instagram.com/vierkippenzweibier/">Instagram</a> und <a href="https://www.tiktok.com/@vier.kippen.zwei.bier">TikTok</a>.',
    },
    {
      q: 'Wie kann man die Jungs erreichen?',
      a: 'Am schnellsten per <a href="https://ig.me/m/vierkippenzweibier">DM auf Instagram</a>. Für alles Längere, Kooperationen oder Presse per Mail an <a href="mailto:vierkippenzweibier@web.de">vierkippenzweibier@web.de</a>. Fragen für die Letzte Runde sammeln wir übrigens in den Instagram-Stories.',
    },
  ],

  // Kurzprofile unter dem Text. Aktuell aus, weil der Pressetext beide vorstellt.
  // Zum Einschalten die Zeilen wieder in die eckigen Klammern von "hosts" setzen.
  hosts: [],
  hostsOff: [
    { name: 'FRITZ', text: 'DJ, seit 2010 als Pneumatix unterwegs. Düsseldorfer in Karlsruhe, Fortuna im Herzen.' },
    { name: 'TILL', text: 'Rapper, als Schote am Mikro. Macht die Venus Bar.' },
  ],

  // Foto in assets/ ablegen und hier den Dateinamen eintragen.
  photo: 'assets/venus.jpg',
  photoAlt: 'Fritz und Till an der Theke der Venus Bar in Karlsruhe',

  // Wie viele ältere Folgen unter der neuesten stehen.
  episodesOnStart: 8,

  footer: 'Montags. Venus Bar. Ihr wisst Bescheid.',
};
