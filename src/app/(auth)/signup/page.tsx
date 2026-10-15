import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "./SignupForm";
import Link from "next/link";

export const metadata = { title: "Sign up — Steady" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Start your journey"
      subtitle="Two or three habits, short blocks, and a streak that's honest."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
