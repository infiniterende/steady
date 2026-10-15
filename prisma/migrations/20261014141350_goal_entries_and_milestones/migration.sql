-- CreateEnum
CREATE TYPE "GoalKind" AS ENUM ('COUNT', 'MEASURE');

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "deadline" DATE,
ADD COLUMN     "kind" "GoalKind" NOT NULL DEFAULT 'COUNT',
ADD COLUMN     "start" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "current" SET DEFAULT 0,
ALTER COLUMN "current" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "target" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "step" SET DEFAULT 1,
ALTER COLUMN "step" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "GoalEntry" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoalEntry_goalId_date_key" ON "GoalEntry"("goalId", "date");

-- CreateIndex
CREATE INDEX "Milestone_goalId_idx" ON "Milestone"("goalId");

-- AddForeignKey
ALTER TABLE "GoalEntry" ADD CONSTRAINT "GoalEntry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
