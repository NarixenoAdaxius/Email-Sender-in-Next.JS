"use client";

import React, { useState, useRef } from 'react';
import { Upload, Loader2, ImageIcon, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

interface ImageUploaderProps {
  onImageSelected: (imageUrl: string) => void;
  initialImage?: string;
  folder?: string;
  className?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  initialImage = '',
  folder = 'email-images',
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState(initialImage);
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size should be less than 5MB");
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError("Only JPEG, PNG, GIF and WebP images are allowed");
        return;
      }
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to upload image';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Unable to parse error message, use default
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.imageUrl) {
        throw new Error('No image URL returned from server');
      }
      
      setImageUrl(data.imageUrl);
      onImageSelected(data.imageUrl);
      
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      setError(error instanceof Error ? error.message : 'Error uploading image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!externalUrl) {
      setError('Please enter an image URL');
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Verify URL is valid
      const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-zA-Z]{2,}(\/\S*)?$/;
      if (!urlPattern.test(externalUrl)) {
        setError('Please enter a valid URL');
        return;
      }
      
      // Regular expression to check if URL ends with an image extension
      const imageExtPattern = /\.(jpg|jpeg|png|gif|webp)$/i;
      
      // If it doesn't look like an image URL but we want to be permissive,
      // we can skip this check or make it a warning
      if (!imageExtPattern.test(externalUrl)) {
        console.warn('URL may not be a direct image link:', externalUrl);
      }
      
      // The external image will be downloaded and stored in MongoDB
      const response = await fetch('/api/upload/external-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: externalUrl, folder }),
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to process image URL';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Unable to parse error message, use default
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.imageUrl) {
        throw new Error('No image URL returned from server');
      }
      
      setImageUrl(data.imageUrl);
      onImageSelected(data.imageUrl);
      
    } catch (error: unknown) {
      console.error('Error processing image URL:', error);
      setError(error instanceof Error ? error.message : 'Error processing image URL');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearImage = async () => {
    try {
      // Only attempt to delete if we have an image URL and it's from our own API
      if (imageUrl && imageUrl.startsWith('/api/images/')) {
        // Extract the image ID from the URL
        const imageId = imageUrl.split('/').pop();
        
        if (imageId) {
          // Send DELETE request to remove the image from the database
          const response = await fetch(`/api/images/${imageId}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            console.error('Failed to delete image from database:', await response.text());
          }
        }
      }
      
      // Clear the image URL locally regardless of server response
      setImageUrl('');
      setExternalUrl('');
      onImageSelected('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error removing image:', error);
      // Still clear the image locally even if deletion fails
      setImageUrl('');
      setExternalUrl('');
      onImageSelected('');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {imageUrl ? (
        <div className="relative">
          <div className="relative rounded-xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={imageUrl} 
              alt="Uploaded image" 
              className="w-full h-auto max-h-[300px] object-contain" 
            />
            <button 
              type="button"
              onClick={clearImage}
              aria-label="Remove image"
              className="absolute top-2 right-2 p-1.5 bg-background/85 backdrop-blur-sm hover:bg-background rounded-full text-foreground/80 hover:text-destructive transition-colors cursor-pointer shadow-xs"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 break-all">{imageUrl}</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'url')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="url">External URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4 py-4">
            <div 
              className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={triggerFileUpload}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-foreground/85 mb-1">Drag and drop an image, or click to select</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP up to 5MB</p>
              </div>
            </div>
            
            <Button 
              variant="secondary"
              size="sm" 
              className="w-full flex items-center justify-center"
              onClick={triggerFileUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Image
                </>
              )}
            </Button>
          </TabsContent>
          
          <TabsContent value="url" className="py-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={isUploading || !externalUrl}
                    aria-label="Fetch image from URL"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a direct URL to an image (JPG, PNG, GIF, WebP)
                </p>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      )}
      
      {error && (
        <div role="alert" className="text-sm text-destructive mt-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUploader; 