"use client";

import React, { useState, useEffect } from 'react';
import { UserCircle, Mail, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface UserProfile {
  name: string;
  email: string;
  jobTitle: string;
  company: string;
  location: string;
  phone: string;
  bio: string;
  profilePicture: string;
}

const ProfileSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    jobTitle: '',
    company: '',
    location: '',
    phone: '',
    bio: '',
    profilePicture: '',
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
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: error.message || 'Error loading profile',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save profile');
      }
      
      const data = await response.json();
      
      // Update local state with the returned data
      if (data.profile) {
        setProfile(data.profile);
      }
      
      toast({
        title: "Success",
        description: 'Profile saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || 'Error saving profile',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size should be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only JPEG, PNG, GIF and WebP images are allowed",
          variant: "destructive"
        });
        return;
      }
      
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }
      
      const data = await response.json();
      
      setProfile(prev => ({
        ...prev,
        profilePicture: data.profilePicture
      }));
      
      toast({
        title: "Success",
        description: 'Profile picture uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: "Error",
        description: error.message || 'Error uploading profile picture',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
      {/* Profile Picture */}
      <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary">
          {profile.profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={profile.profilePicture} 
              alt="Profile"
              className="w-full h-full object-cover" 
            />
          ) : (
            <UserCircle className="w-full h-full text-gray-300" />
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium">Profile Picture</h3>
          <p className="text-sm text-gray-500 mb-2">Upload a new profile picture</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center"
            onClick={triggerFileUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload Photo
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                name="name" 
                value={profile.name} 
                onChange={handleInputChange} 
                placeholder="Your full name"
                required
              />
            </div>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input 
                id="email" 
                name="email" 
                value={profile.email} 
                onChange={handleInputChange} 
                placeholder="Your email address"
                required
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Contact admin to change your email address
              </p>
            </div>
            
            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input 
                id="jobTitle" 
                name="jobTitle" 
                value={profile.jobTitle} 
                onChange={handleInputChange} 
                placeholder="Your job title"
              />
            </div>
            
            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input 
                id="company" 
                name="company" 
                value={profile.company} 
                onChange={handleInputChange} 
                placeholder="Your company name"
              />
            </div>
            
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                name="location" 
                value={profile.location} 
                onChange={handleInputChange} 
                placeholder="Your location"
              />
            </div>
            
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                name="phone" 
                value={profile.phone} 
                onChange={handleInputChange} 
                placeholder="Your phone number"
              />
            </div>
          </div>
          
          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              name="bio" 
              value={profile.bio} 
              onChange={handleInputChange} 
              placeholder="Tell us a little about yourself"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="flex items-center"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <></>
          )}
          Save Profile
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings; 