-- Sign-in is handled by the app itself (no external auth service): each profile can hold a password hash.
ALTER TABLE "Profile" ADD COLUMN "passwordHash" TEXT;
