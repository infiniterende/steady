-- CreateTable
CREATE TABLE "JournalPhoto" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalPhoto_path_key" ON "JournalPhoto"("path");

-- CreateIndex
CREATE INDEX "JournalPhoto_entryId_idx" ON "JournalPhoto"("entryId");

-- AddForeignKey
ALTER TABLE "JournalPhoto" ADD CONSTRAINT "JournalPhoto_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
