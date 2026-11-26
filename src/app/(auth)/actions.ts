"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clearFailures, hashPassword, noteFailure, startSession, tooManyAttempts, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthState = {
  error?: string;
  fieldErrors?: { name?: string; email?: string; password?: string };
  checkEmail?: boolean;
  email?: string;
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/app") ? next : "/app";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const fieldErrors: AuthState["fieldErrors"] = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, email };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const limitKey = `${email.toLowerCase()}|${ip}`;
  if (tooManyAttempts(limitKey)) return { error: "Too many attempts. Wait a few minutes and try again.", email };

  const user = await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!(await verifyPassword(password, user?.passwordHash ?? null)) || !user) {
    noteFailure(limitKey);
    return { error: "That email and password don't match.", email };
  }
  clearFailures(limitKey);
  await startSession(user.id);
  redirect(next);
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: AuthState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Tell us your name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email.";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, email };

  if (await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })) {
    return { error: "An account with that email already exists. Try logging in.", email };
  }
  const user = await prisma.profile.create({ data: { email: email.toLowerCase(), name, passwordHash: await hashPassword(password) } });
  await startSession(user.id);
  redirect("/app");
}
