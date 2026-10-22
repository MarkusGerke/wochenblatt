// Erzeugt eine Beispiel-Ausgabe als Obsidian-Notizen – genau so, wie Grok sie später ablegt.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const DIR = process.argv[2] || new URL('../beispiel/Wochenblatt/2026-KW43', import.meta.url).pathname;
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

const VORSPANN = [
  'Der erste Absatz ist der Vorspann: Er fasst in wenigen Sätzen zusammen, was passiert ist, wer beteiligt war und warum es für dich wichtig ist.',
  'Wer nur diesen Absatz liest, soll trotzdem das Wesentliche wissen.',
];
const POOL = [
  'Hier wird künftig ein Text stehen, den die Redaktion aus den Beiträgen der vergangenen Woche zusammengetragen hat.',
  'Dieser Blindtext dient allein dazu, Satzspiegel, Spaltenbreite und Blocksatz auf allen Bildschirmgrößen zu prüfen.',
  'Lange Wörter wie Donaudampfschifffahrtsgesellschaft oder Kraftfahrzeughaftpflichtversicherung zeigen, ob die Silbentrennung zuverlässig greift.',
  'Wörter wie Wasser, Fluss, Glasscheibe, Haustür und ausgesucht prüfen, ob langes und rundes s an der richtigen Stelle stehen.',
  'Der geneigte Leser möge sich an der Leere dieser Zeilen nicht stören.',
  'Erst wenn Grok die Inhalte liefert, füllt sich die Spalte mit Nachrichten aus aller Welt und aus der Nachbarschaft.',
  'Jede Spalte bricht den Text an ihrer eigenen Breite um, und jede Zeile wird auf die volle Länge ausgetrieben.',
  'Zahlen wie 1.234,56 Mark, Uhrzeiten wie 14.30 Uhr oder der 22. Oktober 2026 sollen im Satz nicht aus der Reihe tanzen.',
  'Ein Absatz endet hier, und der nächste beginnt mit einem Einzug, wie es in den Blättern jener Zeit üblich war.',
  'Das Wochenblatt erscheint jeden Sonntag und sammelt, was die ausgewählten Stimmen und Quellen beschäftigt hat.',
  'Ob ein Kasten groß oder klein ausfällt, bestimmt das Raster; der Text füllt ihn bis zur letzten Zeile.',
  'Umlaute wie ä, ö und ü, das scharfe ß sowie „Anführungszeichen“ und Gedankenstriche – gehören selbstverständlich dazu.',
];
function koerper(words, seed) {
  const paras = [VORSPANN.join(' ')]; let cur = [], n = 0, inP = 0, i = seed;
  while (n < words) {
    const s = POOL[i++ % POOL.length]; cur.push(s);
    const w = s.split(' ').length; n += w; inP += w;
    if (inP >= 70 && n < words) { paras.push(cur.join(' ')); cur = []; inP = 0; }
  }
  if (cur.length) paras.push(cur.join(' '));
  return paras.join('\n\n');
}
const slug = (s) => s.toLowerCase().replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c])).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const yaml = (o) => Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v)}`).join('\n');
function notiz(fm, worte, seed) {
  const name = slug(fm.titel).slice(0, 60) + '.md';
  writeFileSync(`${DIR}/${name}`, `---\n${yaml(fm)}\n---\n${koerper(worte, seed)}\n`);
}

const KF = 'Hier steht in einem einzigen Satz und höchstens zwanzig Wörtern, worum es in dieser Meldung geht.';
const quellen = ['@nutzer_eins 2026-10-18', '@nutzer_zwei 2026-10-20', 'https://example.org/artikel'];
// 12 Artikel aus 4 Rubriken mit unterschiedlicher Relevanz – das Script verteilt sie
const ART = [
  ['Technik', 9], ['Technik', 6], ['Technik', 4], ['Weltgeschehen', 8], ['Weltgeschehen', 5], ['Weltgeschehen', 3],
  ['Region', 7], ['Region', 2], ['Wissenschaft', 5], ['Wissenschaft', 4], ['Wissenschaft', 3], ['Technik', 2],
];
ART.forEach(([rubrik, relevanz], i) => notiz({
  rubrik, relevanz,
  titel: relevanz >= 6 ? `Meldung aus der Rubrik ${rubrik} mit Relevanz ${relevanz}` : `${rubrik}, Relevanz ${relevanz}`,
  unterzeile: 'Die Unterzeile fasst in einem Satz zusammen, worum es geht und warum es diese Woche wichtig war.',
  kurzfassung: KF, quellen,
}, i < 4 ? 650 : 320, i * 3));
notiz({ rubrik: 'Über den Tellerrand', relevanz: 3, titel: 'Ein Thema abseits deiner Likes',
  unterzeile: 'Bewusst ausgewählt, weil es in deinen Likes und Lesezeichen nicht vorkam.', kurzfassung: KF, quellen }, 300, 7);
notiz({ rubrik: 'Feuilleton', relevanz: 5, titel: 'Das Feuilleton läuft wie damals quer unter dem Strich über die ganze Seite',
  unterzeile: 'Betrachtungen, Kultur und Fundstücke der Woche.', kurzfassung: KF, quellen }, 700, 5);
['eins', 'zwei', 'drei', 'vier'].forEach((n, i) => notiz({ rubrik: 'Stimmen der Woche', relevanz: 5, wer: `@nutzer_${n}`,
  titel: `Was @nutzer_${n} diese Woche mitteilte`, unterzeile: 'Zusammenfassung aller Beiträge der Woche.',
  kurzfassung: `@nutzer_${n} hat sich diese Woche vor allem mit einem Thema beschäftigt, das hier in einem Satz steht.`,
  quellen: [`@nutzer_${n}`] }, 180, i + 2));
console.log(`${ART.length + 5} Notizen in ${DIR}`);
