// Bundles the server (including @hawahisaab/engine and npm dependencies) into a single
// self-contained ES module for Vercel. Vercel's function packaging does not keep the
// "type": "module" package.json next to the compiled files, so plain .js ESM output
// crashes with "Cannot use import statement outside a module". A single .mjs file is
// always treated as ESM and has no relative or workspace imports to resolve.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/vercel.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  legalComments: 'none',
  // CommonJS dependencies (e.g. express) call require(); give the ESM bundle a real one.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});
