import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Link2, Key, MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { assignments } from "@/lib/mock-data";

export const Route = createFileRoute("/assignments")({
  head: () => ({ meta: [{ title: "Assignments · ExamForge" }] }),
  component: AssignmentsPage,
});

function tone(s: string) {
  switch (s) {
    case "Active": return "bg-success/15 text-success border-success/30";
    case "Pending": return "bg-brand/20 text-foreground border-brand/40";
    case "Expired": return "bg-destructive/10 text-destructive border-destructive/30";
    case "Completed": return "bg-muted text-muted-foreground border-border";
    default: return "";
  }
}

function AssignmentsPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Assignments" }, { label: "Active" }]}
      title="Assignments"
      description="Distribute published tests to students or cohorts. Generate tokens or shareable public links."
      actions={
        <>
          <Button variant="outline" size="sm"><Key className="h-4 w-4 mr-1.5"/> Generate token</Button>
          <Button variant="outline" size="sm"><Link2 className="h-4 w-4 mr-1.5"/> Public link</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="h-4 w-4 mr-1.5"/> Assign test</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Active", value: 14, tone: "text-success" },
          { label: "Pending", value: 5, tone: "text-foreground" },
          { label: "Completed", value: 132, tone: "text-muted-foreground" },
          { label: "Expired", value: 7, tone: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={"text-2xl font-semibold tracking-tight mt-1 " + s.tone}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search assignments…" className="pl-8 h-9"/>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Test</th>
                <th className="text-left px-4 py-2.5 font-medium">Assignee</th>
                <th className="text-left px-4 py-2.5 font-medium">Assigned by</th>
                <th className="text-left px-4 py-2.5 font-medium">Due date</th>
                <th className="text-left px-4 py-2.5 font-medium">Attempts</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.test}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{a.id}</div>
                  </td>
                  <td className="px-4 py-3">{a.assignee}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.assignedBy}</td>
                  <td className="px-4 py-3">{a.due}</td>
                  <td className="px-4 py-3">{a.attempts}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={tone(a.status)}>{a.status}</Badge></td>
                  <td className="px-2"><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5"/></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-3 text-xs text-muted-foreground text-center">
        Need to take an exam? <Link to="/exam" className="font-medium underline">Open the exam-taking demo →</Link>
      </div>
    </AppLayout>
  );
}
