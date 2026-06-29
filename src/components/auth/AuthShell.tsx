import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap } from "lucide-react";

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

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M4 19V7a2 2 0 012-2h12a2 2 0 012 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 19a2 2 0 002 2h12a2 2 0 002-2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 10h6M9 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: "Ngân hàng đề thi",
    sub: "Hàng nghìn câu hỏi được phân loại theo chủ đề và độ khó.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7v5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: "Thi thử linh hoạt",
    sub: "Tự chọn thời gian, số câu và cấu trúc đề mỗi lượt ôn.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M3 12l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 5l-11 11-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Phân tích kết quả",
    sub: "Báo cáo chi tiết giúp học viên biết đúng chỗ cần cải thiện.",
  },
];

/* ─── Inline SVG illustration ─── */
function EducationIllustration() {
  return (
    <svg
      viewBox="0 0 260 220"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[260px]"
      aria-hidden="true"
    >
      <style>{`
        .book-pulse { animation: bookPulse 3.2s ease-in-out infinite; transform-origin: 130px 105px; }
        .page-flip { animation: pageFlip 2.4s ease-in-out infinite; transform-origin: 130px 80px; }
        .pencil-bob { animation: pencilBob 2.8s ease-in-out infinite; transform-origin: 185px 140px; }
        .star-spin { animation: starSpin 9s linear infinite; transform-origin: 44px 38px; }
        .star-spin2 { animation: starSpin 12s linear infinite reverse; transform-origin: 218px 52px; }
        .dot-float { animation: dotFloat 4s ease-in-out infinite; }
        .dot-float2 { animation: dotFloat 5s ease-in-out infinite 0.8s; }
        .dot-float3 { animation: dotFloat 3.5s ease-in-out infinite 1.4s; }
        .check-pop { animation: checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }

        @keyframes bookPulse {
          0%,100% { transform: scale(1) rotate(-1deg); }
          50% { transform: scale(1.03) rotate(-1deg); }
        }
        @keyframes pageFlip {
          0%,100% { transform: scaleX(1); }
          50% { transform: scaleX(0.82); }
        }
        @keyframes pencilBob {
          0%,100% { transform: rotate(0deg) translate(0,0); }
          50% { transform: rotate(-10deg) translate(-3px, 3px); }
        }
        @keyframes starSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dotFloat {
          0%,100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes checkPop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Floating decorative dots */}
      <circle className="dot-float" cx="22" cy="90" r="4" fill="#F5B301" opacity="0.5" />
      <circle className="dot-float2" cx="240" cy="160" r="3.5" fill="#F5B301" opacity="0.4" />
      <circle className="dot-float3" cx="200" cy="30" r="3" fill="#F5B301" opacity="0.45" />

      {/* Rotating stars */}
      <g className="star-spin">
        <path d="M44,26 l2.5,7.5 7.5,0 -6,4.5 2.5,7.5 -6.5,-4.5 -6.5,4.5 2.5,-7.5 -6,-4.5 7.5,0z"
          fill="#F5B301" opacity="0.75" />
      </g>
      <g className="star-spin2">
        <path d="M218,40 l2,6 6,0 -4.8,3.6 2,6 -5.2,-3.6 -5.2,3.6 2,-6 -4.8,-3.6 6,0z"
          fill="#F5B301" opacity="0.5" />
      </g>

      {/* Book body */}
      <g className="book-pulse">
        {/* Cover back */}
        <rect x="70" y="60" width="120" height="90" rx="7" fill="#1a1a1a" stroke="#F5B301" strokeWidth="0.8" opacity="0.6" />
        {/* Spine */}
        <rect x="126" y="60" width="8" height="90" fill="#0b0b0b" />

        {/* Right page (animated flip) */}
        <g className="page-flip">
          <rect x="134" y="64" width="52" height="82" rx="4" fill="#f7f3e8" />
          <line x1="142" y1="78" x2="178" y2="78" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="142" y1="88" x2="178" y2="88" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="142" y1="98" x2="168" y2="98" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="142" y1="108" x2="178" y2="108" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="142" y1="118" x2="160" y2="118" stroke="#ccc" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Left page */}
        <rect x="74" y="64" width="52" height="82" rx="4" fill="#f0ecd8" />
        <line x1="82" y1="78" x2="118" y2="78" stroke="#bbb" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="82" y1="88" x2="118" y2="88" stroke="#bbb" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="82" y1="98" x2="110" y2="98" stroke="#bbb" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="82" y1="108" x2="118" y2="108" stroke="#bbb" strokeWidth="1.2" strokeLinecap="round" />
        {/* Small gold bookmark */}
        <rect x="112" y="64" width="6" height="18" rx="1" fill="#F5B301" opacity="0.9" />
        <polygon points="112,82 118,82 115,87" fill="#F5B301" opacity="0.9" />
      </g>

      {/* Pencil */}
      <g className="pencil-bob">
        <rect x="176" y="108" width="11" height="60" rx="3" fill="#FAC775" transform="rotate(35,181,138)" />
        <polygon points="176,163 187,163 181.5,175" fill="#F09595" transform="rotate(35,181,138) translate(0,5)" />
        <rect x="176" y="104" width="12" height="9" rx="2" fill="#888" transform="rotate(35,181,138)" />
        <line x1="176" y1="109" x2="188" y2="109" stroke="#d4a017" strokeWidth="0.8" transform="rotate(35,181,138)" />
      </g>

      {/* Check badge */}
      <g className="check-pop" transform="translate(56,130)">
        <circle cx="0" cy="0" r="18" fill="#1D9E75" />
        <path d="M-7,0 L-2,5.5 L8,-6" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Floating formula chips */}
      <rect x="176" y="58" width="52" height="22" rx="11" fill="#F5B301" opacity="0.12" />
      <text x="202" y="74" textAnchor="middle" fontSize="10" fill="#F5B301" fontFamily="monospace" opacity="0.9">E = mc²</text>

      <rect x="22" y="150" width="52" height="22" rx="11" fill="#F5B301" opacity="0.12" />
      <text x="48" y="166" textAnchor="middle" fontSize="10" fill="#F5B301" fontFamily="monospace" opacity="0.9">∑ f(x)</text>
    </svg>
  );
}

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
    <div className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(245,179,1,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_30%),linear-gradient(135deg,_#0b0b0b_0%,_#111111_35%,_#181818_100%)] text-foreground">
      <div className="grid h-full min-h-0 lg:grid-cols-[1.08fr_0.92fr]">

        {/* ── Left panel ── */}
        <aside className="relative hidden min-h-0 overflow-hidden border-r border-white/10 bg-ink/95 px-10 py-8 text-brand lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,179,1,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(245,179,1,0.08),_transparent_30%)]" />

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-ink shadow-[0_12px_30px_rgba(245,179,1,0.28)]">
                <GraduationCap className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-brand">ExamForge</div>
                <div className="text-sm text-brand/60">Nền tảng luyện thi thông minh</div>
              </div>
            </div>

            {/* Illustration */}
            <div className="mt-6 flex justify-center">
              <EducationIllustration />
            </div>

            {/* Headline */}
            <div className="mt-4 max-w-sm">
              <h1 className="text-3xl font-semibold leading-snug tracking-tight text-white">
                Ôn thi hiệu quả,<br />
                <span className="text-brand">kết quả vượt trội.</span>
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Cùng hàng nghìn học viên và giảng viên đang sử dụng ExamForge để tạo đề thi, luyện tập và theo dõi tiến trình học tập mỗi ngày.
              </p>
            </div>

            {/* Feature list */}
            <div className="mt-5 grid gap-2.5">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-ink">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{f.label}</div>
                    <div className="mt-0.5 text-xs leading-5 text-white/55">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom stat strip */}
          <div className="relative z-10 mt-5 flex items-center gap-6 border-t border-white/10 pt-5">
              {[
              { num: "12k+", label: "Học viên" },
              { num: "800+", label: "Đề thi" },
              { num: "98%", label: "Hài lòng" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl font-semibold text-brand">{s.num}</div>
                <div className="text-xs text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Right panel (form) ── */}
        <main className="relative flex min-h-0 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 lg:overflow-hidden lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,179,1,0.12),_transparent_32%)] lg:hidden" />
          <div className="relative z-10 w-full max-w-[560px]">

            {/* Mobile logo */}
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-ink shadow-sm">
                  <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight text-white">ExamForge</div>
                  <div className="text-xs text-white/60">Nền tảng luyện thi</div>
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
