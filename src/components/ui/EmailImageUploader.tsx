"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmailImageUploaderProps {
  onImageSelected: (imageUrl: string) => void;
  initialImage?: string;
  folder?: string;
  className?: string;
}

const EmailImageUploader: React.FC<EmailImageUploaderProps> = ({
  onImageSelected,
  initialImage = '',
  folder = 'email-images',
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialImage);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update image URL when initialImage prop changes
  useEffect(() => {
    setImageUrl(initialImage);
  }, [initialImage]);

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

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearImage = () => {
    // Only clear the selection locally so saved templates or sent emails referencing
    // this image ID remain intact until explicit replacement.
    setError(null);
    setImageUrl('');
    onImageSelected('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          {/* Display image URL but remove the placeholder URL if present */}
          {!imageUrl.includes('placeholder.com') && (
            <p className="text-xs text-muted-foreground mt-1 break-all">{imageUrl}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
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
        </div>
      )}
      
      {error && (
        <div role="alert" className="text-sm text-destructive mt-2">
          {error}
        </div>
      )}
    </div>
  );
};

export default EmailImageUploader; 