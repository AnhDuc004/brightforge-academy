import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Send, MoreHorizontal, Clock, FileText, Users } from "lucide-react";
import { tests } from "@/lib/mock-data";

export const Route = createFileRoute("/tests")({
  head: () => ({ meta: [{ title: "Tests · ExamForge" }] }),
  component: TestsPage,
});

function TestsPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Test Builder" }, { label: "Tests" }]}
      title="Tests"
      description="Build, publish, and assign tests. Published tests snapshot their questions so edits later don't change what students see."
      actions={
        <>
          <Link to="/tests/builder"><Button variant="outline" size="sm"><Wrench className="h-4 w-4 mr-1.5"/> Open builder</Button></Link>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="h-4 w-4 mr-1.5"/> New test</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tests.map((t) => (
          <Card key={t.id} className="p-5 hover:border-brand/40 hover:shadow-sm transition group">
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className={t.status === "Published" ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>{t.status}</Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4"/></Button>
            </div>
            <Link to="/tests/$id" params={{ id: t.id }} className="block">
              <h3 className="font-semibold leading-tight group-hover:text-foreground">{t.title}</h3>
              <div className="text-[11px] text-muted-foreground font-mono mt-1">{t.id}</div>
            </Link>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/40 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3"/>Duration</div>
                <div className="text-sm font-semibold mt-0.5">{t.duration}m</div>
              </div>
              <div className="rounded-md bg-muted/40 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1"><FileText className="h-3 w-3"/>Questions</div>
                <div className="text-sm font-semibold mt-0.5">{t.questions}</div>
              </div>
              <div className="rounded-md bg-muted/40 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3"/>Assigned</div>
                <div className="text-sm font-semibold mt-0.5">{t.assignments}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Pass score · <span className="text-foreground font-medium">{t.passing}%</span></span>
              <span>{t.sections} sections</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/tests/$id" params={{ id: t.id }} className="flex-1"><Button variant="outline" size="sm" className="w-full">View details</Button></Link>
              {t.status !== "Published" && <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Send className="h-3.5 w-3.5 mr-1"/>Publish</Button>}
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
