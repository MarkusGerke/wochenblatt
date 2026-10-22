import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith('.') || spec.startsWith('/')) && ctx.parentURL) {
    const base = new URL(spec, ctx.parentURL);
    const p = fileURLToPath(base);
    if (!existsSync(p)) {
      for (const ext of ['.ts', '/index.ts']) if (existsSync(p + ext)) return next(new URL(base.href + ext).href, ctx);
    }
    if (p.endsWith('.json')) {
      const r = await next(spec, ctx);
      return { ...r, importAttributes: { type: 'json' } };
    }
  }
  return next(spec, ctx);
}
