import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="home-theme relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-[40px] -ml-[460px] h-[480px] w-[480px] rounded-full bg-peach opacity-85 blur-[90px]" />
        <div className="absolute left-1/2 top-[-40px] ml-[40px] h-[420px] w-[420px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div className="absolute left-1/2 top-[380px] -ml-[100px] h-[380px] w-[380px] rounded-full bg-sky opacity-80 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 pt-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#F4C9B8] text-[13px] font-extrabold text-[#5A3E33]">
            st
          </span>
          <span className="text-base font-bold tracking-[0.02em]">STEADY</span>
        </Link>
        <Link
          href="/"
          className="rounded-full border border-home-line bg-white/75 px-4 py-2 text-[13px] font-semibold hover:bg-white"
        >
          ← Back home
        </Link>
      </div>

      <main className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] rounded-[28px] border border-home-line bg-white/90 p-8 shadow-[0_16px_40px_rgba(120,90,70,0.1)] backdrop-blur">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-sm text-[#5C554E]">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-[13px] text-[#5C554E]">{footer}</div>
        </div>
      </main>
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[12px] border border-home-line bg-white px-3.5 py-3 text-sm text-inherit outline-none transition focus:border-[#3A3530]";

export const primaryBtn =
  "w-full cursor-pointer rounded-full border-0 bg-[#3A3530] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#28241F] disabled:cursor-default disabled:opacity-60";
