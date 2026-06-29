import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileQuestion, Wrench, FileStack,
  Layers, Send, ClipboardList, PlayCircle,
  CheckCheck, Trophy, Users, ShieldCheck,
  Key, ScrollText, ChevronRight, GraduationCap, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessSystemAdmin, hasPermission, type AuthContext } from "@/lib/auth";
import { useAuthContextQuery } from "@/lib/auth-context";

type Item = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string | string[];
  studentFallback?: boolean;
  studentHidden?: boolean;
  systemAdminOnly?: boolean;
};
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  { title: "System Administration", items: [
    { label: "Tenant Management", to: "/system", icon: Building2, permission: "tenant:manage", systemAdminOnly: true },
  ]},
  { title: "Overview", items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard, studentHidden: true }] },
  { title: "Question Bank", items: [
    { label: "Questions", to: "/questions", icon: FileQuestion, permission: "questions:view" },
  ]},
  { title: "Test Builder", items: [
    { label: "Tests", to: "/tests", icon: FileStack, permission: "tests:view" },
    { label: "Builder", to: "/tests/builder", icon: Layers, permission: "tests:update-sections" },
    { label: "Published Tests", to: "/tests", icon: Send, permission: "tests:publish" },
  ]},
  { title: "Assignments", items: [
    { label: "Assignments", to: "/assignments", icon: ClipboardList, permission: ["assignments:create", "assignments:view"], studentFallback: true },
  ]},
  { title: "Attempts", items: [
    { label: "Take exam", to: "/exam", icon: PlayCircle, permission: "attempts:start", studentFallback: true, studentHidden: true },
  ]},
  { title: "Grading", items: [
    { label: "Pending Reviews", to: "/grading", icon: CheckCheck, permission: "grading:view-pending" },
  ]},
  { title: "Results", items: [
    { label: "Exam Results", to: "/results", icon: Trophy, permission: ["reports:view", "grading:view-pending"] },
  ]},
  { title: "Administration", items: [
    { label: "Users", to: "/users", icon: Users, permission: "users:view" },
    { label: "Roles", to: "/users", icon: ShieldCheck, permission: "roles:view" },
    { label: "Permissions", to: "/users", icon: Key, permission: "tenant:settings" },
    { label: "Audit Logs", to: "/audit", icon: ScrollText, permission: "audit:view" },
  ]},
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const authQuery = useAuthContextQuery();
  const context = authQuery.data;
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeItem(context, item)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-brand text-brand-foreground grid place-items-center shadow-sm">
          <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">ExamForge</div>
          <div className="text-[11px] text-sidebar-foreground/60">Hệ thống LMS doanh nghiệp</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visibleGroups.map((g) => (
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
                      to={item.to as never}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
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
            <div className="font-medium">v4.2.0 · Doanh nghiệp</div>
            <div className="text-sidebar-foreground/55">Mọi hệ thống đang hoạt động</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function canSeeItem(context: AuthContext | undefined, item: Item) {
  if (item.systemAdminOnly && !canAccessSystemAdmin(context)) return false;
  if (item.studentHidden && isStudentContext(context)) return false;
  if (item.permission && hasPermission(context, item.permission)) return true;
  if (!item.permission) return true;
  return Boolean(item.studentFallback && !hasAnyGrantedPermission(context));
}

function isStudentContext(context: AuthContext | undefined) {
  return Boolean(context?.roles.some((role) => role.name.toLowerCase().includes("student")));
}

function hasAnyGrantedPermission(context: AuthContext | undefined) {
  if (!context) return false;
  return context.permissions.length > 0 || context.roles.some((role) => role.name.toLowerCase().includes("admin"));
}
