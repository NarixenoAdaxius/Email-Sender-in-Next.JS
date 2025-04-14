"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Calendar, Users, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface NotificationSettings {
  email: {
    marketing: boolean;
    emailDelivery: boolean;
    newFeatures: boolean;
    security: boolean;
  };
  app: {
    emailSent: boolean;
    emailOpened: boolean;
    emailClicked: boolean;
    emailBounced: boolean;
    newTemplates: boolean;
    teamInvites: boolean;
  };
}

const NotificationSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      marketing: true,
      emailDelivery: true,
      newFeatures: true,
      security: true,
    },
    app: {
      emailSent: true,
      emailOpened: true,
      emailClicked: true,
      emailBounced: true,
      newTemplates: true,
      teamInvites: true,
    },
  });

  useEffect(() => {
    // Fetch notification settings
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/notification-settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch notification settings');
        }
        
        const data = await response.json();
        setSettings(data);
      } catch (error) {
        // If fetching fails, we'll use the default settings
        console.error('Error fetching notification settings:', error);
        toast({ 
          title: "Error", 
          description: 'Error loading notification settings',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  const handleToggleEmailSetting = (key: keyof typeof settings.email) => {
    setSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        [key]: !prev.email[key],
      },
    }));
  };

  const handleToggleAppSetting = (key: keyof typeof settings.app) => {
    setSettings(prev => ({
      ...prev,
      app: {
        ...prev.app,
        [key]: !prev.app[key],
      },
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save notification settings');
      }
      
      toast({ 
        title: "Success", 
        description: 'Notification settings saved' 
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({ 
        title: "Error", 
        description: 'Error saving notification settings',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-opacity-50 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Mail className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-xl font-semibold">Email Notifications</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Manage the emails you receive from us
        </p>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="marketing"
                name="marketing"
                type="checkbox"
                checked={settings.email.marketing}
                onChange={() => handleToggleEmailSetting('marketing')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="marketing" className="font-medium text-gray-700">Marketing emails</label>
              <p className="text-gray-500">Receive emails about new features, tips, and special offers</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="emailDelivery"
                name="emailDelivery"
                type="checkbox"
                checked={settings.email.emailDelivery}
                onChange={() => handleToggleEmailSetting('emailDelivery')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="emailDelivery" className="font-medium text-gray-700">Email delivery reports</label>
              <p className="text-gray-500">Receive summary reports about your email campaigns</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="newFeatures"
                name="newFeatures"
                type="checkbox"
                checked={settings.email.newFeatures}
                onChange={() => handleToggleEmailSetting('newFeatures')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="newFeatures" className="font-medium text-gray-700">New features and updates</label>
              <p className="text-gray-500">Be the first to know about new features and platform updates</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="security"
                name="security"
                type="checkbox"
                checked={settings.email.security}
                onChange={() => handleToggleEmailSetting('security')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="security" className="font-medium text-gray-700">Security alerts</label>
              <p className="text-gray-500">Important security-related notifications about your account</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Bell className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-xl font-semibold">In-App Notifications</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Control which notifications appear in the app
        </p>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="emailSent"
                name="emailSent"
                type="checkbox"
                checked={settings.app.emailSent}
                onChange={() => handleToggleAppSetting('emailSent')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="emailSent" className="font-medium text-gray-700">Email sent</label>
              <p className="text-gray-500">Notify when an email is successfully sent</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="emailOpened"
                name="emailOpened"
                type="checkbox"
                checked={settings.app.emailOpened}
                onChange={() => handleToggleAppSetting('emailOpened')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="emailOpened" className="font-medium text-gray-700">Email opened</label>
              <p className="text-gray-500">Notify when a recipient opens your email</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="emailClicked"
                name="emailClicked"
                type="checkbox"
                checked={settings.app.emailClicked}
                onChange={() => handleToggleAppSetting('emailClicked')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="emailClicked" className="font-medium text-gray-700">Link clicked</label>
              <p className="text-gray-500">Notify when a recipient clicks a link in your email</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="emailBounced"
                name="emailBounced"
                type="checkbox"
                checked={settings.app.emailBounced}
                onChange={() => handleToggleAppSetting('emailBounced')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="emailBounced" className="font-medium text-gray-700">Email bounced</label>
              <p className="text-gray-500">Notify when an email fails to deliver</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="newTemplates"
                name="newTemplates"
                type="checkbox"
                checked={settings.app.newTemplates}
                onChange={() => handleToggleAppSetting('newTemplates')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="newTemplates" className="font-medium text-gray-700">New templates</label>
              <p className="text-gray-500">Notify when new email templates are available</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="teamInvites"
                name="teamInvites"
                type="checkbox"
                checked={settings.app.teamInvites}
                onChange={() => handleToggleAppSetting('teamInvites')}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="teamInvites" className="font-medium text-gray-700">Team invites</label>
              <p className="text-gray-500">Notify when you're invited to collaborate on a team</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Note about notification frequency
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                For performance reasons, some notifications may be batched together and sent periodically rather than in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom save button */}
      <div className="flex justify-end mt-6">
        <Button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Bell className="h-4 w-4 mr-2" />
          )}
          Save Notification Settings
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings; 