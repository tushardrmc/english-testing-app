-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Creates tables, RLS, profiles + trigger (first registered user becomes admin).

-- ---------------------------------------------------------------------------
-- Profiles (roles + display name; linked to auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Tests, questions, options, results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'MCQ',
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.options (
  id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests (id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to tests" ON public.tests;
CREATE POLICY "Allow public read access to published tests"
  ON public.tests FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Allow admin read access to all tests"
  ON public.tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow public read access to questions"
  ON public.questions FOR SELECT
  USING (TRUE);

CREATE POLICY "Allow public read access to options"
  ON public.options FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can insert their own results"
  ON public.test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own results"
  ON public.test_results FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Sign-up: create profile; first Auth user becomes admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE
      WHEN (SELECT COUNT(*)::int FROM auth.users) <= 1 THEN 'admin'
      ELSE 'student'
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user ();
