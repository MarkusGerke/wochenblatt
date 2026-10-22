// Baut eine Ausgabe des Wochenblatts:
// Obsidian-Notizen → Verteilung auf die Kästen → ſ-Wandlung (lang & rund) → Silbentrennung → HTML
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extrahierePapier } from './paper-extract.mjs';
import { loadHyphenator } from './hyph.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
// „lang und rund“ liegt standardmäßig neben diesem Repo: …/wochenblatt und …/lang-und-rund
const LR = resolve(process.env.LR_REPO || join(HIER, '..', '..', 'lang-und-rund'));
const AUSGABE_DIR = process.argv[2] || join(HIER, '..', 'beispiel', 'Wochenblatt', '2026-KW43');
// Ziel: ein Ordner (Web-App mit Archiv, index.html = neueste Ausgabe) oder eine einzelne .html-Datei (Vorschau)
const OUT = resolve(process.argv[3] || join(HIER, '..', 'dist'));
const ORDNER = !OUT.endsWith('.html');
const AUSGABE_ID = resolve(AUSGABE_DIR).split('/').pop();

// Einstellungen der Ausgabe (später aus der Konfiguration)
const CFG = {
  titel: 'Allgemeines Wochenblatt',
  untertitel: 'Zusammengetragen aus Nachrichten, Stimmen und Neuigkeiten der Woche',
  zeichenProToken: 4,          // grobe Schätzung für deutschen Text
  rechercheFaktor: 3,          // Annahme: Eingabe + Suche ≈ 3 × geschriebener Text
  euroProMioToken: 10,
  tokenProBild: 1500,          // Annahme: ein Bild kostet etwa so viel wie 1.500 Token
  // euroProMioToken und tokenProBild sind Annahmen – später an echte Preise anpassen
  plaetze: { haupt: 3, kurz: 8 },
};

const core = await import(`${LR}/packages/core/src/index.ts`);
const hyph = loadHyphenator(`${LR}/packages/core/third-party/hyph-de-1996.tex`);
const SHY = '\u00AD';

