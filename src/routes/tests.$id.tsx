import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, FileText, Target, Calendar, Lock, Send, Pencil } from "lucide-react";
import { tests } from "@/lib/mock-data";

export const Route = createFileRoute("/tests/$id")({
  head: () => ({ meta: [{ title: "Test details · ExamForge" }] }),
  component: TestDetails,
});

function TestDetails() {
  const { id } = Route.useParams();
  const test = tests.find((t) => t.id === id) ?? tests[0];

  return (
    <AppLayout
      breadcrumbs={[{ label: "Tests", to: "/tests" }, { label: test.id }]}
      title={test.title}
      description="Published exam · snapshot frozen on 2026-06-02 · revisions to source questions won't affect this test."
      actions={
        <>
          <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1.5"/> Edit</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Send className="h-4 w-4 mr-1.5"/> Assign</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPI icon={Clock} label="Duration" value={`${test.duration} min`}/>
        <KPI icon={Target} label="Passing score" value={`${test.passing}%`}/>
        <KPI icon={FileText} label="Questions" value={String(test.questions)}/>
        <KPI icon={Users} label="Assignments" value={String(test.assignments)}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold mb-1">Sections</h3>
          <p className="text-xs text-muted-foreground mb-4">3 sections · 32 questions · 100 points total</p>
          <div className="space-y-3">
            {[
              { title: "Section A — Cell Biology", q: 12, score: 36 },
              { title: "Section B — Genetics", q: 10, score: 32 },
              { title: "Section C — Ecology & Evolution", q: 10, score: 32 },
            ].map((s) => (
              <div key={s.title} className="border rounded-lg p-4 flex items-center justify-between hover:border-brand/40 transition">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.q} questions · {s.score} points</div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]"><Lock className="h-3 w-3 mr-1"/>Snapshot</Badge>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Publishing</h3>
            <dl className="space-y-2.5 text-sm">
              <Row label="Status" value={<Badge className="bg-success/20 text-success border-success/30" variant="outline">Published</Badge>}/>
              <Row label="Published by" value="Ayesha Khan"/>
              <Row label="Published on" value="Jun 2, 2026"/>
              <Row label="Version" value={<span className="font-mono text-xs">v1.2.0</span>}/>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Schedule</h3>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground"/>
              <span>Window: Jun 12 – Jun 20, 2026</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-2">
              <Users className="h-4 w-4 text-muted-foreground"/>
              <span>4 assignments active</span>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function KPI({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5"/> {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight mt-1.5">{value}</div>
    </Card>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
