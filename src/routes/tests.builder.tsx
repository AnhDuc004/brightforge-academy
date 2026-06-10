import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical, Plus, Search, ChevronDown, Trash2, Save, Send,
  FileText, Lock, Camera,
} from "lucide-react";
import { questions } from "@/lib/mock-data";

export const Route = createFileRoute("/tests/builder")({
  head: () => ({ meta: [{ title: "Test builder · ExamForge" }] }),
  component: TestBuilder,
});

function TestBuilder() {
  const sections = [
    { id: 1, title: "Section A — Cell Biology", questions: questions.slice(0, 3).map((q) => ({ ...q, score: 5 })) },
    { id: 2, title: "Section B — Mathematics", questions: questions.slice(4, 6).map((q) => ({ ...q, score: 10 })) },
  ];

  return (
    <AppLayout
      breadcrumbs={[{ label: "Tests", to: "/tests" }, { label: "Builder" }]}
      title="Biology Midterm – Fall 2026"
      description="Drag questions from the bank into sections. Configure scores, then publish a snapshot."
      actions={
        <>
          <Button variant="outline" size="sm"><Save className="h-4 w-4 mr-1.5"/> Save draft</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Send className="h-4 w-4 mr-1.5"/> Publish</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Question bank */}
        <Card className="lg:col-span-2 flex flex-col h-[calc(100vh-220px)] overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-brand"/> Question bank</h3>
              <Badge variant="secondary" className="font-mono text-[11px]">1,284</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <Input placeholder="Search bank…" className="pl-8 h-9"/>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {["All", "Biology", "Math", "CS", "History"].map((t, i) => (
                <Badge key={t} variant={i === 0 ? "default" : "outline"} className={i === 0 ? "bg-ink text-brand" : "cursor-pointer hover:bg-muted"}>{t}</Badge>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {questions.map((q) => (
              <div key={q.id} className="group flex items-start gap-2 p-2.5 rounded-md border bg-background hover:border-brand/40 hover:bg-brand/5 cursor-grab transition">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-2">{q.text}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="text-[10px] font-normal">{q.type}</Badge>
                    <span className="text-[11px] text-muted-foreground">{q.difficulty}</span>
                    <span className="text-[11px] text-muted-foreground font-mono ml-auto">{q.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Test structure */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Total questions" value="5"/>
              <Stat label="Total score" value="35"/>
              <Stat label="Duration" value="90 min"/>
              <Stat label="Passing" value="60%"/>
            </div>
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-brand/10 border border-brand/30 text-xs">
              <Camera className="h-3.5 w-3.5 text-foreground"/>
              <span><strong>Snapshot mode.</strong> Publishing freezes a copy of each question. Future edits in the bank won't change this test.</span>
            </div>
          </Card>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {sections.map((s) => (
              <Card key={s.id} className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                  <ChevronDown className="h-4 w-4 text-muted-foreground"/>
                  <GripVertical className="h-4 w-4 text-muted-foreground"/>
                  <Input defaultValue={s.title} className="border-0 shadow-none focus-visible:ring-0 font-medium px-1 h-7 bg-transparent flex-1"/>
                  <Badge variant="secondary" className="font-mono text-[10px]">{s.questions.length} questions</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                </div>
                <ol className="divide-y">
                  {s.questions.map((q, idx) => (
                    <li key={q.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                      <GripVertical className="h-4 w-4 text-muted-foreground"/>
                      <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-1">{q.text}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <Lock className="h-3 w-3"/> Snapshot · {q.id} · {q.type}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">Score</span>
                        <Input defaultValue={q.score} className="h-7 w-14 text-center"/>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                    </li>
                  ))}
                </ol>
                <button className="w-full px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 border-t flex items-center justify-center gap-1.5">
                  <Plus className="h-3.5 w-3.5"/> Drop a question here
                </button>
              </Card>
            ))}
            <Button variant="outline" className="w-full border-dashed h-12"><Plus className="h-4 w-4 mr-1.5"/> Add section</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}
