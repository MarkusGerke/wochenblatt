# Konzept

Die Entscheidungen hinter dem Wochenblatt, jeweils mit dem Grund. Wer das nachbaut, kann an jeder Stelle anders entscheiden – die Gründe helfen beim Abwägen.

## Inhalt

**Der Bot schreibt eigene Artikel.** Likes, Lesezeichen und Rubriken sind nur der Ausgangspunkt: Der Bot erkennt daraus die Themen der Woche, recherchiert weiter auf X und im Netz und schreibt zusammenhängende Artikel. Einzelne Beiträge erscheinen nur als Quelle oder kurzes Zitat mit Link.

**Interessen der Woche aus Likes und Lesezeichen.** Jede gespeicherte Beitragsnotiz trägt ein Feld `themen`. Ein Script zählt die Themen der letzten 7 Tage (Lesezeichen dreifach, Likes einfach) und schreibt das Ergebnis in `_interessen.md`. Der Bot liest nur diese kleine Datei statt tausender Notizen – und man sieht jede Woche, warum etwas in der Zeitung steht.
- Für „diese Woche“ zählt das Abrufdatum, nicht das Beitragsdatum. Gegen Altbestände aus einem Erstimport gilt zusätzlich: Beitragsdatum höchstens 30 Tage alt.
- Als freizügig markierte Beiträge zählen nicht; nichtssagende Themen (z. B. `humor`) stehen auf einer Ignorierliste.

**Rubriken plus Wochenthemen.** Feste Rubriken geben das Gerüst, die Wochen-Interessen erhöhen die Relevanz passender Artikel. Ein Thema aus den Likes kann so Aufmacher werden, ohne dass Rubriken verschwinden.

**Über den Tellerrand.** Der letzte Platz in „Kurz notiert“ ist fest für ein Thema reserviert, das in den Likes der Woche *nicht* vorkam – gegen die Echokammer.

**Stimmen der Woche.** Zwei bis drei feste Accounts plus ein bis zwei, die man in dieser Woche am häufigsten geliked oder gespeichert hat.

**Ton.** Modern und sachlich, mit historischen Anklängen dort, wo sie nicht stören: Ortsmarke am Anfang („Austin, 20. Oktober.“), Rubriknamen wie „Vermischtes“. Kein Pastiche-Deutsch um 1900 – das nutzt sich ab und verbiegt Fakten.

## Artikel und Layout

**Der Bot liefert, das Script verteilt.** Der Bot gibt jedem Artikel nur Rubrik und Relevanz (1–10). Das Script verteilt nach festen Regeln: höchste Relevanz wird Aufmacher, jede Rubrik bekommt mindestens einen Platz. So bleibt der Prompt unabhängig vom Layout, und man kann vor dem Erscheinen einfach eine Zahl ändern.

**Immer der volle Artikel.** Derselbe Kasten fasst je nach Bildschirm 5 oder 250 Wörter. Deshalb liefert der Bot drei Ebenen, und das Layout wählt:
1. Vorspann (erster Absatz, 40–60 Wörter, das Wichtigste zuerst),
2. Kurzfassung (ein Satz, höchstens 20 Wörter) für kleine Kästen,
3. nur die Überschrift, wenn selbst dafür kein Platz ist.
Geschnitten wird am Satzende, nur im Notfall mitten im Satz mit „…“.

**Raster.** 6 Spalten ab 1080 px als feste Seite, in der jeder Kasten randvoll gefüllt wird; 4 / 2 / 1 Spalten darunter im Fluss. Aufteilung: Aufmacher, drei Hauptartikel, Stimmen der Woche, Kurz notiert (8 Meldungen), Feuilleton „unter dem Strich“ über die ganze Breite.

**Kopf.** Titel über die volle Breite (mobil zweizeilig), darunter eine Datumszeile mit Woche, Ausgabe-Nr. und Preis.

**Preis.** Geschätzt aus Textmenge und mitgezählten Such- und X-Abrufen, angezeigt in Pfennig (1 € = 1,95583 DM), der Euro-Betrag im Tooltip. Ein Chat-Bot nennt keine Token-Zahlen – deshalb Schätzung statt Abrechnung.

## Satz

