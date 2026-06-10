import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle2, XCircle, Download, MessageSquare } from "lucide-react";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Results · ExamForge" }] }),
  component: ResultsPage,
});

const sectionPerf = [
  { section: "Cell Bio", score: 88, max: 100 },
  { section: "Genetics", score: 72, max: 100 },
  { section: "Ecology", score: 91, max: 100 },
  { section: "Evolution", score: 65, max: 100 },
];

const radar = sectionPerf.map((s) => ({ subject: s.section, A: s.score }));

const feedback = [
  { q: "Q7 · Mitochondrial ATP synthesis", reviewer: "John Park", score: "8 / 10", note: "Strong on gradient mechanism — explicitly name chemiosmosis next time." },
  { q: "Q12 · Mendelian inheritance", reviewer: "Auto", score: "5 / 5", note: "Perfect — Punnett square correctly applied." },
  { q: "Q15 · Trophic levels essay", reviewer: "John Park", score: "12 / 15", note: "Good structure; expand on energy loss between levels." },
];

function ResultsPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Results" }, { label: "Exam Results" }]}
      title="Biology Midterm – Fall 2026"
      description="Liu Wei · liu.w@abc.edu · Attempt #18213 · submitted Jun 9, 2026"
      actions={<Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5"/> Download report</Button>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-ink to-ink/90 text-brand">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand/70">
            <Trophy className="h-4 w-4"/> Final result
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-6xl font-bold tracking-tighter">79</div>
            <div className="text-2xl text-brand/60">/ 100</div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge className="bg-brand text-brand-foreground border-0 font-semibold"><CheckCircle2 className="h-3.5 w-3.5 mr-1"/>Passed</Badge>
            <span className="text-sm text-brand/70">Above 60% passing threshold</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-brand/20">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-brand/60">Auto-scored</div>
              <div className="text-xl font-semibold mt-1">54 / 70</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-brand/60">Manually graded</div>
              <div className="text-xl font-semibold mt-1">25 / 30</div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold mb-1">Performance by section</h3>
          <p className="text-xs text-muted-foreground mb-3">Strengths and areas for improvement</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="var(--color-border)"/>
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }}/>
                <PolarRadiusAxis tick={{ fontSize: 10 }}/>
                <Radar dataKey="A" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.4}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <h3 className="font-semibold mb-3">Section breakdown</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectionPerf} margin={{ top: 5, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="section" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false}/>
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}/>
              <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="var(--color-chart-1)"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5 mt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-brand"/> Reviewer feedback</h3>
        <ul className="divide-y">
          {feedback.map((f, i) => (
            <li key={i} className="py-3.5 flex items-start gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">{f.q}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Reviewed by {f.reviewer}</div>
                <p className="text-sm mt-2 text-foreground/80">{f.note}</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold">{f.score}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </AppLayout>
  );
}
