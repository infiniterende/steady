-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('TODO', 'DOING', 'DONE');

-- CreateTable
CREATE TABLE "WorkBucket" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tint" TEXT NOT NULL DEFAULT 'sage',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkMilestone" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "due" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkTask" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'TODO',
    "day" DATE,
    "points" INTEGER,
    "note" TEXT,
    "bucketId" TEXT,
    "milestoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "WorkTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkBucket_userId_idx" ON "WorkBucket"("userId");

-- CreateIndex
CREATE INDEX "WorkMilestone_userId_idx" ON "WorkMilestone"("userId");

-- CreateIndex
CREATE INDEX "WorkTask_userId_day_idx" ON "WorkTask"("userId", "day");

-- CreateIndex
CREATE INDEX "WorkTask_bucketId_idx" ON "WorkTask"("bucketId");

-- CreateIndex
CREATE INDEX "WorkTask_milestoneId_idx" ON "WorkTask"("milestoneId");

-- AddForeignKey
ALTER TABLE "WorkBucket" ADD CONSTRAINT "WorkBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkMilestone" ADD CONSTRAINT "WorkMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "WorkBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTask" ADD CONSTRAINT "WorkTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "WorkMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row-level security, same owner-only rule as every other table (see 20261102130000_row_level_security).
ALTER TABLE "WorkBucket"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkMilestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkTask"      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'Supabase auth schema not found: skipping owner-only policies.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['WorkBucket', 'WorkMilestone', 'WorkTask'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner only" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "owner only" ON %I FOR ALL TO authenticated
         USING ((SELECT auth.uid()) = "userId")
         WITH CHECK ((SELECT auth.uid()) = "userId")', t);
  END LOOP;
END
$$;
