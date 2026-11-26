# HawaHisaab

**Your family's daily two-sided air account — _Breathed less_ & _Emitted less_.**

HawaHisaab is a GenAI-powered urban air quality assistant built for Indian families navigating severe winter smog and urban air pollution.

> **Core Rule:** _Numbers come from code, words come from Gemini._  
> A deterministic TypeScript calculation engine computes every AQI value, clean-air window, inhaled PM2.5 dose, indoor mass-balance estimate, and emission reduction. Gemini only plans and explains using numbers supplied by the engine—and if Gemini is unavailable, HawaHisaab falls back seamlessly to a deterministic rule-based plan.

---

## Live Deployment

- **Live URL:** `https://<your-vercel-project>.vercel.app` _(update after connecting your GitHub repository to Vercel)_

---

## Google Services Used

- **Gemini API (`@google/genai`)**: Called exclusively from the backend (`POST /api/plan`) using `GEMINI_MODEL` (defaulting to `gemini-2.5-flash`) with strict structured JSON `responseSchema` output, `<<<DATA>>>` grounding, prompt-injection isolation for user free text, and English/Hindi (`en` / `hi`) output.

---

## Architecture

```text
hawahisaab/
├── engine/    # Pure deterministic TypeScript engine (CPCB AQI, clean windows, US EPA dose, indoor mass balance, ARAI/India swaps, daily ledger, fallback plan)
├── server/    # Express + TypeScript API (/api/air, /api/geocode, /api/plan) with helmet, zod validation, 15-min TTL cache, and rate limiting
├── api/       # Vercel Serverless Function adapter exporting the Express app
├── web/       # Mobile-first React + Vite + TypeScript SPA (EN/HI toggle, WCAG 2.1 AA, lazy-loaded views, localStorage profile)
└── vercel.json
```

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
3. Vercel automatically reads [`vercel.json`](vercel.json):
   - **Build Command:** `npm run build`
   - **Output Directory:** `web/dist`
   - **API Rewrite:** `/api/(.*)` -> `/api` ([`api/index.ts`](api/index.ts))
4. **Add Environment Variables** in Vercel **Project Settings -> Environment Variables**:
   - `GEMINI_API_KEY` = your Google AI Studio Gemini API key
   - `GEMINI_MODEL` = `gemini-2.5-flash` _(optional)_
5. Click **Deploy**. Every push to your connected GitHub branch will trigger a fresh production deployment.

---

## How I Used Antigravity

I built HawaHisaab iteratively with **Antigravity** across six structured phases:

1. **Phased Architecture & Monorepo Scaffolding**: Used Antigravity to design the strict separation between `engine/`, `server/`, and `web/` with strict TypeScript, ESLint (`jsx-a11y`), Prettier, and Vitest.
2. **Deterministic Scientific Engine**: Built and unit-tested every calculation module (India CPCB AQI breakpoints, 6am–10pm clean-window finder, US EPA Chapter 6 inhaled doses, steady-state indoor mass balance, India vehicle/cooking/composting emission factors, and the two-sided ledger) to **98.19% statement/line coverage**.
3. **Safe Gemini Integration**: Implemented backend-only `@google/genai` structured JSON planning with `<<<DATA>>>` grounding, 2 kB free-text validation, rate limiting, and deterministic fallback tests.
4. **Accessible Bilingual UI & Hardening**: Built 6 lazy-loaded mobile-first views with English/Hindi `<html lang>` switching, `axe-core` accessibility verification (0 violations), and mobile Lighthouse auditing (**Performance 100 · Accessibility 100 · Best Practices 100**).
