// Sets (or resets) the password for an existing account. Prompts for it, so it never lands in shell history.
//   DATABASE_URL=... node scripts/set-password.mjs you@example.com
// Needs a direct database connection (for Cloud SQL, through the Auth Proxy; see the README).
import { randomBytes, scrypt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/set-password.mjs <email>");
  process.exit(1);
}

// Read the password without echoing it.
const password = await new Promise((resolve) => {
  process.stderr.write("New password (min 8 characters, hidden): ");
  let buf = "";
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", function onData(ch) {
    for (const c of ch) {
      if (c === "\u0003") process.exit(1); // ctrl-c
      if (c === "\r" || c === "\n") {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.off("data", onData);
        process.stderr.write("\n");
        return resolve(buf);
      }
      if (c === "\u007f") buf = buf.slice(0, -1);
      else buf += c;
    }
  });
});
if (password.length < 8) {
  console.error("Use at least 8 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = await new Promise((res, rej) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));
const prisma = new PrismaClient();
try {
  const n = await prisma.profile.updateMany({
    where: { email: { equals: email, mode: "insensitive" } },
    data: { passwordHash: `scrypt$${salt.toString("hex")}$${hash.toString("hex")}` },
  });
  console.log(n.count ? `Password set for ${email}.` : `No account found for ${email}.`);
} finally {
  await prisma.$disconnect();
}
