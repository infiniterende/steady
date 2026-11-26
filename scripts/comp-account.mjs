// Give an account free access (no subscription needed), or take it away.
//   DATABASE_URL=... node scripts/comp-account.mjs you@example.com [on|off]
import { PrismaClient } from "@prisma/client";

const [email, mode = "on"] = process.argv.slice(2);
if (!email || !["on", "off"].includes(mode)) {
  console.error("usage: node scripts/comp-account.mjs <email> [on|off]");
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const n = await prisma.profile.updateMany({ where: { email: { equals: email, mode: "insensitive" } }, data: { comped: mode === "on" } });
  console.log(n.count ? `${email}: free access ${mode}.` : `No account found for ${email}.`);
} finally {
  await prisma.$disconnect();
}
