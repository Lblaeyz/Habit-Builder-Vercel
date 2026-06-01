# This New Month — Habit Tracker

A dark-theme habit tracker web app built with React + Vite + Supabase. Track daily habits, view calendar heatmaps, and review yearly history stats.

## Run & Operate

- `pnpm --filter @workspace/habit-tracker run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (pure inline styles, no UI libraries)
- Auth + DB: Supabase (email/password + Google OAuth)
- Fonts: Bebas Neue (headings), DM Mono (body) via Google Fonts

## Where things live

- `artifacts/habit-tracker/src/` — all frontend source
- `artifacts/habit-tracker/src/lib/supabase.ts` — Supabase client + types + constants
- `artifacts/habit-tracker/src/pages/` — TodayTab, CalendarTab, HistoryTab, AuthPage
- `artifacts/habit-tracker/src/components/` — EditHabitsModal, Spinner
- `artifacts/habit-tracker/vercel.json` — SPA rewrite rules for Vercel

## Architecture decisions

- Frontend-only: Supabase handles all auth + data — no custom backend needed
- Optimistic UI: habit toggles update state immediately, sync to Supabase in background
- Row-level security on Supabase `habits` and `daily_logs` tables required (`auth.uid() = user_id`)
- Deleted habits keep their `daily_logs` rows intact for historical accuracy
- Default habits auto-seeded on first login (zero habits detected)

## Product

- **Today tab**: Greeting, progress bar, habit checklist with category colors, "Perfect day" banner
- **Calendar tab**: Month grid with per-day completion color fill, clickable day detail panel
- **History tab**: Year heatmap (GitHub-style), monthly bar chart, all-time stats

## Supabase Setup Required

Create these tables in your Supabase project:

```sql
CREATE TABLE habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,
  label text,
  emoji text,
  category text,
  position integer,
  created_at timestamp default now()
);

CREATE TABLE daily_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,
  date date,
  habit_id uuid references habits(id),
  done boolean default false,
  created_at timestamp default now()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own habits" ON habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own logs" ON daily_logs FOR ALL USING (auth.uid() = user_id);
```

Enable Google OAuth in Supabase Auth → Providers.

## Vercel Deployment

1. Connect the repo to Vercel
2. Set **Root Directory** to `artifacts/habit-tracker`
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Build command: `pnpm build`, Output dir: `dist/public`
5. The `vercel.json` handles SPA routing automatically

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Must create Supabase tables + RLS policies manually (see above)
- Google OAuth redirect URL must be added to Supabase Auth → URL Configuration
- `upsert` on `daily_logs` requires a unique constraint on `(user_id, date, habit_id)` — add this to Supabase

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
