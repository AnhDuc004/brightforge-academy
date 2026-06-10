import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileQuestion, CheckCircle2, FileStack, ClipboardList, CheckCheck, Trophy,
  ArrowUpRight, TrendingUp, Activity, Plus,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { stats, difficultyData, assignmentsTrend, passFailData, activities, auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · ExamForge" }] }),
  component: Dashboard,
});

const statCards = [
  { label: "Total Questions", value: stats.totalQuestions, icon: FileQuestion, trend: "+12.4%", tone: "neutral" },
  { label: "Published Questions", value: stats.publishedQuestions, icon: CheckCircle2, trend: "+8.1%", tone: "good" },
  { label: "Total Tests", value: stats.totalTests, icon: FileStack, trend: "+3", tone: "neutral" },
  { label: "Active Assignments", value: stats.activeAssignments, icon: ClipboardList, trend: "+6", tone: "good" },
  { label: "Pending Reviews", value: stats.pendingReviews, icon: CheckCheck, trend: "-12", tone: "warn" },
  { label: "Completed Attempts", value: stats.completedAttempts, icon: Trophy, trend: "+22.3%", tone: "good" },
];

function Dashboard() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
      title="Welcome back, Ayesha"
      description="Here's what's happening across ABC University today — June 10, 2026."
      actions={
        <>
          <Button variant="outline" size="sm">Export report</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="h-4 w-4 mr-1.5"/> New test</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 border-border/70 hover:border-brand/40 hover:shadow-sm transition">
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
                <s.icon className="h-4.5 w-4.5 text-foreground/80" />
              </div>
              <span className={
                "text-[11px] font-medium px-1.5 py-0.5 rounded " +
                (s.tone === "good" ? "bg-success/15 text-success" :
                 s.tone === "warn" ? "bg-brand/15 text-foreground" : "bg-muted text-muted-foreground")
              }>{s.trend}</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-semibold tracking-tight">{s.value.toLocaleString()}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Assignments over time</h3>
              <p className="text-xs text-muted-foreground">Assignments created vs attempts submitted</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-success font-medium">
              <TrendingUp className="h-3.5 w-3.5" /> +18.2% vs last period
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assignmentsTrend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="attempts" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="assignments" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Pass / Fail ratio</h3>
          <p className="text-xs text-muted-foreground">Across all completed attempts</p>
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={passFailData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {passFailData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {passFailData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.fill }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5">
          <h3 className="font-semibold">Questions by difficulty</h3>
          <p className="text-xs text-muted-foreground mb-2">Distribution across the bank</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {difficultyData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-brand"/> Recent activity</h3>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </div>
            <Link to="/audit" className="text-xs font-medium hover:underline flex items-center gap-1">View all <ArrowUpRight className="h-3.5 w-3.5"/></Link>
          </div>
          <ul className="divide-y">
            {activities.map((a) => (
              <li key={a.id} className="py-2.5 flex items-center gap-3 text-sm">
                <Badge variant="outline" className="font-normal min-w-[120px] justify-center">{a.type}</Badge>
                <span className="font-medium">{a.actor}</span>
                <span className="text-muted-foreground truncate">— {a.target}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <h3 className="font-semibold mb-1">Audit log timeline</h3>
        <p className="text-xs text-muted-foreground mb-4">Tenant-wide enterprise event stream</p>
        <ol className="relative border-l border-border ml-2 space-y-5">
          {auditLogs.slice(0, 5).map((l) => (
            <li key={l.id} className="ml-5">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-brand ring-4 ring-card" />
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{l.actor}</span>
                <Badge variant="secondary" className="font-mono text-[10px]">{l.action}</Badge>
                <span className="text-muted-foreground">on</span>
                <span className="font-medium">{l.resource}</span>
                <span className="ml-auto text-xs text-muted-foreground">{l.time}</span>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </AppLayout>
  );
}
