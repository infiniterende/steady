-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false;


-- Everyone who already has an account skips the first-run setup.
UPDATE "Profile" SET "onboarded" = true;
