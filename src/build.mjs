// Baut eine Ausgabe des Wochenblatts:
// Obsidian-Notizen → Verteilung auf die Kästen → ſ-Wandlung (lang & rund) → Silbentrennung → HTML
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extrahierePapier } from './paper-extract.mjs';
import { loadHyphenator } from './hyph.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
// „lang und rund“ liegt standardmäßig neben diesem Repo: …/wochenblatt und …/lang-und-rund
const LR = resolve(process.env.LR_REPO || join(HIER, '..', '..', 'lang-und-rund'));
const AUSGABE_DIR = process.argv[2] || join(HIER, '..', 'beispiel', 'Wochenblatt', '2026-KW43');
const OUT = process.argv[3] || join(HIER, '..', 'dist', 'wochenblatt.html');

// Einstellungen der Ausgabe (später aus der Konfiguration)
const CFG = {
  titel: 'Allgemeines Wochenblatt',
  untertitel: 'Zusammengetragen aus Nachrichten, Stimmen und Neuigkeiten der Woche',
  nr: 1, jahrgang: 1, datum: 'Donnerstag, den 22. Oktober 2026', woche: '43. Woche',
  zeichenProToken: 4,          // grobe Schätzung für deutschen Text
  rechercheFaktor: 3,          // Annahme: Eingabe + Suche ≈ 3 × geschriebener Text
  euroProMioToken: 10,         // Annahme, später an echte Preise anpassen
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
  };
});

// ---- 4. Preis: geschätzt aus der Textmenge ----
const tokenText = artikel.reduce((s, a) => s + a.token, 0);
const tokenGesamt = tokenText * (1 + CFG.rechercheFaktor);
const preis = (tokenGesamt / 1e6) * CFG.euroProMioToken;
const pfennig = Math.round(preis * 1.95583 * 100);   // amtlicher Umrechnungskurs 1 € = 1,95583 DM
const fmt = (x, d = 0) => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

const WB = {
  stand: `${core.RULESET_STAND} · ${String(core.RULESET_FINGERPRINT).slice(0, 7)}`,
  ausgabe: { untertitel: CFG.untertitel, nr: CFG.nr, jahrgang: CFG.jahrgang, datum: CFG.datum, woche: CFG.woche, preis: `${fmt(preis, 2)} €`, pfennig: `${fmt(pfennig)} Pf.`, token: fmt(tokenGesamt) },
  artikel,
  // Neueste zuerst; später aus allen Ausgabe-Ordnern im Vault gesammelt
  archiv: [{ nr: CFG.nr, datei: `${AUSGABE_DIR.split("/").pop()}.html`, datum: CFG.datum, woche: CFG.woche, pfennig: `${fmt(pfennig)} Pf.`, schlagzeile: toF(aufmacher.titel) }],
};

const font = readFileSync(`${LR}/packages/extension/public/fonts/unifrakturmaguntia-historical.ttf`).toString('base64');
const paper = extrahierePapier(`${LR}/packages/extension/src/shared/paperInclusions.ts`);
let html = readFileSync(new URL('./template.html', import.meta.url), 'utf8');
html = html.replace('__FONT_B64__', font).replace('/*__PAPER__*/', () => paper).replace('/*__DATA__*/', () => `window.WB=${JSON.stringify(WB)};`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`${OUT}: ${fmt(html.length / 1024)} KB · ${notizen.length} Notizen`);
console.log(`Aufmacher: ${aufmacher.rubrik} ${aufmacher.relevanz} · Haupt: ${haupt.map((n) => n.rubrik + ' ' + n.relevanz).join(', ')}`);
console.log(`Kurz: ${kurz.map((n) => n.rubrik + ' ' + n.relevanz).join(', ')} · ohne Platz: ${uebrig.length}`);
console.log(`Preis ${WB.ausgabe.pfennig} = ${WB.ausgabe.preis} (${WB.ausgabe.token} Token geschätzt) · Stand ${WB.stand}`);
