import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Mail, Lock, ShieldCheck, AlertTriangle } from "lucide-react";
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
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login · ExamForge" }] }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setServerError("");

    try {
      const response = await api.post("/v1/auth/login", values);
      const token = pickAccessToken(response.data) ?? "mock-access-token";
      setAccessToken(token);

      toast.success("Logged in successfully.");
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
      if (!hasFieldErrors) {
        setServerError(message);
      }

      if (!isValidationError) {
        toast.error(message);
      }

      if (isValidationError) {
        return;
      }
    }
  });

  return (
    <AuthShell
      eyebrow="Secure sign in"
      title="Welcome back."
      description="Use your workspace account to continue into the dashboard. Backend validation errors will appear next to the exact input."
      footerPrompt="No account yet?"
      footerLinkTo="/register"
      footerLinkLabel="Create one"
    >
      <div className="mb-5 rounded-2xl border border-brand/20 bg-brand/10 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-ink">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Protected workspace access</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              Sign in with the credentials validated by your backend. We persist the access token
              locally so dashboard navigation stays seamless.
            </div>
          </div>
        </div>
      </div>

      {serverError && (
        <Alert variant="destructive" className="mb-5 border-destructive/25 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Login failed</AlertTitle>
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
                  <FormLabel>Password</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs font-medium text-brand hover:no-underline"
                  >
                    Forgot password?
                  </Button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-11 pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between pt-1 text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-input accent-[var(--brand)]"
              />
              Remember me
            </label>
            <span className="text-xs text-muted-foreground">Token stored in localStorage</span>
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-brand text-ink hover:bg-brand/90"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ShieldCheck className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-5 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">Demo notes</div>
        <ul className="mt-2 space-y-1.5">
          <li>• Backend validation errors are shown inline.</li>
          <li>• Success stores `access_token` and redirects to the dashboard.</li>
          <li>• This flow is ready for your real BE response format.</li>
        </ul>
      </div>
    </AuthShell>
  );
}
