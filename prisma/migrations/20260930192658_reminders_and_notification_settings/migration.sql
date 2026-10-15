-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('PUSH', 'EMAIL');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "quietHours" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyDigest" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "habitId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "minuteOfDay" INTEGER NOT NULL,
    "channel" "Channel" NOT NULL DEFAULT 'PUSH',
    "repeat" TEXT NOT NULL DEFAULT 'Every day',
    "on" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
