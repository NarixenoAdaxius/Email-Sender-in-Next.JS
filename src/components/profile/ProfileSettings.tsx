"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserCircle, Upload, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { requestJson } from '@/components/dashboard/requestJson';

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

interface ProfilePictureUploaderProps {
  onImageSelected: (imageUrl: string) => void;
  initialImage?: string;
}

const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  onImageSelected,
  initialImage = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(Boolean(initialImage));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImageUrl(initialImage);
    setIsImageLoading(Boolean(initialImage));
  }, [initialImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);

      if (file.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }

      const formData = new FormData();
      formData.append('profilePicture', file);

      const data = await requestJson<{ profilePicture?: string }>(
        '/api/user/profile-picture',
        {
          method: 'POST',
          body: formData,
        },
        'Failed to upload image'
      );

      if (!data.profilePicture) {
        throw new Error('No image URL returned from server');
      }

      setIsImageLoading(true);
      setImageUrl(data.profilePicture);
      onImageSelected(data.profilePicture);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error uploading image';
      setError(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const clearImage = async () => {
    try {
      setIsUploading(true);
      setError(null);

      await requestJson(
        '/api/user/profile-picture',
        {
          method: 'DELETE',
        },
        'Failed to remove image'
      );

      setImageUrl('');
      onImageSelected('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error removing image';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        id="profile-picture-upload"
        aria-label="Upload profile picture"
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
      />

      <div className="flex flex-wrap items-center gap-3">
        {imageUrl && (
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Uploaded profile preview"
              className="h-full w-full object-cover"
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false);
                setError('Failed to load image');
              }}
            />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={triggerFileUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload Photo
            </>
          )}
        </Button>

        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={clearImage}
          >
            <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <X className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

const ProfileSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await requestJson<Partial<UserProfile>>(
        '/api/user/profile',
        undefined,
        'Failed to fetch profile'
      );
      setProfile({
        name: data.name || '',
        email: data.email || '',
        jobTitle: data.jobTitle || '',
        company: data.company || '',
        location: data.location || '',
        phone: data.phone || '',
        bio: data.bio || '',
        profilePicture: data.profilePicture || '',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error loading profile';
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
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const data = await requestJson<{ profile?: Partial<UserProfile> }>(
        '/api/user/profile',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profile),
        },
        'Failed to save profile'
      );

      if (data.profile) {
        setProfile((prev) => ({ ...prev, ...data.profile }));
      }

      window.dispatchEvent(
        new CustomEvent('user-profile-updated', {
          detail: {
            name: data.profile?.name ?? profile.name,
            profilePicture: data.profile?.profilePicture ?? profile.profilePicture ?? null,
          },
        })
      );

      toast({
        title: 'Success',
        description: 'Profile saved successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error saving profile';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelected = async (imageUrl: string) => {
    setProfile((prev) => ({
      ...prev,
      profilePicture: imageUrl,
    }));

    toast({
      title: 'Success',
      description: imageUrl ? 'Profile picture updated successfully' : 'Profile picture removed',
    });

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent('user-profile-updated', {
            detail: { profilePicture: imageUrl },
          })
        );
      }
    } catch {
      // Ignore header sync errors
    }
  };

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <Card className="overflow-hidden border-border bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex w-full flex-col items-center justify-center md:w-1/3">
              <div className="relative mb-4 h-36 w-36 overflow-hidden rounded-full border-2 border-border bg-muted shadow-sm">
                {profile.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePicture}
                    alt={profile.name || 'Profile Picture'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-full w-full text-muted-foreground/50" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {profile.name || 'Your Name'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {profile.jobTitle || 'Your Title'}
              </p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>

            <div className="flex w-full flex-col justify-center md:w-2/3">
              <div className="mb-4 space-y-1">
                <h3 className="text-base font-semibold text-foreground">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a JPEG, PNG, GIF, or WebP image up to 5MB.
                </p>
              </div>

              <ProfilePictureUploader
                onImageSelected={handleImageSelected}
                initialImage={profile.profilePicture || ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <Card className="border-border bg-card">
          <CardContent className="space-y-4 p-6">
            <h3 className="text-base font-semibold text-foreground">Personal Information</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  placeholder="Your email address"
                  required
                  readOnly
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to update your primary account email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  autoComplete="organization-title"
                  value={profile.jobTitle}
                  onChange={handleInputChange}
                  placeholder="Your job title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  autoComplete="organization"
                  value={profile.company}
                  onChange={handleInputChange}
                  placeholder="Your company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  autoComplete="country-name"
                  value={profile.location}
                  onChange={handleInputChange}
                  placeholder="Your location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={profile.phone}
                  onChange={handleInputChange}
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
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
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