- **Nur zwei Schriften:** Fraktur (Unifraktur Maguntia) für Titel und Überschriften, Antiqua (Old Standard) für den Fließtext. Keine Versalien-Zeilen, keine Kursive; Rubriken fett in der Akzentfarbe.
- **Fraktur-Modus:** Auf Wunsch auch der Fließtext in Fraktur, mit langem ſ nach dem Regelwerk von [lang und rund](https://github.com/MarkusGerke/lang-und-rund). Die Wandlung passiert beim Bauen, nicht im Browser.
- **Silbentrennung** beim Bauen mit festen Trennstellen – Browser trennen Wörter mit ſ nicht zuverlässig.
- **Papier:** Pigmenteinschlüsse aus lang-und-rund als Hintergrund, abschaltbar.
- **Bilder:** nur Aufmacher und Feuilleton, ohne KI-Hinweis. Stil Holzstich um 1880 – nicht Kupferstich, der war für Zeitungen zu langsam. Der Bot erzeugt das Bild (16:9, auf 3:2 zugeschnitten) und legt es neben die Notiz. Die Seite vereinheitlicht jedes Bild beim Anzeigen: Graustufen werden per Schwellwert zu klaren Linien in der Druckfarbe, das Papier mit den Pigmenten scheint durch, im Dunkelmodus hell auf dunkel. Aufmacher: Bild über die Breite des Kastens; Feuilleton: links über ein Drittel. Keine echten Personen im Bild.

## Lesen

- Einstellungen rechts oben: Schriftgröße (5 Stufen), Hell / Dunkel / Automatisch, Fraktur-Modus, Pigmente, Raster-Ansicht.
- Links oben: Archiv mit allen Ausgaben (Nummer, Schlagzeile, Datum, Preis).
- Detailseite mit Vorspann, vollem Text und Quellen.
- Nur für eine Person: Die Ausgaben liegen als Web-App in einem Ordner auf dem Mac, unterwegs erreichbar über Tailscale Serve (HTTPS im eigenen Tailnet). Kein Hosting, kein Login.
- Web-App auf dem Home-Bildschirm (iPhone, iPad) bzw. im Dock (Mac): eigenes Symbol, Start ohne Browserleisten, gelesene Ausgaben offline verfügbar. Einstellungen merkt sich jedes Gerät selbst.
- `index.html` ist immer die neueste Ausgabe; `archiv.json` sammelt alle Ausgaben, Nummer und Jahrgang ergeben sich daraus.

## Ablauf

Nur der Bot läuft nach Uhrzeit; alle anderen reagieren auf das, was davor passiert ist.

1. **Recherche (nachts, auf dem Rechner des Bots):** Der Bot liest seine Kopie von `_redaktion.md` und `_interessen.md`, prüft, ob heute Erscheinungstag ist, recherchiert Rubrik für Rubrik und schreibt jeden Artikel sofort als Datei. Als Letztes `_liste.md` mit allen Dateinamen und den gezählten Abrufen. Ein Fortschritt in `_stand.md` erlaubt, nach einem Abbruch fortzusetzen (einzelne Befehle sind zeitlich begrenzt).
2. **Zustellung (alle 30 Minuten, bis es klappt):** Der Bot überträgt eine vollständige Ausgabe in den Vault, zählt nach, schreibt `_fertig.md` und markiert sie als übertragen. Dabei nimmt er eine frische Kopie von `_redaktion.md` und `_interessen.md` mit.
3. **Bau (auf dem Mac):** Ein Wächter (launchd) sieht `_fertig.md`, holt per `git pull` den neuesten Stand von lang-und-rund und baut Ausgabe und Archiv. Ändert man danach eine Notiz, wird neu gebaut.
4. **Kontrolle:** Fehlt `_fertig.md` am Erscheinungstag um 8 Uhr, meldet sich der Mac.

**Warum getrennt:** Der Bot kann nur in den Vault schreiben, wenn der Mac wach ist, die App läuft und der lokale Zugriff erlaubt ist. Die Recherche braucht all das nicht – nur die Ablage.

**Erscheinungstag** steht nur in `_redaktion.md` (Standard: sonntags). Eine Änderung dort gilt ab der nächsten Nacht.

**Am Mac:** Ruhezustand verhindern, Bot-App als Anmeldeobjekt, den Vault-Ordner in iCloud „immer auf diesem Gerät behalten“.

## Offene Bausteine

- `_redaktion.md` als Vorlage
- die beiden Bot-Routinen (Recherche, Zustellung) als Prompts
- Zählscript für `_interessen.md`
- Wächter (launchd) für macOS
