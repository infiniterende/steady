-- Row-level security for every table in the public schema.
--
-- The app reads and writes through Prisma, which connects as the database owner and bypasses RLS.
-- Supabase also exposes these tables over its public REST API to anyone holding the project's public
-- key, so without RLS any visitor could read or change every user's data. With RLS on:
--   * the API can only see and change a signed-in user's own rows,
--   * the anonymous role sees nothing,
--   * the app itself is unaffected.

-- 1. Turn RLS on everywhere, including Prisma's own bookkeeping table (which gets no policies).
ALTER TABLE "Profile"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Habit"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Block"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoalEntry"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PointEvent"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reminder"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalPhoto"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FocusSession"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlannerItem"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlannerDay"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. Owner-only policies. These need Supabase's auth schema, so they are skipped on a plain Postgres
--    (for example a shadow database); RLS is still enabled there, which only ever denies access.
DO $$
DECLARE
  t text;
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'Supabase auth schema not found: skipping owner-only policies.';
    RETURN;
  END IF;

  -- Tables that carry the owner's id in "userId".
  FOREACH t IN ARRAY ARRAY[
    'Habit', 'Block', 'Task', 'Goal', 'PointEvent', 'Reminder', 'CalendarEvent',
    'JournalEntry', 'JournalPhoto', 'FocusSession', 'PlannerItem', 'PlannerDay'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner only" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "owner only" ON %I FOR ALL TO authenticated
         USING ((SELECT auth.uid()) = "userId")
         WITH CHECK ((SELECT auth.uid()) = "userId")', t);
  END LOOP;

  -- A profile row is keyed by the auth user's id.
  DROP POLICY IF EXISTS "owner only" ON "Profile";
  CREATE POLICY "owner only" ON "Profile" FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

  -- Goal children belong to whoever owns the goal.
  FOREACH t IN ARRAY ARRAY['GoalEntry', 'Milestone'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner only" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "owner only" ON %I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM "Goal" g WHERE g.id = "goalId" AND g."userId" = (SELECT auth.uid())))
         WITH CHECK (EXISTS (SELECT 1 FROM "Goal" g WHERE g.id = "goalId" AND g."userId" = (SELECT auth.uid())))', t);
  END LOOP;

  -- 3. Belt and braces: the anonymous role gets no table privileges at all,
  --    and nobody reaches Prisma's bookkeeping table through the API.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  END IF;
  REVOKE ALL ON "_prisma_migrations" FROM authenticated;
END
$$;
