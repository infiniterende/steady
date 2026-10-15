import Link from "next/link";
import { Card } from "@/components/app/ui";

export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="p-6">
        <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
        <p className="mb-5 max-w-[60ch] text-[13px] text-muted-2">{blurb}</p>
        <div className="rounded-[14px] border border-dashed border-soft p-8 text-center text-[13px] text-muted">
          This screen is next on the list. Until then, everything you log on{" "}
          <Link href="/app" className="font-semibold">
            Today
          </Link>{" "}
          feeds the{" "}
          <Link href="/app/dashboard" className="font-semibold">
            Dashboard
          </Link>
          .
        </div>
      </Card>
    </div>
  );
}
