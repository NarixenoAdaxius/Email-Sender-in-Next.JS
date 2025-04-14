"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, RefreshCw, Eye, EyeOff, Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const SecuritySettings: React.FC = () => {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch security settings on mount
  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/security-settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch security settings');
      }
      
      const data = await response.json();
      
      // Update the component state with fetched data
      setTwoFactorEnabled(data.twoFactorEnabled);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Error loading security settings',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    switch (field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword);
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
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }
    
    // Validate password strength
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdatingPassword(true);
    
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      
      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to change password',
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    setIsEnabling2FA(true);
    
    try {
      const action = twoFactorEnabled ? 'disable' : 'enable';
      
      const response = await fetch(`/api/user/two-factor/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action} two-factor authentication`);
      }
      
      setTwoFactorEnabled(!twoFactorEnabled);
      
      toast({
        title: "Success",
        description: `Two-factor authentication ${twoFactorEnabled ? 'disabled' : 'enabled'} successfully`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to update two-factor authentication',
        variant: "destructive",
      });
    } finally {
      setIsEnabling2FA(false);
    }
  };

  // Function to start the 2FA setup process
  const start2FASetup = async () => {
    try {
      setIsEnabling2FA(true);
      
      const response = await fetch('/api/user/setup-2fa', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to start 2FA setup');
      }
      
      const data = await response.json();
      
      // Set the QR code and secret key
      setQrCode(data.qrCode);
      setSecretKey(data.secret);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Error setting up 2FA',
        variant: "destructive"
      });
    }
  };

  // Function to verify and enable 2FA
  const confirm2FASetup = async () => {
    try {
      if (!confirmationCode) {
        toast({
          title: "Error",
          description: 'Please enter the verification code',
          variant: "destructive"
        });
        return;
      }
      
      const response = await fetch('/api/user/confirm-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: confirmationCode,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Invalid verification code');
      }
      
      toast({
        title: "Success",
        description: 'Two-factor authentication enabled successfully'
      });
      setTwoFactorEnabled(true);
      setIsEnabling2FA(false);
      setQrCode(null);
      setSecretKey(null);
      setConfirmationCode('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to verify code',
        variant: "destructive"
      });
    }
  };

  // Function to disable 2FA
  const disable2FA = async () => {
    try {
      const response = await fetch('/api/user/disable-2fa', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }
      
      toast({
        title: "Success",
        description: 'Two-factor authentication disabled'
      });
      setTwoFactorEnabled(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Error disabling 2FA',
        variant: "destructive"
      });
    }
  };

  // Function to show active sessions modal (placeholder)
  const handleViewSessions = () => {
    setShowSessionsModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
      
      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2 text-primary" />
            Change Password
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
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
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
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Password must be at least 8 characters
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Enhance your account security with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </h4>
              <p className="text-sm text-gray-500">
                {twoFactorEnabled
                  ? 'Your account is protected with two-factor authentication'
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
            <div className="flex items-center">
              {isEnabling2FA ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleToggle2FA}
                disabled={isEnabling2FA}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage your active sessions and sign out from other devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium">Current Session</h4>
              <p className="text-sm text-gray-500">
                This is your current active session
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Current Device
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline">
              Sign Out All Other Devices
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings; 