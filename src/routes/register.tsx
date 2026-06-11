import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Mail, Lock, UserPlus, User, AlertTriangle, ShieldCheck } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

import api from "@/lib/axios";
import { parseApiError, pickAccessToken, pickTenantId, setAuthSession } from "@/lib/auth";
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

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required."),
    email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    passwordConfirmation: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Passwords do not match.",
    path: ["passwordConfirmation"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register · ExamForge" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setServerError("");

    try {
      const response = await api.post("/v1/auth/register", {
        name: values.name,
        email: values.email,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
      });

      const token = pickAccessToken(response.data);
      if (token) {
        const tenantId = pickTenantId(response.data);

        if (!tenantId) {
          console.warn(
            "[tenant] Register response did not include tenant_id; X-Tenant-ID cannot be attached until tenant_id is available.",
          );
        }

        setAuthSession(token, tenantId);
        toast.success("Account created and signed in.");
        router.navigate({ to: "/", replace: true });
        return;
      }

      toast.success("Account created. Please sign in.");
      router.navigate({ to: "/login", replace: true });
    } catch (error) {
      const isValidationError = axios.isAxiosError(error) && error.response?.status === 422;
      const { message, fieldErrors } = parseApiError(error);

      Object.entries(fieldErrors).forEach(([field, fieldMessage]) => {
        if (
          field === "name" ||
          field === "email" ||
          field === "password" ||
          field === "passwordConfirmation"
        ) {
          form.setError(field as keyof RegisterValues, { type: "server", message: fieldMessage });
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
      eyebrow="Create account"
      title="Build your workspace."
      description="Register a new ExamForge account and immediately unlock the same dashboard experience once the backend returns a token."
      footerPrompt="Already have an account?"
      footerLinkTo="/login"
      footerLinkLabel="Sign in"
    >
      <div className="mb-5 rounded-2xl border border-brand/20 bg-brand/10 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-ink">
            <UserPlus className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">New tenant-ready account</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              We mirror your backend validation, including password confirmation and any custom
              field-level rules you return.
            </div>
          </div>
        </div>
      </div>

      {serverError && (
        <Alert variant="destructive" className="mb-5 border-destructive/25 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Registration failed</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input {...field} placeholder="Ayesha Khan" className="h-11 pl-9" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
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
            name="passwordConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      className="h-11 pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span>
              By creating an account you agree to store a local auth token for the mock dashboard
              flow.
            </span>
          </div>

          <Button
            type="submit"
            className="h-11 w-full bg-brand text-ink hover:bg-brand/90"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <UserPlus className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
