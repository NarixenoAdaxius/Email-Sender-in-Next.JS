"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, Copy, CheckCircle2, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';
import { requestJson } from '@/components/dashboard/requestJson';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [step, setStep] = useState<'initial' | 'verifying' | 'recovery'>('initial');

  const startSetup = async () => {
    try {
      setIsLoading(true);
      const data = await requestJson<{ qrCode?: string; secret?: string }>(
        '/api/user/setup-2fa',
        { method: 'POST' },
        'Failed to start 2FA setup'
      );

      setQrCode(data.qrCode || null);
      setSecretKey(data.secret || null);
      setStep('verifying');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error setting up 2FA';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!confirmationCode || confirmationCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const data = await requestJson<{ recoveryCodes?: string[] }>(
        '/api/user/confirm-2fa',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: confirmationCode }),
        },
        'Invalid verification code'
      );

      toast({
        title: 'Success',
        description: 'Palette Mail Authentication enabled successfully',
      });

      if (Array.isArray(data.recoveryCodes) && data.recoveryCodes.length > 0) {
        setRecoveryCodes(data.recoveryCodes);
        setStep('recovery');
      } else {
        onComplete();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to verify code';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!secretKey) return;
    try {
      await navigator.clipboard.writeText(secretKey);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Secret key copied to clipboard',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Error',
        description: 'Unable to copy secret key automatically',
        variant: 'destructive',
      });
    }
  };

  const copyRecoveryCodes = async () => {
    if (!recoveryCodes.length) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopiedRecovery(true);
      toast({
        title: 'Copied',
        description: 'Recovery codes copied to clipboard',
      });
      setTimeout(() => setCopiedRecovery(false), 3000);
    } catch {
      toast({
        title: 'Error',
        description: 'Unable to copy recovery codes automatically',
        variant: 'destructive',
      });
    }
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes.length) return;
    const content = [
      'Palette Mail Two-Factor Authentication Recovery Codes',
      'Each code can only be used once. Store these in a safe place.',
      '',
      ...recoveryCodes,
      '',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'palettemail-recovery-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="mx-auto w-full max-w-md border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Shield className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Set Up Palette Mail Authentication
        </CardTitle>
        <CardDescription>
          Protect your account with an additional layer of security
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'initial' ? (
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Palette Mail Authentication adds an extra layer of security by requiring a verification code from your authenticator app.
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Click the button below to begin setup</li>
                <li>Scan the QR code with your authenticator app</li>
                <li>Enter the 6-digit verification code to confirm</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={startSetup}
                disabled={isLoading}
                className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Begin Setup'
                )}
              </Button>
            </div>
          </div>
        ) : step === 'verifying' ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Step 1: Scan QR Code</h3>
              <p className="text-xs text-muted-foreground">
                Scan this QR code with Google Authenticator, Authy, 1Password, or Microsoft Authenticator.
              </p>

              {qrCode && (
                <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                  <Image
                    src={qrCode}
                    alt="QR Code for 2FA"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Step 2: Or Enter Code Manually</h3>
              <p className="text-xs text-muted-foreground">
                If you cannot scan the QR code, enter this secret key into your authenticator app:
              </p>

              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {secretKey}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Copy secret key"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Step 3: Verify Setup</h3>
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app to finish enabling 2FA.
              </p>

              <div className="grid gap-2">
                <Label htmlFor="two-factor-code">Verification Code</Label>
                <Input
                  id="two-factor-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length <= 6) {
                      setConfirmationCode(value);
                    }
                  }}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  disabled={isLoading}
                  className="text-center font-mono text-lg tracking-widest tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="sm:flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={verifyCode}
                disabled={isLoading || confirmationCode.length !== 6}
                className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 sm:flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-foreground">Save Your Recovery Codes</h3>
              <p className="text-xs text-muted-foreground">
                Store these single-use recovery codes in a safe place. If you lose access to your authenticator app, you can use one to sign in. They will not be shown again.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/50 p-3">
              {recoveryCodes.map((code) => (
                <code
                  key={code}
                  className="rounded bg-background px-2.5 py-1.5 text-center font-mono text-xs text-foreground border border-border/60"
                >
                  {code}
                </code>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={copyRecoveryCodes}
                className="flex-1"
              >
                {copiedRecovery ? (
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {copiedRecovery ? 'Copied' : 'Copy'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={downloadRecoveryCodes}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Download
              </Button>
            </div>

            <Button
              type="button"
              onClick={onComplete}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              I&apos;ve saved these codes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
