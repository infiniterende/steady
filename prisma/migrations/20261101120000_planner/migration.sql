-- CreateEnum
CREATE TYPE "PlannerKind" AS ENUM ('TASK', 'ASSIGNMENT', 'DEADLINE', 'APPOINTMENT', 'EVENT');

-- CreateTable
CREATE TABLE "PlannerItem" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "kind" "PlannerKind" NOT NULL DEFAULT 'TASK',
    "title" TEXT NOT NULL,
    "time" TEXT,
    "minuteOfDay" INTEGER,
    "note" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "remindMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerItem_userId_date_idx" ON "PlannerItem"("userId", "date");

-- AddForeignKey
ALTER TABLE "PlannerItem" ADD CONSTRAINT "PlannerItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

