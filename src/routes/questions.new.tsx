import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, GripVertical, X, ArrowLeft, Save, Send } from "lucide-react";

export const Route = createFileRoute("/questions/new")({
  head: () => ({ meta: [{ title: "Create question · ExamForge" }] }),
  component: NewQuestion,
});

function NewQuestion() {
  const options = [
    { id: 1, text: "Mitochondria", correct: true },
    { id: 2, text: "Nucleus", correct: false },
    { id: 3, text: "Ribosome", correct: false },
    { id: 4, text: "Endoplasmic Reticulum", correct: false },
  ];

  return (
    <AppLayout
      breadcrumbs={[{ label: "Questions", to: "/questions" }, { label: "New" }]}
      title="Create question"
      description="Compose a new question with options, scoring, and metadata. Save as draft or publish to the bank."
      actions={
        <>
          <Link to="/questions"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5"/> Cancel</Button></Link>
          <Button variant="outline" size="sm"><Save className="h-4 w-4 mr-1.5"/> Save draft</Button>
          <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Send className="h-4 w-4 mr-1.5"/> Publish</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Question content</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stem</Label>
                <Textarea className="mt-1.5 min-h-[110px]" defaultValue="What is the powerhouse of the cell?" />
                <p className="text-xs text-muted-foreground mt-1.5">Supports markdown · 0 / 2000 chars</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</Label>
                  <Select defaultValue="sc"><SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sc">Single Choice</SelectItem>
                      <SelectItem value="mc">Multiple Choice</SelectItem>
                      <SelectItem value="sa">Short Answer</SelectItem>
                      <SelectItem value="es">Essay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Difficulty</Label>
                  <Select defaultValue="easy"><SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</Label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 p-2 border rounded-md bg-background">
                  {["Biology", "Cells", "Anatomy"].map((t) => (
                    <Badge key={t} variant="secondary" className="font-normal pl-2 pr-1 gap-1">
                      {t}<button className="hover:bg-foreground/10 rounded p-0.5"><X className="h-3 w-3"/></button>
                    </Badge>
                  ))}
                  <Input placeholder="Add a tag…" className="border-0 shadow-none h-7 flex-1 min-w-[120px] focus-visible:ring-0 px-1 bg-transparent"/>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Answer options</h3>
              <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1"/> Add option</Button>
            </div>
            <ul className="space-y-2">
              {options.map((o, i) => (
                <li key={o.id} className="group flex items-center gap-2 p-2.5 border rounded-lg bg-background hover:border-brand/40 transition">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab"/>
                  <span className="h-6 w-6 grid place-items-center rounded bg-muted text-[11px] font-mono">{String.fromCharCode(65 + i)}</span>
                  <Input defaultValue={o.text} className="border-0 shadow-none focus-visible:ring-0 px-1"/>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Checkbox defaultChecked={o.correct}/> Correct
                    </label>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Scoring & feedback</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Max score</Label>
                <Input type="number" defaultValue={5} className="mt-1.5"/>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Negative marking</Label>
                <Input type="number" defaultValue={0} className="mt-1.5"/>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Time limit (sec)</Label>
                <Input type="number" defaultValue={60} className="mt-1.5"/>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Explanation (shown after review)</Label>
              <Textarea className="mt-1.5" placeholder="Optional explanation for the student…"/>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Live preview</h3>
              <Badge variant="outline" className="bg-brand/15 border-brand/40">Draft</Badge>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground mb-2">Question 1 of 1 · 5 points</div>
              <p className="text-sm font-medium mb-3">What is the powerhouse of the cell?</p>
              <RadioGroup defaultValue="1">
                {options.map((o, i) => (
                  <label key={o.id} className="flex items-start gap-2.5 p-2.5 rounded-md border bg-card hover:border-brand/40 cursor-pointer transition">
                    <RadioGroupItem value={String(o.id)} id={"opt"+o.id} className="mt-0.5"/>
                    <span className="h-5 w-5 grid place-items-center rounded bg-muted text-[10px] font-mono shrink-0">{String.fromCharCode(65 + i)}</span>
                    <span className="text-sm">{o.text}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Snapshot: published tests freeze a copy of this question. Edits here won't affect already published tests.
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
