import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description: string;
  eyebrow: string;
  children: ReactNode;
  footerPrompt: string;
  footerLinkTo: string;
  footerLinkLabel: string;
  footerLinkTone?: "brand" | "ghost";
};

const highlights = [
  {
    title: "Server-side validation",
    description: "Field errors from BE map straight back into the form.",
  },
  {
    title: "Token-based session",
    description: "Login and register persist a token and unlock the dashboard.",
  },
  {
    title: "Brand-consistent UI",
    description: "Black, gold, and sharp enterprise styling that matches the app.",
  },
];

export function AuthShell({
  title,
  description,
  eyebrow,
  children,
  footerPrompt,
  footerLinkTo,
  footerLinkLabel,
  footerLinkTone = "brand",
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,179,1,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_30%),linear-gradient(135deg,_#0b0b0b_0%,_#111111_35%,_#181818_100%)] text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <aside className="relative hidden overflow-hidden border-r border-white/10 bg-ink/95 px-10 py-12 text-brand lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,179,1,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(245,179,1,0.08),_transparent_30%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              ExamForge access
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-ink shadow-[0_12px_30px_rgba(245,179,1,0.28)]">
                <GraduationCap className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-brand">ExamForge</div>
                <div className="text-sm text-brand/70">Enterprise LMS</div>
              </div>
            </div>

            <div className="mt-12 max-w-xl">
              <Badge className="border-0 bg-brand text-ink shadow-sm">{eyebrow}</Badge>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-white/70">{description}</p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-ink">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                  <div className="mt-3 text-sm font-medium text-white">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 text-white/60">{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4 text-brand">
              <div className="text-[11px] uppercase tracking-[0.24em] text-brand/60">
                Validation ready
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">422-safe</div>
              <div className="mt-1 text-sm text-brand/70">
                Backend field errors are surfaced next to the exact input.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                Session flow
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <BadgeCheck className="h-4 w-4 text-brand" />
                Login, register, then dashboard
              </div>
              <div className="mt-1 text-sm text-white/60">
                Token is stored locally so the mock dashboard stays unlocked after auth.
              </div>
            </div>
          </div>
        </aside>

        <main className="relative flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,179,1,0.12),_transparent_32%)] lg:hidden" />
          <div className="relative z-10 w-full max-w-[560px]">
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-ink shadow-sm">
                  <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight text-white">ExamForge</div>
                  <div className="text-xs text-white/60">Enterprise LMS</div>
                </div>
              </div>
              <Badge className="border-0 bg-brand text-ink">{eyebrow}</Badge>
            </div>

            <Card className="overflow-hidden border-white/10 bg-card/95 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
              <div className="border-b border-border/60 bg-gradient-to-r from-brand/15 via-brand/5 to-transparent px-6 py-5">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  {eyebrow}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>

              <div className="px-6 py-6">{children}</div>
            </Card>

            <div className="mt-5 text-center text-sm text-white/60">
              {footerPrompt}{" "}
              <Link
                to={footerLinkTo as never}
                className={cn(
                  "font-medium transition",
                  footerLinkTone === "brand"
                    ? "text-brand hover:text-brand/80"
                    : "text-white hover:text-brand",
                )}
              >
                {footerLinkLabel} <ArrowRight className="inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
