// Liang-Silbentrennung mit den deutschen TeX-Mustern (hyph-de-1996, MIT)
import { readFileSync } from 'node:fs';
export function loadHyphenator(texPath, leftMin = 2, rightMin = 2) {
  const tex = readFileSync(texPath, 'utf8');
  const body = tex.slice(tex.indexOf('\\patterns{') + 10);
  const pats = body.slice(0, body.indexOf('}')).split('\n').map(l => l.replace(/%.*/, '')).join(' ').split(/\s+/).filter(Boolean);
  const map = new Map();
  for (const p of pats) {
    const letters = p.replace(/\d/g, '');
    const nums = [0];
    for (const ch of p) { if (/\d/.test(ch)) nums[nums.length - 1] = +ch; else nums.push(0); }
    map.set(letters, nums);
  }
  let maxLen = 0; for (const k of map.keys()) maxLen = Math.max(maxLen, k.length);
  return function points(word) {
    const w = '.' + word.toLowerCase() + '.';
    const pts = new Array(w.length + 1).fill(0);
    for (let i = 0; i < w.length; i++)
      for (let j = i + 1; j <= Math.min(w.length, i + maxLen); j++) {
        const n = map.get(w.slice(i, j));
        if (n) for (let k = 0; k < n.length; k++) pts[i + k] = Math.max(pts[i + k], n[k]);
      }
    const res = [];
    for (let i = leftMin; i <= word.length - rightMin; i++) if (pts[i + 1] % 2) res.push(i);
    return res; // Trennstellen: vor Zeichenindex i
  };
}
