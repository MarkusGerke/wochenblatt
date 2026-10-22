// Holt die Pigmenteinschlüsse aus „lang und rund“ (paperInclusions.ts) als Browser-Script – ohne Kopie im Repo.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
export function extrahierePapier(pfad) {
const src = readFileSync(pfad, 'utf8');
const lines = src.split('\n');
const endIdx = lines.findIndex(l => l.startsWith("const OVERLAY_CLASS"));
const startStore = lines.findIndex(l => l.startsWith('export function readPaperPrefsStorage'));
const startMul = lines.findIndex(l => l.startsWith('function mulberry32'));
// Konstanten + Clamp-Funktionen (bis vor Storage) und Zeichencode (mulberry32 … drawPaperInclusions)
let ts = lines.slice(0, startStore).join('\n') + '\n' + lines.slice(startMul, endIdx).join('\n');
ts = ts.replace(/export function resetPaperPrefs[\s\S]*?\n}\n/, '');
let js = stripTypeScriptTypes(ts, { mode: 'strip' }).replace(/^export /gm, '');
js = `/* aus lang-und-rund: packages/extension/src/shared/paperInclusions.ts (MIT) */\nwindow.LRPaper=(function(){\n${js}\nreturn {drawPaperInclusions, DEFAULT_PAPER_PREFS};\n})();`;
return js;
}
