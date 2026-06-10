import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Mail, Lock, LogIn, AlertTriangle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import api from "@/lib/axios";
import { parseApiError, pickAccessToken, setAccessToken } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email.").email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Đăng nhập · ExamForge" }] }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setServerError("");

    try {
      const response = await api.post("/v1/auth/login", values);
      const token = pickAccessToken(response.data) ?? "mock-access-token";
      setAccessToken(token);

      toast.success("Đăng nhập thành công.");
      router.navigate({ to: "/", replace: true });
    } catch (error) {
      const isValidationError = axios.isAxiosError(error) && error.response?.status === 422;
      const { message, fieldErrors } = parseApiError(error);

      Object.entries(fieldErrors).forEach(([field, fieldMessage]) => {
        if (field === "email" || field === "password") {
          form.setError(field, { type: "server", message: fieldMessage });
        } else {
          setServerError(fieldMessage);
        }
      });

      const hasFieldErrors = Object.keys(fieldErrors).length > 0;
      if (!hasFieldErrors) setServerError(message);
      if (!isValidationError) toast.error(message);
      if (isValidationError) return;
    }
  });

  return (
    <AuthShell
      eyebrow="Chào mừng trở lại"
      title="Đăng nhập"
      description="Nhập thông tin tài khoản để tiếp tục vào bảng điều khiển của bạn."
      footerPrompt="Chưa có tài khoản?"
      footerLinkTo="/register"
      footerLinkLabel="Tạo tài khoản"
    >
      {serverError && (
        <Alert variant="destructive" className="mb-5 border-destructive/25 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Đăng nhập thất bại</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="h-11 pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Mật khẩu</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs font-medium text-brand hover:no-underline"
                  >
                    Quên mật khẩu?
                  </Button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      className="h-11 pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-2 pt-1 text-sm">
            <input
              type="checkbox"
              id="remember"
              className="h-4 w-4 rounded border border-input accent-[var(--brand)]"
            />
            <label htmlFor="remember" className="cursor-pointer text-muted-foreground">
              Ghi nhớ đăng nhập
            </label>
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-brand text-ink hover:bg-brand/90"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                Đăng nhập
                <LogIn className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}