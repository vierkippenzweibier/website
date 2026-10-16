// Alles, was ihr selbst anpassen wollt, steht hier.
export default {
  domain: 'vierkippenzweibier.de',
  feed: 'https://vierkippenzweibier.podigee.io/feed/mp3',

  claim: 'till und fritz reden über rap, clubkultur, fußball und alles dazwischen. montags, wenn die venus bar zu hat. so lange, wie vier kippen und zwei bier halten.',
  release: 'Jeden Donnerstag eine neue Folge.',

  links: {
    spotify: 'https://open.spotify.com/show/7zLEk5j2OvZNmY3BaYjprm',
    apple: 'https://podcasts.apple.com/de/podcast/id1872063614',
    instagram: 'https://www.instagram.com/vierkippenzweibier/',
    tiktok: 'https://www.tiktok.com/@vier.kippen.zwei.bier',
  },

  // Pressetext unter "Über uns". Jeder Eintrag ist ein Absatz.
  about: [
    'Montags hat die Venus Bar in Karlsruhe geschlossen. Dann gehört der Tresen zwei Mikrofonen: Till und Fritz nehmen hier jede Woche VIER KIPPEN ZWEI BIER auf, einen Podcast über Rap, Clubkultur, Fußball und alles, was zwischen zwei Bier so auf den Tisch kommt.',
    'Die beiden kommen aus derselben Szene, nur von verschiedenen Seiten. Till steht als Rapper Schote selbst auf der Bühne und betreibt die Venus Bar. Fritz legt seit 2010 als eine Hälfte des DJ-Duos Pneumatix auf, ist Düsseldorfer in Karlsruhe und hält der Fortuna die Treue. Einig sind sich die beiden dabei längst nicht immer.',
    'Ein Drehbuch gibt es nicht, ein festes Gerüst schon. In „Die dreisten Drei“ kommen jede Woche drei steile Thesen auf den Tisch, in der „Letzten Runde“ geht es um Fragen der Hörerinnen und Hörer. Dazu die Spieltage von KSC und Fortuna, neue Musik und das, was online gerade hochkocht. Wer aus Karlsruhe kommt, erkennt manches wieder. Kennen muss man die Stadt dafür nicht.',
    'Neue Folgen erscheinen in der Nacht auf Donnerstag, um Mitternacht, auf Spotify, Apple Podcasts und hier auf der Seite.',
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
