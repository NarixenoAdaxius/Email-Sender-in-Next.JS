"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, User, Mail, Building, MapPin, Phone, Save, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  location: string;
  phone: string;
  bio: string;
  profilePicture: string | null;
  timezone: string;
  jobTitle: string;
}

const timezones = [
  { value: 'UTC-12:00', label: '(UTC-12:00) International Date Line West' },
  { value: 'UTC-11:00', label: '(UTC-11:00) Coordinated Universal Time-11' },
  { value: 'UTC-10:00', label: '(UTC-10:00) Hawaii' },
  { value: 'UTC-09:00', label: '(UTC-09:00) Alaska' },
  { value: 'UTC-08:00', label: '(UTC-08:00) Pacific Time (US & Canada)' },
  { value: 'UTC-07:00', label: '(UTC-07:00) Mountain Time (US & Canada)' },
  { value: 'UTC-06:00', label: '(UTC-06:00) Central Time (US & Canada)' },
  { value: 'UTC-05:00', label: '(UTC-05:00) Eastern Time (US & Canada)' },
  { value: 'UTC-04:00', label: '(UTC-04:00) Atlantic Time (Canada)' },
  { value: 'UTC-03:00', label: '(UTC-03:00) Brasilia' },
  { value: 'UTC-02:00', label: '(UTC-02:00) Coordinated Universal Time-02' },
  { value: 'UTC-01:00', label: '(UTC-01:00) Azores' },
  { value: 'UTC+00:00', label: '(UTC+00:00) London, Dublin, Lisbon' },
  { value: 'UTC+01:00', label: '(UTC+01:00) Berlin, Paris, Rome, Madrid' },
  { value: 'UTC+02:00', label: '(UTC+02:00) Athens, Bucharest, Istanbul' },
  { value: 'UTC+03:00', label: '(UTC+03:00) Moscow, St. Petersburg, Kuwait' },
  { value: 'UTC+04:00', label: '(UTC+04:00) Abu Dhabi, Dubai, Baku' },
  { value: 'UTC+05:00', label: '(UTC+05:00) Islamabad, Karachi, Tashkent' },
  { value: 'UTC+05:30', label: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
  { value: 'UTC+06:00', label: '(UTC+06:00) Dhaka, Almaty, Novosibirsk' },
  { value: 'UTC+07:00', label: '(UTC+07:00) Bangkok, Hanoi, Jakarta' },
  { value: 'UTC+08:00', label: '(UTC+08:00) Beijing, Hong Kong, Singapore' },
  { value: 'UTC+09:00', label: '(UTC+09:00) Tokyo, Seoul, Osaka' },
  { value: 'UTC+10:00', label: '(UTC+10:00) Sydney, Melbourne, Brisbane' },
  { value: 'UTC+11:00', label: '(UTC+11:00) Magadan, Solomon Islands' },
  { value: 'UTC+12:00', label: '(UTC+12:00) Auckland, Wellington, Fiji' },
];

type ProfileFormValues = {
  name: string;
  email: string;
  jobTitle: string;
  company: string;
  bio: string;
};

const ProfileSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    company: '',
    location: '',
    phone: '',
    bio: '',
    profilePicture: null,
    timezone: 'UTC+00:00',
    jobTitle: '',
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormValues>({
    defaultValues: {
      name: '',
      email: '',
      jobTitle: '',
      company: '',
      bio: ''
    }
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      
      // Reset form with profile data
      reset({
        name: data.profile.name,
        email: data.profile.email,
        jobTitle: data.profile.jobTitle || '',
        company: data.profile.company || '',
        bio: data.profile.bio || ''
      });
      
      if (data.profile.profilePicture) {
        setPreviewUrl(data.profile.profilePicture);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || 'Error loading profile', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileUpload(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload the image
      try {
        setIsSaving(true);
        
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        const response = await fetch('/api/user/profile-picture', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload profile picture');
        }
        
        toast({
          title: 'Success',
          description: 'Profile picture updated successfully',
        });
        
        // Refresh the profile to get the updated picture URL
        fetchUserProfile();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Error uploading profile picture',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProfile(prev => ({ ...prev, timezone: e.target.value }));
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          jobTitle: data.jobTitle,
          company: data.company,
          bio: data.bio,
          timezone: profile.timezone,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const result = await response.json();
      setProfile(result.profile);
      
      toast({
        title: "Success", 
        description: 'Profile updated successfully'
      });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || 'Error updating profile',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={previewUrl || "/placeholder-avatar.png"} alt="Profile" />
          <AvatarFallback>
            <User className="w-full h-full text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Change Picture
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              {...register('name', { required: 'Name is required' })}
              aria-invalid={errors.name ? 'true' : 'false'}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input 
              id="jobTitle" 
              {...register('jobTitle')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input 
              id="company" 
              {...register('company')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Time Zone</Label>
            <Select 
              id="timezone"
              value={profile.timezone}
              onChange={handleTimezoneChange}
            >
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio" 
            rows={4}
            {...register('bio')}
            className="block w-full py-2 rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={!isDirty}
          className="w-full md:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </form>
    </div>
  );
};

export default ProfileSettings; 