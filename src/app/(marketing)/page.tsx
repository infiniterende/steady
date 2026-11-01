import Link from "next/link";
import { HomeNav } from "@/components/home/HomeNav";
import { PhoneMock } from "@/components/home/PhoneMock";
import { Newsletter } from "@/components/home/Newsletter";
import { createClient } from "@/lib/supabase/server";

const PASTEL = ["#F9D8CF", "#D3E9DF", "#D6E3F3", "#F8EBC4"];

const STEPS = [
  { title: "Pick a few habits", body: "Choose two or three routines and give each a time, a length and the part of life it supports." },
  { title: "Show up in short blocks", body: "Run a timer, check the block off, and let points and streaks record the day for you." },
  { title: "Review and adjust", body: "A weekly digest shows what held and what slipped, so you can resize a habit before it breaks." },
];

const FEATURES = [
  { tag: "Today", title: "Timed sessions", body: "Start, pause and reset countdowns for reading, practice or any focused block." },
  { tag: "Schedule", title: "A day in blocks", body: "Lay out habits on a timeline and tick them off as the day goes." },
  { tag: "Goals", title: "Longer targets", body: "Track books read, focus minutes or move-days against a deadline." },
  { tag: "Dashboard", title: "Consistency at a glance", body: "Twelve weeks of history, milestones and a streak per habit." },
  { tag: "Calendar", title: "Reminders that respect you", body: "Per-habit nudges with quiet hours and a Sunday summary." },
  { tag: "Planner", title: "A week you can see", body: "Deadlines, appointments and tasks by day, with reminders that pop up and chime." },
];

