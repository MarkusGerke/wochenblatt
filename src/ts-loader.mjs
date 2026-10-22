// Erlaubt Node, die TypeScript-Quellen von „lang und rund“ direkt zu laden (Endungen ergänzen, JSON-Importe).
import { register } from 'node:module';
register('./ts-hooks.mjs', import.meta.url);
