"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

interface TwoFactorVerificationFormProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function TwoFactorVerificationForm({
  email,
  onVerify,
  onCancel,
  isLoading,
}: TwoFactorVerificationFormProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = verificationCode.trim();
    if (!useRecoveryCode && trimmed.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    if (useRecoveryCode && trimmed.length < 6) {
      setError("Please enter a valid recovery code");
      return;
    }

    setError(null);

    try {
      await onVerify(trimmed);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to verify code"
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (useRecoveryCode) {
      const value = e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32);
      setVerificationCode(value);
      return;
    }
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length <= 6) {
      setVerificationCode(value);
    }
  };

  const toggleRecoveryMode = () => {
    setUseRecoveryCode((prev) => !prev);
    setVerificationCode("");
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
      className="mx-auto space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Two-Factor Verification
        </h2>
        <p className="text-sm text-muted-foreground">
          {useRecoveryCode
            ? "Enter one of your single-use recovery codes for "
            : "Enter the 6-digit code from your authenticator app for "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verification-code">
            {useRecoveryCode ? "Recovery Code" : "Verification Code"}
          </Label>
          <Input
            id="verification-code"
            type="text"
            inputMode={useRecoveryCode ? "text" : "numeric"}
            pattern={useRecoveryCode ? undefined : "[0-9]*"}
            maxLength={useRecoveryCode ? 32 : 6}
            value={verificationCode}
            onChange={handleChange}
            placeholder={useRecoveryCode ? "xxxxx-xxxxx" : "123456"}
            autoComplete={useRecoveryCode ? "off" : "one-time-code"}
            disabled={isLoading}
            autoFocus
            className={
              useRecoveryCode
                ? "font-mono text-center text-base tracking-widest"
                : "font-mono text-center text-lg tracking-[0.35em] tabular-nums"
            }
          />
          <p className="text-xs text-muted-foreground">
            {useRecoveryCode
              ? "Enter a 10-character recovery code (e.g. a1b2c-d3e4f)"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="sm:flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={
              isLoading ||
              (useRecoveryCode
                ? verificationCode.trim().length < 6
                : verificationCode.length !== 6)
            }
            className="sm:flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={toggleRecoveryMode}
            disabled={isLoading}
            className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
          >
            {useRecoveryCode
              ? "Use authenticator app code instead"
              : "Use a recovery code"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
