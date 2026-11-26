# HawaHisaab

**Your family's daily two-sided air account — _Breathed less_ & _Emitted less_.**

HawaHisaab is a GenAI-powered urban air quality assistant built for Indian families navigating severe winter smog and urban air pollution.

> **Core Rule:** _Numbers come from code, words come from Gemini._  
> A deterministic TypeScript calculation engine computes every AQI value, clean-air window, inhaled PM2.5 dose, indoor mass-balance estimate, and emission reduction. Gemini only plans and explains using numbers supplied by the engine—and if Gemini is unavailable, HawaHisaab falls back seamlessly to a deterministic rule-based plan.

---

## Live Deployment

- **Live URL:** https://hawahisaab.vercel.app
- **Hosting:** Vercel (one project, two services: the React/Vite frontend at `/` and the Express API at `/api`). Every push to `main` deploys automatically.

---

## Google Services Used

- **Gemini API (`@google/genai`)**: Called exclusively from the backend (`POST /api/plan`) using `GEMINI_MODEL` (defaulting to `gemini-3.5-flash`) with strict structured JSON `responseSchema` output, `<<<DATA>>>` grounding, prompt-injection isolation for user free text, and English/Hindi (`en` / `hi`) output.

---

## Architecture

```text
hawahisaab/
├── engine/    # Pure deterministic TypeScript engine (CPCB AQI, clean windows, US EPA dose, indoor mass balance, ARAI/India swaps, daily ledger, fallback plan)
├── server/    # Express + TypeScript API (/api/air, /api/geocode, /api/plan) with helmet, zod validation, 15-min TTL cache, and rate limiting
│   ├── src/services/gemini/   # Gemini client, structured-output schema, grounded prompt builder, indoor scenarios
│   ├── scripts/               # esbuild bundler for the Vercel function (single self-contained ESM file)
│   └── vercel.mjs             # Vercel entrypoint
├── web/       # Mobile-first React + Vite + TypeScript SPA (EN/HI toggle, WCAG 2.1 AA, lazy-loaded views, localStorage profile)
└── vercel.json
```

---

## Security

- **Secrets stay server-side:** `GEMINI_API_KEY` lives only in server environment variables; the browser never calls Gemini directly.
- **Input validation:** every API input is validated with Zod (bounded strings, numbers and array sizes), JSON bodies are capped at 64 kB, and combined free text at 2 kB.
- **Rate limiting:** a per-IP limit on all `/api` routes (120 requests/min) plus a stricter limit on `/api/plan` (20 per 15 min). `trust proxy` is set so limits use the real client IP behind Vercel.
- **HTTP hardening:** Helmet with a strict Content-Security-Policy (`default-src 'self'`), `x-powered-by` disabled, and error responses that never leak stack traces.
- **Prompt-injection defence:** user-typed text is isolated in its own `USER_PROFILE_DATA` block marked as untrusted, with `<`/`>` escaped so it cannot close the block early. Gemini output is schema-validated, and every number shown to users is re-filled from the deterministic engine. If the primary Gemini model is overloaded or slow, the request moves to a fallback model (one capped attempt each, 25 s total) before the rule-based plan is used.
- **Dependencies:** `npm audit` reports 0 known vulnerabilities.

---

## Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Set `GEMINI_API_KEY` in `.env` (optional—without it, `/api/plan` automatically uses the engine's deterministic fallback plan).

3. **Run in development mode**

   ```bash
   npm run dev
   ```

4. **Build and run production server locally**

   ```bash
   npm run serve
   ```

5. **Run lint, typecheck, and tests**
   ```bash
   npm run lint
   npm run typecheck
   npm run test:coverage
   ```

---

## Deploying to Vercel from GitHub

1. **Push this repository to GitHub** (`.env` is gitignored; no secrets are committed).
2. **Import the repository in Vercel** (`Add New... -> Project`).
3. Keep **Root Directory** as `./` and the **Services** preset. Vercel reads [`vercel.json`](vercel.json), which defines two services:
   - **`web`** (Vite): builds the engine and the SPA and serves it at `/`.
   - **`server`** (Express): `npm run build:vercel` bundles the API, engine and dependencies into one ES module (`server/dist/vercel.mjs`), served at `/api/*`.
4. **Add Environment Variables** in Vercel **Project Settings -> Environment Variables**:
   - `GEMINI_API_KEY` = your Google AI Studio Gemini API key
   - `GEMINI_MODEL` = `gemini-3.5-flash` _(optional)_
   - `GEMINI_FALLBACK_MODELS` = `gemini-2.5-flash` _(optional; comma-separated models tried when the primary model is overloaded)_
5. Click **Deploy**. Every push to your connected GitHub branch will trigger a fresh production deployment.

---

## How I Used Antigravity

I built HawaHisaab iteratively with **Antigravity** across six structured phases:

1. **Phased Architecture & Monorepo Scaffolding**: Used Antigravity to design the strict separation between `engine/`, `server/`, and `web/` with strict TypeScript, ESLint (`jsx-a11y`), Prettier, and Vitest.
2. **Deterministic Scientific Engine**: Built and unit-tested every calculation module (India CPCB AQI breakpoints, 6am–10pm clean-window finder, US EPA Chapter 6 inhaled doses, steady-state indoor mass balance, India vehicle/cooking/composting emission factors, and the two-sided ledger) to **98.19% statement/line coverage**.
3. **Safe Gemini Integration**: Implemented backend-only `@google/genai` structured JSON planning with `<<<DATA>>>` grounding, 2 kB free-text validation, rate limiting, and deterministic fallback tests.
4. **Accessible Bilingual UI & Hardening**: Built 6 lazy-loaded mobile-first views with English/Hindi `<html lang>` switching, `axe-core` accessibility verification (0 violations), and mobile Lighthouse auditing (**Performance 100 · Accessibility 100 · Best Practices 100**).
