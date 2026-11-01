-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "blockReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderLead" INTEGER NOT NULL DEFAULT 5;
