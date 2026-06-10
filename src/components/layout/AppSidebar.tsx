import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileQuestion, FolderTree, Tag, Wrench, FileStack,
  Layers, Send, ClipboardList, CalendarClock, PlayCircle, Inbox,
  CheckCheck, ListChecks, Trophy, BarChart3, Users, ShieldCheck,
  Key, Settings, ScrollText, ChevronRight, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  { title: "Overview", items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }] },
  { title: "Question Bank", items: [
    { label: "Questions", to: "/questions", icon: FileQuestion },
    { label: "Categories", to: "/categories", icon: FolderTree },
    { label: "Tags", to: "/tags", icon: Tag },
  ]},
  { title: "Test Builder", items: [
    { label: "Tests", to: "/tests", icon: FileStack },
    { label: "Sections", to: "/sections", icon: Layers },
    { label: "Published Tests", to: "/tests/published", icon: Send },
  ]},
  { title: "Assignments", items: [
    { label: "Active Assignments", to: "/assignments", icon: ClipboardList },
    { label: "Scheduled", to: "/assignments/scheduled", icon: CalendarClock },
  ]},
  { title: "Attempts", items: [
    { label: "Ongoing", to: "/attempts/ongoing", icon: PlayCircle },
    { label: "Submitted", to: "/attempts/submitted", icon: Inbox },
  ]},
  { title: "Grading", items: [
    { label: "Pending Reviews", to: "/grading", icon: CheckCheck },
    { label: "Reviewed Answers", to: "/grading/reviewed", icon: ListChecks },
  ]},
  { title: "Results", items: [
    { label: "Exam Results", to: "/results", icon: Trophy },
    { label: "Statistics", to: "/results/stats", icon: BarChart3 },
  ]},
  { title: "Administration", items: [
    { label: "Users", to: "/users", icon: Users },
    { label: "Roles", to: "/users?tab=roles", icon: ShieldCheck },
    { label: "Permissions", to: "/users?tab=permissions", icon: Key },
    { label: "Tenant Settings", to: "/settings", icon: Settings },
    { label: "Audit Logs", to: "/audit", icon: ScrollText },
  ]},
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-brand text-brand-foreground grid place-items-center shadow-sm">
          <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">ExamForge</div>
          <div className="text-[11px] text-sidebar-foreground/60">Enterprise LMS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to.split("?")[0]));
                return (
                  <li key={item.label}>
                    <Link
                      to={item.to as string}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                      activeOptions={{ exact: false }}
                      // @ts-expect-error - some links point to placeholder routes
                      from="/"
                    >
                      <item.icon className={cn("h-4 w-4", active && "text-brand")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="h-3.5 w-3.5 text-brand" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-2.5 py-2">
          <Wrench className="h-4 w-4 text-brand" />
          <div className="text-[11px] leading-tight">
            <div className="font-medium">v4.2.0 · Enterprise</div>
            <div className="text-sidebar-foreground/55">All systems operational</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
