import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { AuthTypes, Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// On Google Cloud SQL the database accepts no open network connections. The app reaches it through
// Google's authenticated connector, using a service account whose key is in GCP_SERVICE_ACCOUNT_JSON.
// Anywhere else (local Postgres, Supabase) the plain DATABASE_URL is used.
async function makeClient() {
  const log = process.env.NODE_ENV === "development" ? (["warn", "error"] as const) : (["error"] as const);
  const instance = process.env.CLOUD_SQL_INSTANCE;
  if (!instance) return new PrismaClient({ log: [...log] });

  const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON ?? "{}");
  const connector = new Connector({ auth: new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/sqlservice.admin"] }) });
  // The connector hands back a ready-made secure stream; pg is told to use it instead of opening a socket.
  const options = await connector.getOptions({ instanceConnectionName: instance, ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.PASSWORD });
  const pool = new Pool({
    ...options,
    user: process.env.CLOUD_SQL_USER,
    password: process.env.CLOUD_SQL_PASSWORD,
    database: process.env.CLOUD_SQL_DATABASE,
    max: 3,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool), log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? (await makeClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
