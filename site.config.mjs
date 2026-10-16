// Alles, was ihr selbst anpassen wollt, steht hier.
export default {
  domain: 'vierkippenzweibier.de',
  feed: 'https://vierkippenzweibier.podigee.io/feed/mp3',

  claim: 'ein rapper und ein dj an der theke. rap, clubkultur, fußball und karlsruhe. montags aufgenommen in der venus bar.',
  release: 'Jeden Donnerstag eine neue Folge.',

  links: {
    spotify: 'https://open.spotify.com/show/7zLEk5j2OvZNmY3BaYjprm',
    apple: 'https://podcasts.apple.com/de/podcast/id1872063614',
    instagram: 'https://www.instagram.com/vierkippenzweibier/',
    tiktok: 'https://www.tiktok.com/@vier.kippen.zwei.bier',
  },

  hosts: [
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
