import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Send, Trash2, Clock, FileText, Layers3, User } from "lucide-react";
import { deleteTest, listAllTests, publishTest, type TestResource } from "@/lib/tests";
import { parseApiError } from "@/lib/auth";

export const Route = createFileRoute("/tests")({
  head: () => ({ meta: [{ title: "Bài kiểm tra · ExamForge" }] }),
  component: TestsPage,
});

function sectionQuestionCount(test: TestResource) {
  return test.sections.reduce((total, section) => total + section.questions.length, 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function TestsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();

  const testsQuery = useQuery({
    queryKey: ["tests", "list"],
    queryFn: () => listAllTests({ per_page: 100 }),
    staleTime: 30_000,
  });

  const publishMutation = useMutation({
    mutationFn: publishTest,
    onSuccess: async () => {
      toast.success("Đã xuất bản bài kiểm tra thành công.");
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTest,
    onSuccess: async () => {
      toast.success("Đã xóa bài kiểm tra thành công.");
      await queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });

  const tests = testsQuery.data ?? [];
  const stats = useMemo(
    () => ({
      total: tests.length,
      drafts: tests.filter((test) => test.status === "draft").length,
      published: tests.filter((test) => test.status === "published").length,
      questions: tests.reduce((sum, test) => sum + sectionQuestionCount(test), 0),
    }),
    [tests],
  );

  if (pathname !== "/tests") {
    return <Outlet />;
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: "Trình tạo đề" }, { label: "Bài kiểm tra" }]}
      title="Bài kiểm tra"
      description="Tạo, xuất bản và phân công bài kiểm tra. Khi đã xuất bản, câu hỏi sẽ được chụp lại để các chỉnh sửa sau này không làm thay đổi nội dung học viên thấy."
      actions={
        <>
          <Link to="/tests/builder">
            <Button variant="outline" size="sm">
              <Wrench className="h-4 w-4 mr-1.5" /> Mở trình tạo
            </Button>
          </Link>
          <Link to="/tests/builder">
            <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="h-4 w-4 mr-1.5" /> Tạo bài kiểm tra
            </Button>
          </Link>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Tổng số bài kiểm tra</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Bản nháp</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{stats.drafts}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Đã xuất bản</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{stats.published}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Số câu hỏi dùng</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{stats.questions}</div>
        </Card>
      </div>

      {testsQuery.isLoading ? (
        <Card className="p-8 text-sm text-muted-foreground">Đang tải bài kiểm tra từ BE...</Card>
      ) : testsQuery.error ? (
        <Card className="p-8 text-sm text-destructive">Không tải được danh sách bài kiểm tra từ BE.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tests.map((test) => (
            <Card key={test.id} className="p-5 hover:border-brand/40 hover:shadow-sm transition group">
              <div className="flex items-start justify-between mb-3 gap-2">
                <Badge
                  variant="outline"
                  className={
                    test.status === "published"
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {test.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    void deleteMutation.mutateAsync(test.id);
                  }}
                  disabled={test.status !== "draft" || deleteMutation.isPending}
                  title={test.status === "draft" ? "Xóa bản nháp" : "Bài kiểm tra đã xuất bản chỉ đọc"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Link to="/tests/$id" params={{ id: test.id }} className="block">
                <h3 className="font-semibold leading-tight group-hover:text-foreground">{test.title}</h3>
                <div className="text-[11px] text-muted-foreground font-mono mt-1">{test.id}</div>
              </Link>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    Thời lượng
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{Math.max(1, Math.round(test.duration_seconds / 60))}m</div>
                </div>
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                    <FileText className="h-3 w-3" />
                    Câu hỏi
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{sectionQuestionCount(test)}</div>
                </div>
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                    <Layers3 className="h-3 w-3" />
                    Các phần
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{test.sections.length}</div>
                </div>
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                    <User className="h-3 w-3" />
                    Người tạo
                  </div>
                  <div className="text-xs font-semibold mt-0.5 truncate px-1">
                    {test.creator?.display_name ?? "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Pass score · <span className="text-foreground font-medium">{test.passing_score}%</span>
                </span>
                <span>{formatDate(test.published_at)}</span>
              </div>

              <div className="mt-4 flex gap-2">
                <Link to="/tests/$id" params={{ id: test.id }} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Xem chi tiết
                  </Button>
                </Link>
                {test.status !== "published" && (
                  <Button
                    size="sm"
                    className="bg-brand text-brand-foreground hover:bg-brand/90"
                    disabled={publishMutation.isPending}
                    onClick={() => {
                      void publishMutation.mutateAsync(test.id);
                    }}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Xuất bản
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
