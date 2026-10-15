import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";
import Link from "next/link";

export const metadata = { title: "Log in — Steady" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/app";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up today's blocks where you left them."
      footer={
        <>
          New to Steady?{" "}
          <Link href="/signup" className="font-semibold underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
