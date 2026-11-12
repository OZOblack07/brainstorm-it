# Brainstorm It — Think Fast. Play Smart. Beat Everyone.
Competitive multiplayer Name/Place/Animal/Thing game. Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, Realtime) · Zod · Vercel.

## 1. Setup (Ubuntu)
```bash
sudo apt install -y nodejs npm   # need Node 18+ (check: node -v)
cd brainstorm-it && npm install
cp .env.example .env.local        # then fill in the 3 values below
npm test                          # runs the anti-cheat engine tests
npm run dev                       # http://localhost:3000
```
## 2. Supabase (free)
1. supabase.com → New project. 2. SQL Editor → paste `supabase/migrations/001_init.sql` → Run, then do the same with `002_rate_limit_review.sql` and `003_twists_25_rounds.sql`.
3. Authentication → Providers → turn on **Anonymous sign-ins** (guest play). Email is on by default; Google is optional (add your Google OAuth keys there).
4. Project Settings → API: copy URL, anon key, service_role key into `.env.local`. **service_role is server-only; never prefix it with NEXT_PUBLIC_.**
## 3. GitHub
```bash
git init && git branch -M main && git add . && git commit -m "Initial Brainstorm It release"
git remote add origin YOUR_GITHUB_REPOSITORY_URL   # <-- paste the URL of the empty repo you create on github.com
git push -u origin main
# or with GitHub CLI: gh repo create brainstorm-it --public --source=. --push
```
Future updates: `git add . && git commit -m "Describe your changes" && git push`
## 4. Vercel (free .vercel.app URL)
vercel.com → Add New Project → import the GitHub repo → add the 3 environment variables → Deploy. Every `git push` to `main` redeploys automatically.
## How the anti-cheat works
`lib/engine.ts`: Unicode NFKD + invisible-char stripping + look-alike (Cyrillic/Greek) mapping → letters only → repeated letters collapsed → irregular/regular plural lemmatisation → canonical key. Same key = duplicate (nobody scores). 1-edit near-misses on 5+ letter words and unknown-to-dictionary answers are **flagged for review, not penalised**. Scoring runs only in `app/api/rooms/[code]/[action]/route.ts` with the service-role key; clients have read-only RLS access.
## Features added in v1.1
- **Solo mode** (`/solo`): 1–4 AI opponents (Zippy, Quirk, Prof, Nova), easy/medium/hard, custom categories. Bots answer only from validated word lists and are scored by the same engine as humans.
- **Accounts** (`/auth`, `/profile`): email sign-up/login, password reset, Google (enable the provider in Supabase → Authentication → Providers, add your Google OAuth keys), profile/avatar, stats, match history. Signing up while a guest keeps your stats.
- **Sound + settings** (`/settings`, 🔊 in the header): mute, volume, default nickname/avatar.
- **Rate limiting**: Postgres-backed (migration 002), per user and per action; returns HTTP 429.
- **Host review**: hosts see Approve/Reject on flagged answers in the results screen; rejecting removes points and re-ranks.
- **Word lists** (`lib/words.ts`): ~1,000 entries across 12 categories, with Nigerian/African names, foods and cities. Plain comma-separated strings — add more any time.
- **Tests**: `npm test` (unit: engine + AI), `npm run test:e2e` (Playwright: first run `npx playwright install chromium`; the multiplayer test needs Supabase configured).
## Twists (v2)
From round 2 each round can bring a random twist (logic in `lib/twists.ts`, shared by solo and multiplayer, scored only on the server in multiplayer): Double Down ×2, Jackpot Category ×3, Risky Business (−5 per wrong answer), Lightning (half time), The Heist (leader loses 10 to the round winner), Copycat Curse (duplicates −5), Underdog's Day (+15 to last place) and two hidden Mystery Rounds (Fortune Wheel, Wordsmith) revealed after the buzzer. Round 1 is always standard; the last round is always the Grand Finale. Scores never drop below zero. Games support up to 25 rounds; letters recycle once all have been used.
## Known limitations
Word lists are finite, so unknown-but-valid answers are flagged for host review. Solo mode isn't saved to the global leaderboard. Lobby chat and reconnect-by-token are not built.
## Troubleshooting
"Could not start guest session" → enable Anonymous sign-ins. Rooms don't update live → check the migration's `alter publication supabase_realtime` line ran (a 4-second poll still keeps state fresh).