// ---- 1. Notizen lesen ----
function lies(datei) {
  const roh = readFileSync(datei, 'utf8');
  const m = roh.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`Kein Frontmatter in ${datei}`);
  const fm = {};
  for (const z of m[1].split('\n')) {
    const k = z.match(/^([\w-]+):\s*(.*)$/); if (!k) continue;
    let v = k[2].trim();
    try { v = JSON.parse(v); } catch { v = v.replace(/^["']|["']$/g, ''); }
    fm[k[1]] = v;
  }
  const absaetze = m[2].split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { ...fm, relevanz: Number(fm.relevanz) || 0, absaetze, datei, zeichen: roh.length };
}
const notizen = readdirSync(AUSGABE_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort().map((f) => lies(join(AUSGABE_DIR, f)));

// ---- 2. Verteilung (8c): Aufmacher nach Relevanz, jede Rubrik mindestens ein Platz ----
const nachRelevanz = (a, b) => b.relevanz - a.relevanz;
const stimmen = notizen.filter((n) => n.rubrik === 'Stimmen der Woche').sort((a, b) => nachRelevanz(a, b) || String(a.wer).localeCompare(String(b.wer)));
const feuPool = notizen.filter((n) => n.rubrik === 'Feuilleton').sort(nachRelevanz);
const feu = feuPool[0] || null;
// „Über den Tellerrand“: ein Thema außerhalb deiner Likes, immer als letzte Kurzmeldung
const tellerrand = notizen.filter((n) => n.rubrik === 'Über den Tellerrand').sort(nachRelevanz)[0] || null;
const pool = notizen.filter((n) => !stimmen.includes(n) && n !== feu && n !== tellerrand).sort(nachRelevanz);
const vergeben = new Set();
const nimm = (n) => { vergeben.add(n); return n; };
const aufmacher = nimm(pool[0]);
const frei = () => pool.filter((n) => !vergeben.has(n));
const haupt = frei().slice(0, CFG.plaetze.haupt).map(nimm);
const rubrikDrin = (r) => [...vergeben].some((n) => n.rubrik === r);
const fehlende = [...new Set(frei().map((n) => n.rubrik))].filter((r) => !rubrikDrin(r))
  .map((r) => frei().find((n) => n.rubrik === r));          // je Rubrik der relevanteste Artikel
const kurz = [...fehlende, ...frei().filter((n) => !fehlende.includes(n))].slice(0, CFG.plaetze.kurz - (tellerrand ? 1 : 0)).map(nimm);
if (tellerrand) kurz.push(nimm(tellerrand));
const uebrig = frei();

// ---- 3. Satz: ſ-Wandlung + Silbentrennung ----
const toF = (s) => core.convertLongS(s).output;
function trenne(a, f) {
  const wa = a.split(' '), wf = f.split(' ');
  if (wa.length !== wf.length) return { a, f };
  const oa = [], of = [];
  wa.forEach((w, i) => {
    const v = wf[i];
    const m = w.match(/^([^\p{L}]*)([\p{L}]+)([^\p{L}]*)$/u);
    if (!m || v.length !== w.length || m[2].length < 5) { oa.push(w); of.push(v); return; }
    const pts = hyph(m[2]); const off = m[1].length; let x = '', y = '';
    for (let k = 0; k < w.length; k++) { if (pts.includes(k - off)) { x += SHY; y += SHY; } x += w[k]; y += v[k]; }
    oa.push(x); of.push(y);
  });
  return { a: oa.join(' '), f: of.join(' ') };
}
const satz = (s) => trenne(s, toF(s));
const BOX = (n) => n === aufmacher ? 'aufmacher' : haupt.includes(n) ? 'haupt' : kurz.includes(n) ? 'kurz' : n === feu ? 'feuilleton' : stimmen.includes(n) ? 'stimme' : 'ohne';
const MIN = { aufmacher: 40, haupt: 30, feuilleton: 40, kurz: 8, stimme: 8, ohne: 20 };
const BASIS = { aufmacher: 200, haupt: 70, feuilleton: 150, kurz: 24, stimme: 18, ohne: 70 };
// Bilder nur bei Aufmacher und Feuilleton; als data:-URI eingebettet, damit die Ausgabe eine einzige Datei bleibt
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
let bilder = 0;
function bildEinbetten(datei) {
  if (!datei) return null;
  const pfad = join(AUSGABE_DIR, String(datei));
  const typ = MIME[String(datei).split('.').pop().toLowerCase()];
  try { const b64 = readFileSync(pfad).toString('base64'); bilder++; return `data:${typ};base64,${b64}`; }
  catch { console.warn(`Bild fehlt: ${pfad}`); return null; }
}
let i = 0;
const artikel = [aufmacher, ...haupt, ...kurz, feu, ...stimmen, ...uebrig].filter(Boolean).map((n) => {
  const box = BOX(n), absaetze = n.absaetze.map(satz), kf = satz(n.kurzfassung || n.absaetze[0]);
  return {
    id: `artikel-${++i}`, box, wer: n.wer || null, rubrik: n.rubrik, relevanz: n.relevanz,
    titelA: n.titel, titelF: toF(n.titel), unter: n.unterzeile || '',
    quellen: Array.isArray(n.quellen) ? n.quellen : [],
    ka: kf.a, kf: kf.f, pa: absaetze.map((p) => p.a), pf: absaetze.map((p) => p.f),
    min: MIN[box], base: BASIS[box],
    token: Math.round(n.zeichen / CFG.zeichenProToken),
    bild: bildEinbetten(n.bild), bildunterschrift: n.bildunterschrift || '',
  };
});

// ---- 4. Preis: geschätzt aus der Textmenge ----
const tokenText = artikel.reduce((s, a) => s + a.token, 0) + bilder * CFG.tokenProBild;
const tokenGesamt = tokenText * (1 + CFG.rechercheFaktor);
const preis = (tokenGesamt / 1e6) * CFG.euroProMioToken;
const pfennig = Math.round(preis * 1.95583 * 100);   // amtlicher Umrechnungskurs 1 € = 1,95583 DM
const fmt = (x, d = 0) => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

// ---- 5. Datum, Nummer, Archiv ----
function erscheinungsdatum() {
  try {
    const f = readFileSync(join(AUSGABE_DIR, '_fertig.md'), 'utf8').match(/^fertig:\s*(\d{4}-\d{2}-\d{2})/m);
    if (f) return new Date(`${f[1]}T12:00:00`);
  } catch {}
  return new Date();
}
function isoWoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - tag);
  return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
}
const tagDatum = erscheinungsdatum();
const wtag = tagDatum.toLocaleDateString('de-DE', { weekday: 'long' });
const datum = `${wtag}, den ${tagDatum.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`;
const kw = Number((AUSGABE_ID.match(/KW(\d{1,2})/) || [])[1]) || isoWoche(tagDatum);
const woche = `${kw}. Woche`;
const datei = `${AUSGABE_ID}.html`;

const archivPfad = join(ORDNER ? OUT : dirname(OUT), 'archiv.json');
let archiv = [];
if (ORDNER && existsSync(archivPfad)) { try { archiv = JSON.parse(readFileSync(archivPfad, 'utf8')); } catch {} }
const alt = archiv.find((x) => x.id === AUSGABE_ID);
const nr = alt ? alt.nr : archiv.reduce((m, x) => Math.max(m, x.nr), 0) + 1;
const eintrag = { id: AUSGABE_ID, nr, datei, jahr: tagDatum.getFullYear(), datum, woche, pfennig: `${fmt(pfennig)} Pf.`, schlagzeile: toF(aufmacher.titel) };
archiv = [eintrag, ...archiv.filter((x) => x.id !== AUSGABE_ID)].sort((a, b) => b.nr - a.nr);
const jahrgang = tagDatum.getFullYear() - Math.min(...archiv.map((x) => x.jahr || tagDatum.getFullYear())) + 1;

const WB = {
  stand: `${core.RULESET_STAND} · ${String(core.RULESET_FINGERPRINT).slice(0, 7)}`,
  ausgabe: { id: AUSGABE_ID, untertitel: CFG.untertitel, nr, jahrgang, datum, woche, preis: `${fmt(preis, 2)} €`, pfennig: `${fmt(pfennig)} Pf.`, token: fmt(tokenGesamt) },
  artikel,
  archiv,              // neueste zuerst; im Web-App-Betrieb lädt die Seite zusätzlich archiv.json nach
  webapp: ORDNER,
};

// ---- 6. HTML schreiben ----
const font = readFileSync(`${LR}/packages/extension/public/fonts/unifrakturmaguntia-historical.ttf`).toString('base64');
const paper = extrahierePapier(`${LR}/packages/extension/src/shared/paperInclusions.ts`);
let html = readFileSync(join(HIER, 'template.html'), 'utf8');
html = html.replace('__FONT_B64__', font).replace('/*__PAPER__*/', () => paper).replace('/*__DATA__*/', () => `window.WB=${JSON.stringify(WB)};`);

if (ORDNER) {
  // Vollständiges Dokument mit Web-App-Angaben für den Home-Bildschirm
  const i = html.indexOf('<style>');
  const kopf = html.slice(0, i), rest = html.slice(i);
  html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${kopf.trim()}
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Wochenblatt">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eeeadf" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1916" media="(prefers-color-scheme: dark)">
<style>html{-webkit-text-size-adjust:100%}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${rest}
</body>
</html>
`;
  mkdirSync(join(OUT, 'icons'), { recursive: true });
  writeFileSync(join(OUT, datei), html);
  writeFileSync(archivPfad, JSON.stringify(archiv, null, 2));
  // index.html zeigt immer die neueste Ausgabe
  const neueste = archiv[0];
  copyFileSync(join(OUT, neueste.datei), join(OUT, 'index.html'));
  // Web-App-Dateien
  for (const f of ['manifest.webmanifest', 'sw.js']) copyFileSync(join(HIER, 'webapp', f), join(OUT, f));
  for (const f of readdirSync(join(HIER, 'webapp', 'icons'))) copyFileSync(join(HIER, 'webapp', 'icons', f), join(OUT, 'icons', f));
  console.log(`${join(OUT, datei)}: ${fmt(html.length / 1024)} KB · Nr. ${nr} · ${archiv.length} Ausgabe(n) im Archiv · index.html → ${neueste.datei}`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  console.log(`${OUT}: ${fmt(html.length / 1024)} KB`);
}
console.log(`${notizen.length} Notizen · Aufmacher: ${aufmacher.rubrik} ${aufmacher.relevanz} · Haupt: ${haupt.map((n) => n.rubrik + ' ' + n.relevanz).join(', ')}`);
console.log(`Kurz: ${kurz.map((n) => n.rubrik + ' ' + n.relevanz).join(', ')} · ohne Platz: ${uebrig.length}`);
console.log(`${datum} · ${woche} · Preis ${WB.ausgabe.pfennig} = ${WB.ausgabe.preis} (${WB.ausgabe.token} Token geschätzt) · Stand ${WB.stand}`);
