"use client";

import React, { useState } from 'react';
import { Settings, User, Lock, Bell, Key, Shield } from 'lucide-react';
import ProfileSettings from '@/components/profile/ProfileSettings';
import SecuritySettings from '@/components/profile/SecuritySettings';
import NotificationSettings from '@/components/profile/NotificationSettings';
import EmailStatistics from '@/components/profile/EmailStatistics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  
  const handleTabClick = (tabId: 'profile' | 'security' | 'notifications') => {
    setActiveTab(tabId);
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Profile Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col">
                {[
                  { id: 'profile', label: 'Profile Settings', icon: User },
                  { id: 'security', label: 'Security', icon: Shield },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                ].map((item) => (
                  <button
                    key={item.id}
                    className={`flex items-center p-4 transition-colors hover:bg-gray-100 ${
                      activeTab === item.id ? 'bg-gray-100 font-medium text-primary' : 'text-gray-700'
                    }`}
                    onClick={() => handleTabClick(item.id as any)}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
          
          {/* Email Statistics Summary Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Email Overview</CardTitle>
              <CardDescription>Your quick stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Sent</span>
                  <span className="font-medium">128</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Open Rate</span>
                  <span className="font-medium">68%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Click Rate</span>
                  <span className="font-medium">42%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'profile' && 'Profile Settings'}
                {activeTab === 'security' && 'Security Settings'}
                {activeTab === 'notifications' && 'Notification Preferences'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'profile' && 'Manage your account details'}
                {activeTab === 'security' && 'Secure your account'}
                {activeTab === 'notifications' && 'Customize your notification preferences'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTab === 'profile' && <ProfileSettings />}
              {activeTab === 'security' && <SecuritySettings />}
              {activeTab === 'notifications' && <NotificationSettings />}
            </CardContent>
          </Card>
          
          {/* Email Statistics Detail */}
          {activeTab === 'profile' && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Email Statistics</CardTitle>
                <CardDescription>Detailed stats about your emails</CardDescription>
              </CardHeader>
              <CardContent>
                <EmailStatistics />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 