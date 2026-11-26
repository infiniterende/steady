import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, readSession, signSession } from "@/lib/session";

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? reject(e) : resolve(k))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const [scheme, saltHex, hashHex] = (stored ?? "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) {
    await derive(password, randomBytes(16)); // keep timing similar when there's no password to check
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Small in-memory brake on password guessing: 8 failures per email+IP in 15 minutes (per server instance). */
const failures = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(key: string): boolean {
  const f = failures.get(key);
  return !!f && f.until > Date.now() && f.n >= 8;
}
export function noteFailure(key: string) {
  const f = failures.get(key);
  if (f && f.until > Date.now()) f.n += 1;
  else failures.set(key, { n: 1, until: Date.now() + 15 * 60 * 1000 });
}
export function clearFailures(key: string) {
  failures.delete(key);
}
