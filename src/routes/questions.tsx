import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Filter, MoreHorizontal, Archive, Pencil, Send, Eye } from "lucide-react";
import { questions } from "@/lib/mock-data";

export const Route = createFileRoute("/questions")({
  head: () => ({ meta: [{ title: "Question Bank · ExamForge" }] }),
  component: QuestionsPage,
});

function statusTone(s: string) {
  if (s === "Published") return "bg-success/15 text-success border-success/30";
  if (s === "Draft") return "bg-muted text-muted-foreground border-border";
  return "bg-foreground/10 text-muted-foreground border-border";
}
function diffTone(d: string) {
  if (d === "Easy") return "bg-emerald-100 text-emerald-700";
  if (d === "Medium") return "bg-brand/20 text-foreground";
  return "bg-rose-100 text-rose-700";
}

function QuestionsPage() {
  return (
    <AppLayout
      breadcrumbs={[{ label: "Question Bank" }, { label: "Questions" }]}
      title="Questions"
      description="Manage your central question bank — 1,284 questions across 23 categories."
      actions={
        <>
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1.5"/> Filters</Button>
          <Link to="/questions/new">
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="h-4 w-4 mr-1.5"/> Create question</Button>
          </Link>
        </>
      }
    >
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input placeholder="Search questions, IDs, tags…" className="pl-8 h-9"/>
          </div>
          <Select defaultValue="all"><SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status"/></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="p">Published</SelectItem><SelectItem value="d">Draft</SelectItem><SelectItem value="a">Archived</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Difficulty"/></SelectTrigger>
            <SelectContent><SelectItem value="all">All difficulty</SelectItem><SelectItem value="e">Easy</SelectItem><SelectItem value="m">Medium</SelectItem><SelectItem value="h">Hard</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Type"/></SelectTrigger>
            <SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="sc">Single Choice</SelectItem><SelectItem value="mc">Multiple Choice</SelectItem><SelectItem value="sa">Short Answer</SelectItem><SelectItem value="es">Essay</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Tags"/></SelectTrigger>
            <SelectContent><SelectItem value="all">All tags</SelectItem><SelectItem value="bio">Biology</SelectItem><SelectItem value="math">Math</SelectItem><SelectItem value="cs">CS</SelectItem></SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Checkbox/> <span>{questions.length} questions · 8 selected</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs"><Send className="h-3.5 w-3.5 mr-1"/>Publish</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs"><Archive className="h-3.5 w-3.5 mr-1"/>Archive</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2.5"><Checkbox/></th>
                <th className="text-left px-4 py-2.5 font-medium">Question</th>
                <th className="text-left px-4 py-2.5 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Difficulty</th>
                <th className="text-left px-4 py-2.5 font-medium">Tags</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Created by</th>
                <th className="text-left px-4 py-2.5 font-medium">Created</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3"><Checkbox/></td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1 max-w-md">{q.text}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{q.id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{q.type}</td>
                  <td className="px-4 py-3"><span className={"px-2 py-0.5 rounded text-xs font-medium " + diffTone(q.difficulty)}>{q.difficulty}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {q.tags.map((t) => <Badge key={t} variant="secondary" className="font-normal text-[11px]">{t}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className={statusTone(q.status)}>{q.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{q.createdBy}</td>
                  <td className="px-4 py-3 text-muted-foreground">{q.createdAt}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5"/></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
          <span>Showing 1–{questions.length} of 1,284</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7">Previous</Button>
            <Button variant="outline" size="sm" className="h-7">Next</Button>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
