-- CreateEnum
CREATE TYPE "CalendarKind" AS ENUM ('EVENT', 'REMINDER');

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "kind" "CalendarKind" NOT NULL DEFAULT 'EVENT',
    "title" TEXT NOT NULL,
    "time" TEXT,
    "minuteOfDay" INTEGER,
    "note" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_date_idx" ON "CalendarEvent"("userId", "date");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
