// Vercel entrypoint: re-exports the Express app from the self-contained bundle
// produced by `npm run build:vercel` (see scripts/bundle-vercel.mjs).
export { default } from './dist/vercel.mjs';
