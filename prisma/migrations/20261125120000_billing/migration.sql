-- Subscription billing (Stripe): who has paid, and accounts given free access.
ALTER TABLE "Profile" ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "subscriptionId" TEXT,
ADD COLUMN "subscriptionStatus" TEXT,
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "comped" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Profile_stripeCustomerId_key" ON "Profile"("stripeCustomerId");
