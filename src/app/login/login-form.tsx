"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/core/auth/auth-client";
import { roleHome } from "@/core/shell/portal-config";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const fieldInputClassName =
  "h-12 rounded-lg border-[#d5e0f3] bg-[#E8F0FE] px-4 text-base text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/30";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const message =
        error.message ?? "Unable to sign in. Please check your credentials.";
      setServerError(message);
      toast.error(message);
      return;
    }

    const sessionUser = data?.user as { role?: string | null } | undefined;

    // Route to the role's own portal home.
    router.replace(roleHome(sessionUser?.role));
    router.refresh();
  }

  return (
    <main className="bg-primary flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/seapollogo.png"
            alt="Seapol"
            width={160}
            height={120}
            priority
            className="h-16 w-auto object-contain"
          />
          <h1 className="mt-5 text-2xl font-bold text-slate-800">Seapol ERP</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700"
            >
              Username
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="superadmin@seapolerp.com"
              aria-invalid={Boolean(errors.email)}
              className={fieldInputClassName}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-semibold text-slate-700"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                className={`${fieldInputClassName} pr-12`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition-colors hover:text-slate-700"
              >
                {showPassword ? (
                  <Eye className="size-5" />
                ) : (
                  <EyeOff className="size-5" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="text-destructive text-sm">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {serverError ? (
            <p className="text-destructive text-sm" role="alert">
              {serverError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg text-base font-semibold"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </main>
  );
}
