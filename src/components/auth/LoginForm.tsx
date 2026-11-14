"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "motion/react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginFormValues } from "@/utils/validation";
import TwoFactorVerificationForm from "./TwoFactorVerificationForm";
import OptimizedImage from "@/components/ui/optimized-image";

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const getSafeRedirectPath = (): string => {
    if (typeof window === "undefined") return "/dashboard";
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    if (
      callbackUrl &&
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.includes("\\")
    ) {
      try {
        const parsed = new URL(callbackUrl, window.location.origin);
        if (parsed.origin === window.location.origin) {
          return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        return "/dashboard";
      }
    }
    return "/dashboard";
  };

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Received non-JSON response");
      }

      const result = await response.json();

      if (!response.ok && !result.requiresTwoFactor) {
        throw new Error(result.error || "Failed to login");
      }

      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setUserEmail(data.email);
        toast.info("Please enter your verification code");
        return;
      }

      toast.success("Logged in successfully!");
      window.dispatchEvent(new Event("auth-state-changed"));
      router.push(getSafeRedirectPath());
      router.refresh();
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : "Login failed";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyTwoFactorCode(code: string): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          code,
        }),
        credentials: "include",
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Received non-JSON response");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to verify code");
      }

      toast.success("Logged in successfully!");
      window.dispatchEvent(new Event("auth-state-changed"));
      router.push(getSafeRedirectPath());
      router.refresh();
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : "Verification failed";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const handleCancelTwoFactor = () => {
    setRequiresTwoFactor(false);
    setErrorMessage(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0 }}
      className="mx-auto w-full max-w-md rounded-2xl border border-border/80 bg-card/90 text-card-foreground backdrop-blur-xl shadow-xl p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <OptimizedImage
          src="/logo.svg"
          alt="PaletteMail Logo"
          width={170}
          height={32}
          style={{ width: "auto" }}
          className="h-8 dark:invert dark:hue-rotate-180 dark:brightness-125"
          priority
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome Back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
      </div>

      {errorMessage && !requiresTwoFactor && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm"
        >
          <p className="font-semibold">Error</p>
          <p>{errorMessage}</p>
        </div>
      )}

      {!requiresTwoFactor ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="your.email@example.com"
                      type="email"
                      autoComplete="email"
                      disabled={isLoading}
                      {...field}
                    />
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
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="pr-10"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-10"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <TwoFactorVerificationForm
          email={userEmail}
          onVerify={verifyTwoFactorCode}
          onCancel={handleCancelTwoFactor}
          isLoading={isLoading}
        />
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#4F46E5] dark:text-[#A5B4FC] hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
