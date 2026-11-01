-- AlterEnum
ALTER TYPE "PlannerKind" ADD VALUE 'REMINDER';

-- AlterTable
ALTER TABLE "PlannerItem" ADD COLUMN     "place" TEXT;

-- CreateTable
CREATE TABLE "PlannerDay" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT,
    "note" TEXT,
    "tint" TEXT,

    CONSTRAINT "PlannerDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlannerDay_userId_date_key" ON "PlannerDay"("userId", "date");

-- AddForeignKey
ALTER TABLE "PlannerDay" ADD CONSTRAINT "PlannerDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

