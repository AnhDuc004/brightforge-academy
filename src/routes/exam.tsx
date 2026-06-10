import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Clock, Save, ChevronLeft, ChevronRight, ShieldAlert, CheckCircle2,
  GraduationCap, Maximize2, Flag,
} from "lucide-react";

export const Route = createFileRoute("/exam")({
  head: () => ({ meta: [{ title: "Take exam · ExamForge" }] }),
  component: ExamPage,
});

const palette = Array.from({ length: 20 }, (_, i) => {
  const r = i % 4;
  return {
    n: i + 1,
    state: r === 0 ? "current" : r === 1 ? "answered" : r === 2 ? "flagged" : i > 12 ? "unseen" : "skipped",
  };
});

function ExamPage() {
  const [current, setCurrent] = useState(7);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top exam header */}
      <header className="h-14 border-b bg-card flex items-center px-5 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-brand text-brand-foreground grid place-items-center"><GraduationCap className="h-4 w-4" strokeWidth={2.5}/></div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Biology Midterm – Fall 2026</div>
            <div className="text-[11px] text-muted-foreground">Attempt #18213 · liu.w@abc.edu</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Progress</span>
            <Progress value={(current / 20) * 100} className="w-40 h-2"/>
            <span className="font-medium">{current}/20</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-ink text-brand font-mono text-sm tabular-nums shadow-sm">
            <Clock className="h-4 w-4"/> 00:47:21
          </div>

          <Button variant="outline" size="sm" className="hidden md:inline-flex"><Maximize2 className="h-3.5 w-3.5 mr-1.5"/>Fullscreen</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Submit exam</Button>
        </div>
      </header>

      {/* Lock warning */}
      <div className="bg-brand/15 border-b border-brand/30 px-5 py-2 flex items-center gap-2 text-xs">
        <ShieldAlert className="h-3.5 w-3.5 text-foreground"/>
        <span><strong>Secure mode active.</strong> Switching tabs, copying, or right-clicking will be logged. Auto-submit on 3 violations.</span>
        <span className="ml-auto text-muted-foreground">Auto-saved 8 sec ago · <CheckCircle2 className="inline h-3 w-3 text-success"/></span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: question navigator */}
        <aside className="w-64 shrink-0 border-r bg-card overflow-y-auto p-4 hidden md:block">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Question navigator</h3>
          <div className="grid grid-cols-5 gap-1.5">
            {palette.map((p) => (
              <button
                key={p.n}
                onClick={() => setCurrent(p.n)}
                className={
                  "h-9 rounded-md text-xs font-medium border transition " +
                  (p.n === current ? "bg-ink text-brand border-ink" :
                   p.state === "answered" ? "bg-success/15 border-success/40 text-success" :
                   p.state === "flagged" ? "bg-brand/20 border-brand/40 text-foreground" :
                   p.state === "skipped" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                   "bg-background border-border text-muted-foreground hover:bg-muted")
                }
              >{p.n}</button>
            ))}
          </div>
          <div className="mt-5 space-y-1.5 text-xs">
            <Legend className="bg-ink" label="Current"/>
            <Legend className="bg-success" label="Answered"/>
            <Legend className="bg-brand" label="Flagged"/>
            <Legend className="bg-destructive" label="Skipped"/>
            <Legend className="bg-border" label="Unseen"/>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 md:p-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-muted-foreground">Section A — Cell Biology</div>
                <h2 className="text-lg font-semibold mt-1">Question {current} <span className="text-muted-foreground font-normal">of 20</span></h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-brand/15 border-brand/40">5 points</Badge>
                <Button variant="outline" size="sm"><Flag className="h-3.5 w-3.5 mr-1.5"/>Flag</Button>
              </div>
            </div>

            <Card className="p-6">
              <p className="text-[15px] leading-relaxed mb-5">
                Which organelle is primarily responsible for ATP synthesis in eukaryotic cells, and what feature of its structure enables this function?
              </p>

              <RadioGroup defaultValue="a">
                {[
                  { v: "a", l: "Mitochondria — folded inner membrane (cristae) increases surface area for ATP synthase." },
                  { v: "b", l: "Chloroplasts — thylakoid stacks (grana) host the electron transport chain." },
                  { v: "c", l: "Endoplasmic reticulum — its rough surface hosts ribosomes that drive synthesis." },
                  { v: "d", l: "Golgi apparatus — its stacked cisternae package energy carriers." },
                ].map((o, i) => (
                  <label key={o.v} className="flex items-start gap-3 p-3.5 rounded-lg border bg-card hover:border-brand/40 hover:bg-brand/5 cursor-pointer transition">
                    <RadioGroupItem value={o.v} className="mt-1"/>
                    <span className="h-6 w-6 grid place-items-center rounded bg-muted text-[11px] font-mono shrink-0">{String.fromCharCode(65 + i)}</span>
                    <span className="text-sm leading-relaxed">{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </Card>

            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <Save className="h-3.5 w-3.5"/> Answers save automatically as you go.
            </div>
          </div>
        </main>
      </div>

      {/* Bottom nav */}
      <footer className="border-t bg-card px-5 py-3 flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => setCurrent(Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4 mr-1"/>Previous</Button>
        <Button variant="outline" size="sm"><Save className="h-4 w-4 mr-1"/>Save answer</Button>
        <Link to="/assignments" className="text-xs text-muted-foreground ml-2 hover:underline">Exit to app</Link>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm"><Flag className="h-4 w-4 mr-1"/>Flag & next</Button>
          <Button size="sm" className="bg-ink text-brand hover:bg-ink/90" onClick={() => setCurrent(Math.min(20, current + 1))}>Next<ChevronRight className="h-4 w-4 ml-1"/></Button>
        </div>
      </footer>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={"h-3 w-3 rounded-sm " + className}/> {label}
    </div>
  );
}
