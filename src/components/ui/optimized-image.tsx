"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [isLocal, setIsLocal] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // This is used for SVG files in Vercel deployment
  const createPublicImageUrl = (path: string) => {
    if (path.startsWith('/')) {
      return path.replace(/^\//, '');
    }
    return path;
  };

  useEffect(() => {
    // Update image source if prop changes
    setImgSrc(src);
    
    // Reset states when src changes
    setIsLoaded(false);
    setHasError(false);
    
    // Check if image is from external source or local
    setIsLocal(!src.startsWith('http'));
  }, [src]);

  const handleError = () => {
    console.warn(`Image failed to load: ${src}`);
    setHasError(true);
    
    // If the image is SVG and failed to load, try with relative path for Vercel
    if (src.endsWith('.svg') && isLocal) {
      setImgSrc(createPublicImageUrl(src));
    } else {
      // Fallback to a placeholder image if all else fails
      setImgSrc('/icons/image-placeholder.svg');
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  // For external images or after SVG fallback, use a standard img tag with error handling
  if (!isLocal || hasError) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  // For local images, use Next.js Image component
  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width || 100}
      height={height || 100}
      className={className}
      priority={priority}
      onError={handleError}
      onLoad={handleLoad}
      unoptimized={src.endsWith('.svg')}
    />
  );
} 