const FOOTER_COLS = [
  { title: "Product", links: [["Overview", "#"], ["How it works", "#how"], ["Features", "#features"]] },
  { title: "App", links: [["Dashboard", "/app/dashboard"], ["Goals", "/app/goals"], ["Habits", "/app/habits"], ["Profile", "/app/profile"]] },
  { title: "Company", links: [["About", "#"], ["Journal", "#"], ["Help center", "#"], ["Contact", "#"]] },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user;

  return (
    <div className="home-theme relative min-h-screen overflow-hidden">
      {/* Blurred pastel blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-[120px] -ml-[420px] h-[520px] w-[520px] rounded-full bg-peach opacity-85 blur-[90px]" />
        <div className="absolute left-1/2 top-[60px] ml-5 h-[460px] w-[460px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div className="absolute left-1/2 top-[420px] -ml-[120px] h-[420px] w-[420px] rounded-full bg-sky opacity-80 blur-[100px]" />
        <div className="absolute left-1/2 top-[360px] ml-[260px] h-[300px] w-[300px] rounded-full bg-butter opacity-90 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-6 pt-6">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="grid h-[52px] w-[52px] place-items-center rounded-2xl bg-white/80 shadow-[0_6px_20px_rgba(120,90,70,0.08)]"
            aria-label="Steady home"
          >
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#F4C9B8] text-[13px] font-extrabold tracking-[-0.02em] text-[#5A3E33]">
              st
            </span>
          </Link>
          <div className="hidden md:block">
            <HomeNav />
          </div>
          <div className="flex gap-1.5 rounded-2xl bg-white/80 p-1.5 shadow-[0_6px_20px_rgba(120,90,70,0.08)]">
            {signedIn ? (
              <Link
                href="/app"
                className="rounded-[11px] bg-[#3A3530] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28241F] hover:text-white"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-[11px] bg-home-tint px-4 py-2.5 text-sm font-semibold hover:bg-peach"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-[11px] bg-[#3A3530] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28241F] hover:text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="flex flex-col items-center pt-[clamp(64px,11vw,120px)] text-center">
          <div className="flex items-center gap-2.5 rounded-full border border-home-line bg-white/70 py-[5px] pl-[5px] pr-3.5 text-[13px] text-[#5C554E]">
            <span className="rounded-full bg-[#3A3530] px-2.5 py-1 text-[11px] font-semibold text-white">New</span>
            A calmer way to build habits
          </div>

          <h1 className="balance mt-[26px] max-w-[12ch] text-[clamp(44px,7.4vw,88px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
            Build Habits That Actually Stick
          </h1>

          <p className="pretty mt-6 max-w-[540px] text-lg leading-[1.55] text-[#5C554E]">
            Stay consistent, track your daily actions, and turn small efforts into real progress. Steady helps you stay
            focused and build routines that last.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={signedIn ? "/app" : "/signup"}
              className="rounded-full bg-[#3A3530] px-[26px] py-[15px] text-[15px] font-semibold text-white shadow-[0_10px_28px_rgba(58,53,48,0.22)] hover:bg-[#28241F] hover:text-white"
            >
              Start Your Journey
            </Link>
            <Link
              href="/app/dashboard"
              className="flex items-center gap-2.5 rounded-full border border-home-line bg-white/75 py-[9px] pl-[9px] pr-[22px] text-[15px] font-semibold hover:bg-white"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-[10px]">▶</span>
              View Dashboard
            </Link>
          </div>

          <PhoneMock />
        </section>
      </div>

      <section id="how" className="relative border-t border-home-line bg-white px-6 py-[clamp(64px,9vw,110px)]">
        <div className="mx-auto max-w-[1180px]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A726A]">How it works</div>
          <h2 className="balance mt-3 max-w-[16ch] text-[clamp(32px,4.4vw,52px)] font-extrabold leading-[1.04] tracking-[-0.035em]">
            Three steps, repeated daily
          </h2>
          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-3xl p-7" style={{ background: PASTEL[i] }}>
                <div className="font-mono text-[13px] text-[#5C554E]">0{i + 1}</div>
                <h3 className="mt-9 mb-2.5 text-[22px] font-bold tracking-[-0.02em]">{s.title}</h3>
                <p className="pretty text-[15px] leading-[1.55] text-[#5C554E]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="relative bg-home-bg px-6 py-[clamp(64px,9vw,110px)]">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7A726A]">Features</div>
              <h2 className="balance mt-3 max-w-[16ch] text-[clamp(32px,4.4vw,52px)] font-extrabold leading-[1.04] tracking-[-0.035em]">
                Everything a routine needs
              </h2>
            </div>
            <Link
              href="/app"
              className="rounded-full border border-home-line bg-white px-5 py-3 text-sm font-semibold hover:bg-home-tint"
            >
              Open the app
            </Link>
          </div>
          <div className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="flex flex-col gap-3.5 rounded-[22px] border border-home-line bg-white p-6">
                <span
                  className="self-start rounded-full px-[11px] py-[5px] text-[11px] font-semibold text-[#3A3530]"
                  style={{ background: PASTEL[i % 4] }}
                >
                  {f.tag}
                </span>
                <h3 className="text-[19px] font-bold tracking-[-0.015em]">{f.title}</h3>
                <p className="pretty text-sm leading-[1.55] text-[#5C554E]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="relative border-t border-home-line bg-white px-6 py-[clamp(64px,9vw,110px)]">
        <div className="mx-auto max-w-[1180px]">
          <div className="mt-0 flex flex-col items-center gap-[18px] rounded-[28px] bg-home-tint px-6 py-12 text-center">
            <h3 className="text-[clamp(26px,3.4vw,38px)] font-extrabold tracking-[-0.03em]">Start with one habit today</h3>
            <Link
              href={signedIn ? "/app" : "/signup"}
              className="rounded-full bg-[#3A3530] px-[26px] py-[15px] text-[15px] font-semibold text-white hover:bg-[#28241F] hover:text-white"
            >
              Start Your Journey
            </Link>
          </div>
        </div>
      </section>

      <div className="relative overflow-hidden border-t border-home-line bg-home-tint px-6 pt-10 pb-14">
        <div className="mx-auto max-w-[1400px] select-none text-center text-[clamp(56px,12vw,190px)] font-extrabold leading-[0.9] tracking-[-0.05em] text-[#EAD7CD]">
          Build Habits That Actually Stick
        </div>
      </div>

      <footer className="relative border-t border-home-line bg-white px-6 pt-14 pb-7">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-wrap justify-between gap-10">
            <div className="flex max-w-[340px] flex-[1_1_260px] flex-col gap-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#F4C9B8] text-[13px] font-extrabold text-[#5A3E33]">st</span>
                <span className="text-base font-bold tracking-[0.02em]">STEADY</span>
              </div>
              <p className="text-sm leading-[1.55] text-[#5C554E]">
                A calmer way to build habits. Short blocks, honest streaks, and a plan you can see.
              </p>
              <div className="mt-1 flex gap-2">
                <a href="#" className="rounded-[11px] bg-home-tint px-3.5 py-[9px] text-xs font-semibold hover:bg-peach">App Store</a>
                <a href="#" className="rounded-[11px] bg-home-tint px-3.5 py-[9px] text-xs font-semibold hover:bg-mint">Google Play</a>
              </div>
            </div>
            <div className="grid flex-[2_1_420px] grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-7">
              {FOOTER_COLS.map((c) => (
                <div key={c.title} className="flex flex-col gap-2.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7A726A]">{c.title}</div>
                  {c.links.map(([label, href]) => (
                    <Link key={label} href={href} className="text-sm">
                      {label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <Newsletter />

          <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-home-line pt-5 text-xs text-[#6A625A]">
            <span>© 2026 Steady</span>
            <div className="flex gap-[18px]">
              <a href="#" className="text-[#6A625A] hover:text-[#3A3530]">Privacy</a>
              <a href="#" className="text-[#6A625A] hover:text-[#3A3530]">Terms</a>
              <a href="#" className="text-[#6A625A] hover:text-[#3A3530]">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
