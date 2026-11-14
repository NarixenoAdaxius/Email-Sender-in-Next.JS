"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import TwoFactorSetup from './TwoFactorSetup';
import ActiveSessions from './ActiveSessions';
import { requestJson } from '@/components/dashboard/requestJson';

const SecuritySettings: React.FC = () => {
  const { toast } = useToast();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [showingTwoFactorSetup, setShowingTwoFactorSetup] = useState(false);
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchSecuritySettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await requestJson<{ twoFactorEnabled?: boolean }>(
        '/api/user/security-settings',
        undefined,
        'Failed to fetch security settings'
      );
      setTwoFactorEnabled(Boolean(data.twoFactorEnabled));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error loading security settings';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSecuritySettings();
  }, [fetchSecuritySettings]);

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    switch (field) {
      case 'current':
        setShowCurrentPassword((prev) => !prev);
        break;
      case 'new':
        setShowNewPassword((prev) => !prev);
        break;
      case 'confirm':
        setShowConfirmPassword((prev) => !prev);
        break;
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: "New passwords don't match",
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const result = await requestJson<{ message?: string }>(
        '/api/user/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        },
        'Failed to change password'
      );

      toast({
        title: 'Success',
        description: result.message || 'Password changed successfully',
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggle2FA = (checked: boolean) => {
    if (!checked && twoFactorEnabled) {
      setShowDisable2FADialog(true);
    } else if (checked && !twoFactorEnabled) {
      setShowingTwoFactorSetup(true);
    }
  };

  const disable2FA = async () => {
    setIsEnabling2FA(true);
    try {
      await requestJson(
        '/api/user/two-factor/disable',
        {
          method: 'POST',
        },
        'Failed to disable two-factor authentication'
      );

      setTwoFactorEnabled(false);
      setShowDisable2FADialog(false);

      toast({
        title: 'Success',
        description: 'Two-factor authentication disabled successfully',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to disable two-factor authentication';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const handleTwoFactorSetupComplete = () => {
    setShowingTwoFactorSetup(false);
    setTwoFactorEnabled(true);
    fetchSecuritySettings();
  };

  const handleTwoFactorSetupCancel = () => {
    setShowingTwoFactorSetup(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Change Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Key className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-r-md"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-r-md"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-r-md"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      {showingTwoFactorSetup ? (
        <TwoFactorSetup
          onComplete={handleTwoFactorSetupComplete}
          onCancel={handleTwoFactorSetupCancel}
        />
      ) : (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <Shield className="mr-2 h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              Palette Mail Authentication
            </CardTitle>
            <CardDescription>
              Enhance your account security with two-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="two-factor-switch" className="text-sm font-medium text-foreground">
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Label>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {twoFactorEnabled
                    ? 'Your account is protected with Palette Mail authentication'
                    : 'We recommend enabling two-factor authentication for increased security'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isEnabling2FA && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  id="two-factor-switch"
                  aria-label="Toggle two-factor authentication"
                  checked={twoFactorEnabled}
                  onCheckedChange={handleToggle2FA}
                  disabled={isEnabling2FA}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Management */}
      <ActiveSessions />

      {/* Confirm Disable 2FA */}
      <AlertDialog
        open={showDisable2FADialog}
        onOpenChange={(open) => {
          if (!open && !isEnabling2FA) setShowDisable2FADialog(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling two-factor authentication reduces the security of your PaletteMail account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnabling2FA}>Keep Enabled</AlertDialogCancel>
            <AlertDialogAction
              disabled={isEnabling2FA}
              onClick={(e) => {
                e.preventDefault();
                disable2FA();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isEnabling2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEnabling2FA ? 'Disabling...' : 'Disable 2FA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SecuritySettings;
