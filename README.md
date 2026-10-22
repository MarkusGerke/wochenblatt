# Allgemeines Wochenblatt

Eine persönliche Wochenzeitung im Stil der illustrierten Blätter um 1880: Fraktur-Überschriften, Blocksatz in Spalten, Pigmente im Papier. Die Inhalte recherchiert und schreibt jede Woche ein KI-Bot (hier: Grok) – ausgehend von den Likes und Lesezeichen auf X, festen Rubriken und ausgewählten Accounts. Ein Script setzt daraus die Ausgabe als eine einzige HTML-Datei, die vom Desktop bis zum Smartphone funktioniert.

Dieses Repo ist ein **Grundgerüst zum Nachbauen**, kein fertiges Produkt. Idee, Aufbau und Code stehen unter MIT – nimm, was du brauchst, und entwickle es für dich weiter.

> **Stand:** Layout und Bau-Script funktionieren mit Beispiel-Notizen. Die Grok-Routinen, die Steuerdatei `_redaktion.md` und der Wächter auf dem Mac folgen.

## So funktioniert es

```
X (Likes, Lesezeichen, Accounts)
   ↓  nachts
KI-Bot recherchiert und schreibt Artikel  →  Notizen in Obsidian
   ↓  sobald _fertig.md erscheint
Bau-Script auf dem Mac  →  2026-KW43.html + Archiv
   ↓
Lesen im Browser, unterwegs über Tailscale
```

Die Entscheidungen hinter diesem Aufbau stehen in [docs/konzept.md](docs/konzept.md).

## Ausprobieren

Voraussetzungen: Node.js ≥ 22.18 und das Repo [lang-und-rund](https://github.com/MarkusGerke/lang-und-rund) **neben** diesem Repo (es liefert ſ-Regelwerk, Fraktur-Schrift, Silbentrennung und Pigmenteinschlüsse).

```bash
git clone https://github.com/MarkusGerke/lang-und-rund
git clone https://github.com/MarkusGerke/wochenblatt
cd wochenblatt
npm run build:beispiel        # erzeugt Beispiel-Notizen und baut dist/wochenblatt.html
```

Liegt `lang-und-rund` woanders: `LR_REPO=/pfad/zu/lang-und-rund npm run build`.

Eine eigene Ausgabe bauen:

```bash
node --import ./src/ts-loader.mjs src/build.mjs <Ordner-mit-Notizen> <ziel.html>
```

## Eine Artikel-Notiz

Der Bot legt pro Artikel eine Markdown-Notiz ab. Der Text ist immer der volle Artikel – wie viel davon auf das Deckblatt passt, entscheidet das Layout.

```markdown
---
rubrik: "Technik"
relevanz: 8
titel: "Schlagzeile"
unterzeile: "Ein Satz, worum es geht."
kurzfassung: "Ein Satz, höchstens 20 Wörter."
quellen: ["@account 2026-10-18", "https://…"]
---
Vorspann: das Wichtigste in 40–60 Wörtern.

Restlicher Artikel …
```

Sonderfälle: `rubrik: "Stimmen der Woche"` (mit Feld `wer: "@account"`), `rubrik: "Feuilleton"` und `rubrik: "Über den Tellerrand"`.

## Was das Bau-Script macht

1. **Verteilen:** Der relevanteste Artikel wird Aufmacher, die nächsten drei Hauptartikel. Jede Rubrik bekommt mindestens einen Platz, der Rest geht nach „Kurz notiert“. Der letzte Platz dort ist für „Über den Tellerrand“ reserviert.
2. **Setzen:** ſ-Wandlung mit [lang und rund](https://github.com/MarkusGerke/lang-und-rund), Silbentrennung nach den deutschen TeX-Mustern, je eine Fassung in Antiqua und Fraktur.
3. **Preis schätzen:** aus der Textmenge (Token-Schätzung) – angezeigt in Pfennig, der Euro-Betrag im Tooltip.
4. **Ausgeben:** eine HTML-Datei mit eingebetteter Schrift, ohne Server.

Im Browser füllt die Seite jeden Kasten bis zur letzten Zeile: Große Kästen zeigen den Vorspann und alles, was noch passt (am Satzende geschnitten), kleine die Kurzfassung, winzige nur die Überschrift.

## Aufbau des Repos

| Pfad | Inhalt |
|---|---|
| `src/build.mjs` | Bau-Script: Notizen lesen, verteilen, setzen, HTML schreiben |
| `src/template.html` | Layout, Raster, Einstellungen, Detail- und Archivseite |
| `src/hyph.mjs` | Silbentrennung (Liang-Algorithmus) |
| `src/paper-extract.mjs` | Pigmenteinschlüsse aus lang-und-rund für den Browser |
| `src/ts-loader.mjs` | Lädt die TypeScript-Quellen von lang-und-rund direkt in Node |
| `scripts/beispiel-erzeugen.mjs` | Erzeugt Beispiel-Notizen mit Blindtext |
| `beispiel/` | Eine Beispiel-Ausgabe, wie der Bot sie ablegt |
| `docs/konzept.md` | Alle Entscheidungen und ihre Gründe |

## Lizenzen

- **Code dieses Repos:** MIT, siehe [LICENSE](LICENSE).
- **lang und rund:** MIT; die Fraktur-Schrift *Unifraktur Maguntia* steht unter SIL OFL 1.1 und wird beim Bauen aus lang-und-rund eingebettet.
- **Old Standard TT** (Antiqua): SIL OFL 1.1, eingebunden über Google Fonts.
- **Deutsche Trennmuster** (`hyph-de-1996`): MIT, aus lang-und-rund.

Ohne Gewähr und ohne Wartungszusage – ein Experiment zum Mitnehmen.
