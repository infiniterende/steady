// Fails if any table in the public schema is missing row-level security.
// Run after adding a table:  npm run check:rls
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRaw`
    select c.relname as table, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by 1`;
  const bad = rows.filter((r) => !r.rls);
  if (bad.length) {
    console.error(`Row-level security is OFF for: ${bad.map((r) => r.table).join(", ")}`);
    console.error('Add: ALTER TABLE "<name>" ENABLE ROW LEVEL SECURITY; plus an owner-only policy, in a new migration.');
    process.exit(1);
  }
  console.log(`Row-level security is on for all ${rows.length} tables.`);
} finally {
  await prisma.$disconnect();
}
