"use client";

import React, { useState } from 'react';
import { Settings, User, Lock, Bell, Key, Shield } from 'lucide-react';
import ProfileSettings from '@/components/profile/ProfileSettings';
import SecuritySettings from '@/components/profile/SecuritySettings';
import NotificationSettings from '@/components/profile/NotificationSettings';
import Image from 'next/image';
import { UserCircle, Mail, BarChart, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Profile Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary">
                <UserCircle className="w-full h-full text-muted-foreground" />
              </div>
              <Button variant="outline" size="sm">Change Picture</Button>
              
              <div className="w-full space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue="John Doe" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue="john.doe@example.com" />
                </div>
                
                <Button className="w-full">Save Changes</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Email Stats Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Email Statistics</CardTitle>
            <CardDescription>Your email activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center p-4 border rounded-lg">
                <Mail className="w-10 h-10 text-primary mr-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-bold">128</p>
                </div>
              </div>
              <div className="flex items-center p-4 border rounded-lg">
                <BarChart className="w-10 h-10 text-primary mr-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-2xl font-bold">68%</p>
                </div>
              </div>
              <div className="flex items-center p-4 border rounded-lg">
                <Clock className="w-10 h-10 text-primary mr-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Sent</p>
                  <p className="text-2xl font-bold">2d ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Emails */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Emails</CardTitle>
            <CardDescription>Your recently sent emails</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((email) => (
                <div key={email} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Monthly Newsletter #{email}</p>
                    <p className="text-sm text-muted-foreground">Sent to 45 recipients</p>
                  </div>
                  <div className="text-sm text-right">
                    <p>3 days ago</p>
                    <p className="text-emerald-500">62% opened</p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">View All</Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Settings Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Get notified about new activities</p>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Auth</p>
                  <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">API Access</p>
                  <p className="text-sm text-muted-foreground">Manage your API keys</p>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage; 