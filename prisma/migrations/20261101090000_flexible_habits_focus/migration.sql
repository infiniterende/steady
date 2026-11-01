-- CreateEnum
CREATE TYPE "HabitSize" AS ENUM ('MIN', 'STANDARD', 'STRETCH');

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "size" "HabitSize";

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "minLabel" TEXT,
ADD COLUMN     "minMinutes" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "stdLabel" TEXT,
ADD COLUMN     "stretchLabel" TEXT,
ADD COLUMN     "stretchMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "firstStep" TEXT,
ADD COLUMN     "top" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "taskId" TEXT,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "plannedMin" INTEGER NOT NULL,
    "actualSec" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusSession_userId_date_idx" ON "FocusSession"("userId", "date");

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

