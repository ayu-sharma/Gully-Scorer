# 🏏 Gully Scorer

A **mobile-first, one-thumb** cricket scoring web app built for local tournaments and gully cricket. Score an entire match — runs, extras, wickets, strike rotation, scorecards and results — using nothing but large buttons, bottom sheets and dropdowns. Typing is required only once, during match setup.

Built with **Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · Framer Motion · Airtable · LocalStorage**. No custom backend.

---

## ✨ Features

- **Hero → Setup → Toss → Players → Live Scoring → Scorecard → Result** — a complete match flow.
- **One-thumb scoring pad**: `0 1 2 3 4 6`, then `OUT · WD · NB · LB · BYE · UNDO`, then `End Innings · Change Bowler · Retired Hurt`.
- **Full official scoring logic**
  - Legal balls advance the over; **wides and no-balls do not**.
  - Automatic **strike rotation** on odd runs and at the **end of every over**.
  - **End of over** auto-swaps strike and prompts for a new bowler (a bowler can't bowl consecutive overs).
  - **Wide** → `+1` plus chosen additional runs; **No-ball** → `+1` plus runs off the bat; **Bye / Leg-bye** → extras only, strike rotates on the runs run.
  - **Wickets**: Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket, Retired Hurt — then auto-prompts the next batsman.
- **Animated coin toss** with a real random result, then bat/bowl choice.
- **Live derived stats**: run rate, required run rate, strike rates, economy, partnerships, extras, fall of wickets, this-over and last-six-balls strips.
- **Perfect Undo** — restores every value of the previous delivery via state snapshots.
- **Complete scorecard** (batting + bowling + extras + totals) and a **match result** with margin & summary.
- **Auto-save every delivery** to LocalStorage; when Airtable is configured, every ball is synced, and **offline writes are queued and flushed on reconnect**.
- **Modern UI**: dark mode, glassmorphism, rounded cards, smooth Framer Motion transitions, bottom sheets, toast notifications, haptic feedback, and 48px+ touch targets. No scrolling while scoring.

---

## 🚀 Quick start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) configure Airtable sync
cp .env.local.example .env.local   # then fill in your token + base id

# 3. Run the dev server
npm run dev
```

Open **http://localhost:3000** on your phone (or use your browser's device emulator) and tap **Start Match**.

> The app runs immediately **without** any credentials — Airtable is purely additive. Without it, everything is stored locally in the browser.

### Other scripts

```bash
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # strict TypeScript check (tsc --noEmit)
```

---

## 🗂️ Project structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # root layout, fonts, providers
│   ├── providers.tsx       # client providers (Match + Toast)
│   ├── globals.css         # Tailwind + design tokens
│   ├── page.tsx            # Hero
│   ├── setup/page.tsx      # Team + 11-player setup
│   ├── toss/page.tsx       # Animated coin toss + bat/bowl
│   ├── players/page.tsx    # Opening batsmen + bowler
│   ├── score/page.tsx      # Main one-thumb scoring screen
│   ├── scorecard/page.tsx  # Full batting/bowling scorecard
│   └── result/page.tsx     # Winner, margin, summary
├── components/
│   ├── ui/                 # Button, BottomSheet, Toast, Card, Select, ...
│   └── scoring/            # Scoreboard, BatsmenPanel, ScoringPad, sheets, ...
├── context/                # MatchContext + reducer (the scoring engine)
├── hooks/                  # useMatch, useToast, useHaptics, useOnlineStatus, ...
├── services/               # airtable, sync queue, localStorage persistence
├── utils/                  # cricket calculations, formatting, ids
├── types/                  # the full domain model
└── constants/              # routes, labels, scoring config
```

---

## 🧠 How scoring state works

All match state lives in a single reducer (`src/context/reducer.ts`) exposed through `MatchContext`. Every action (a run, an extra, a wicket, a bowler change…) produces a brand-new immutable state, and the **previous state is pushed onto an in-memory undo stack** — so `UNDO` restores the prior delivery *exactly*, with no fragile reverse-maths.

The current match is **persisted to LocalStorage on every change**. When Airtable credentials are present, each delivery and each match milestone is also pushed to Airtable; if the network is down the write is queued (`src/services/sync.ts`) and automatically flushed when the browser comes back online.

Derived numbers (run rate, economy, strike rate, required rate, partnerships, this-over strip…) are **computed selectors** in `src/utils/cricket.ts` — never stored, so they can't drift.

---

## ☁️ Deployment

The app is a static-friendly Next.js client app and deploys cleanly to **Vercel** or **Cloudflare Pages**.

**Vercel**

1. Push the repo to GitHub.
2. Import it in Vercel.
3. (Optional) add `NEXT_PUBLIC_AIRTABLE_*` environment variables.
4. Deploy.

**Cloudflare Pages**

1. Framework preset: **Next.js**.
2. Build command `npm run build`, output handled by the Next adapter.
3. (Optional) add the same environment variables.

---

## 🔐 Security note about Airtable

Because there is **no backend**, the Airtable token is shipped to the browser via `NEXT_PUBLIC_*`. This is fine for personal / club use, but you should:

- Use an Airtable **Personal Access Token scoped to only this one base**.
- Treat the data as semi-public.

If you need hardened secrets, put a tiny serverless proxy (e.g. a Vercel Route Handler) in front of Airtable and point the service at it — the `src/services/airtable.ts` module is the only place that talks to Airtable, so swapping the endpoint is a one-file change.

---

## 📋 Airtable schema

See `.env.local.example` for the exact table and field names the app expects. Tables: **Teams**, **Players**, **Matches**, **BallByBall**. Each row also stores a JSON `Payload` so you never lose data even if a column is missing.

---

Made for scorers who'd rather watch the game than type. 🏏
