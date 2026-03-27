# EnglishTestPro

A small Next.js app for English tests: students take quizzes, admins create them and see simple analytics. You can run and host it **for free** using **Supabase** (database + login) and **Vercel** (the website).

---

## Deploy for free (beginner walkthrough)

You will use two free services:

| Service | What it does | Free? |
|--------|----------------|-------|
| **[Supabase](https://supabase.com/)** | Stores tests, questions, scores, and handles sign-up / login | Yes, free tier |
| **[Vercel](https://vercel.com/)** | Hosts your Next.js app on the internet | Yes, free tier |

You need a **GitHub** account (free) so Vercel can pull your code. If the project is only on your computer, create a new repo on GitHub and push this folder.

### Part 1 — Supabase (database + auth)

1. **Sign up** at [supabase.com](https://supabase.com/) and log in.
2. Click **New project**. Choose a name, set a database password (save it somewhere safe), pick a region close to you, then **Create new project**. Wait until it finishes setting up (a few minutes).
3. Open **SQL** in the left sidebar, then **New query**.
4. Open the file [`supabase-schema.sql`](./supabase-schema.sql) from this project on your computer. **Copy all of it**, paste into the Supabase SQL editor, and click **Run**. You should see success (no red errors).  
   - *This creates tables, security rules, and a rule that the **very first person who signs up** becomes an **admin**.*
5. Set up email login:
   - Go to **Authentication** → **Providers**.
   - Make sure **Email** is enabled.
   - For easier testing: **Authentication** → **Providers** → **Email** → turn off **Confirm email** (optional). If you leave it on, users must click a link in email before they can log in.
6. **Copy your API keys** (you will paste them into Vercel later):
   - Go to **Project Settings** (gear icon) → **API**.
   - Copy **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY`.  
     **Keep this secret.** Never paste it in the browser, never prefix it with `NEXT_PUBLIC_`, and do not commit it to GitHub.

### Part 2 — Put the code on GitHub

1. Create a **new repository** on GitHub (empty is fine).
2. On your computer, in this project folder, run (replace `YOUR_USER` and `YOUR_REPO`):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

   If you already use Git, add the remote and push your `main` branch instead.

### Part 3 — Vercel (host the app)

1. Sign up at [vercel.com](https://vercel.com/) (you can use **Continue with GitHub**).
2. Click **Add New** → **Project** → **Import** your GitHub repository.
3. Vercel should detect **Next.js**. Leave defaults and click **Deploy** only after you add variables (next step).

4. **Before or right after import**, open **Environment Variables** and add **exactly these three** (same names, no typos):

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase **Project URL** |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase **anon public** key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase **service_role** key |

   Enable them for **Production** (and **Preview** if you want previews to work too).

5. Click **Deploy**. When it finishes, open the **Visit** link — that is your live app.

### Part 4 — First use (admin vs student)

1. On your live URL, **register the first account**. That user becomes **admin** (because of the SQL you ran).
2. Log in, go to the admin area, **create a test**, and click **Save**.
3. **Log out**, then **register a second user** (or use another email). That user is a **student** and can take the test.

---

## Run locally (optional)

**Prerequisites:** [Node.js](https://nodejs.org/) 20 or newer.

1. Copy `.env.example` to `.env.local` and fill in the same three Supabase variables as on Vercel.
2. Run:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

---

## Troubleshooting

- If you already deployed before this update, run these SQL statements in Supabase once:
  - `ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;`
  - `ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;`
  - `DROP POLICY IF EXISTS "Allow public read access to tests" ON public.tests;`
  - `CREATE POLICY "Allow public read access to published tests" ON public.tests FOR SELECT USING (is_published = TRUE);`
- **TypeScript / `.next/types` errors:** Run `npm run build` or `npm run dev` once. If you deleted the `.next` folder, also delete `tsconfig.tsbuildinfo` if it exists.
- **Trigger error in SQL:** In `supabase-schema.sql`, if `EXECUTE PROCEDURE` fails, try `EXECUTE FUNCTION` for `handle_new_user` (depends on Postgres version).
- **First user is not admin:** Use a fresh Supabase project, or check in Supabase **Table Editor** → `profiles` that your user has `role` = `admin`.
- **`service_role` exposed:** It must only be in Vercel’s server env vars, not in client code and not prefixed with `NEXT_PUBLIC_`.

---

## Project layout (short) key

- `app/api/tests` — list / create tests (admin creates with service role).
- `app/api/tests/[id]` — load a test for students.
- `app/api/tests/[id]/submit` — submit answers and save results.
- `app/api/admin/analytics` — admin charts (Supabase data).
- `middleware.ts` — keeps Supabase login cookies in sync.
