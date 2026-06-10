import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ChevronLeft, ChevronRight, SkipForward, ShieldCheck, Star } from "lucide-react";

export const Route = createFileRoute("/grading")({
  head: () => ({ meta: [{ title: "Grading · ExamForge" }] }),
  component: GradingPage,
});

const queue = [
  { id: "AT-18213", student: "Liu Wei", test: "Biology Midterm", q: 12, status: "Pending", points: 10 },
  { id: "AT-18214", student: "Priya Nair", test: "World History – Unit 5", q: 4, status: "Pending", points: 15 },
  { id: "AT-18215", student: "John Park", test: "Biology Midterm", q: 12, status: "Reviewed", points: 10 },
  { id: "AT-18216", student: "Anna Lee", test: "Intro to Networking", q: 3, status: "Skipped", points: 8 },
];

function GradingPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Grading" }, { label: "Pending Reviews" }]}
      title="Review & grading workspace"
      description="Review short answers and essays. Auto-scored items appear pre-filled — adjust as needed."
      actions={
        <>
          <Button variant="outline" size="sm"><SkipForward className="h-4 w-4 mr-1.5"/> Skip</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><ShieldCheck className="h-4 w-4 mr-1.5"/> Finalize review</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <Card className="xl:col-span-1 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div className="text-sm font-semibold">Queue</div>
            <Badge variant="secondary">{queue.length}</Badge>
          </div>
          <ul className="divide-y max-h-[60vh] overflow-y-auto">
            {queue.map((a, i) => (
              <li key={a.id} className={"p-3 cursor-pointer hover:bg-muted/30 " + (i === 0 ? "bg-brand/10 border-l-2 border-brand" : "")}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{a.student}</span>
                  <Badge variant="outline" className={
                    a.status === "Pending" ? "bg-brand/15 border-brand/40" :
                    a.status === "Reviewed" ? "bg-success/15 text-success border-success/30" :
                    "bg-muted text-muted-foreground"
                  }>{a.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{a.test}</div>
                <div className="text-[11px] font-mono text-muted-foreground mt-1">{a.id} · Q{a.q}</div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="xl:col-span-3 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Question · 10 pts</div>
              <h3 className="font-semibold text-[15px] leading-relaxed">
                Explain the role of the mitochondrial inner membrane in ATP synthesis. Reference the electron transport chain and chemiosmosis.
              </h3>
              <div className="mt-4 text-xs text-muted-foreground">
                Reference answer:
              </div>
              <p className="text-sm mt-1.5 p-3 rounded-md bg-muted/40 border leading-relaxed">
                The inner membrane is folded into cristae, embedding the electron transport chain complexes and ATP synthase. Electrons cascade through complexes I–IV, pumping protons into the intermembrane space. The resulting proton gradient drives ATP synthase via chemiosmosis.
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Student answer</div>
                <Badge variant="outline" className="font-mono text-[10px]">Liu Wei · AT-18213</Badge>
              </div>
              <p className="text-sm mt-2 p-3 rounded-md bg-background border leading-relaxed">
                The inner membrane holds ETC complexes that pump H+ ions into the intermembrane space, creating a gradient. ATP synthase uses this gradient to make ATP. The cristae fold to increase the surface area.
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>342 characters</span>
                <span>·</span>
                <span>Submitted at 10:14:22</span>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-brand"/> Scoring panel</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Auto score (AI)</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input value="7.5" className="h-10 font-semibold text-base"/>
                  <span className="text-sm text-muted-foreground">/ 10</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Confidence 82% · matched key concepts: ETC, gradient, cristae</p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Manual override</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input defaultValue="8" className="h-10 font-semibold text-base"/>
                  <span className="text-sm text-muted-foreground">/ 10</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {[2, 4, 6, 8, 10].map((n) => <Button key={n} variant="outline" size="sm" className="h-7 px-2 text-xs">{n}</Button>)}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</label>
                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  <Button variant="outline" size="sm" className="bg-brand/15 border-brand/40">Pending</Button>
                  <Button variant="outline" size="sm" className="bg-success/15 border-success/30 text-success">Reviewed</Button>
                  <Button variant="outline" size="sm">Skipped</Button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Feedback for student</label>
              <Textarea className="mt-1.5" defaultValue="Good — you covered the proton gradient and ATP synthase. To get full marks, mention chemiosmosis explicitly and the role of oxygen as the final electron acceptor."/>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1"/>Previous answer</Button>
              <Button variant="outline" size="sm"><CheckCircle2 className="h-4 w-4 mr-1.5"/>Approve auto score</Button>
              <Button size="sm" className="ml-auto bg-ink text-brand hover:bg-ink/90">Save & next<ChevronRight className="h-4 w-4 ml-1"/></Button>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
