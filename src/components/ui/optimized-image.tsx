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

  useEffect(() => {
    // Special case for PaletteMail logo, which is problematic
    if (src.includes('PaletteMail') && src.endsWith('.svg')) {
      setImgSrc('/logo.svg');
    } else {
      setImgSrc(src);
    }
    
    // Reset states when src changes
    setIsLoaded(false);
    setHasError(false);
    
    // Check if image is from external source or local
    setIsLocal(!src.startsWith('http'));
  }, [src]);

  const handleError = () => {
    console.warn(`Image failed to load: ${imgSrc}`);
    setHasError(true);
    
    // Use fallback logo for any PaletteMail image that fails
    if (src.includes('PaletteMail')) {
      setImgSrc('/logo.svg');
    } else {
      // Fallback to a placeholder image if all else fails
      setImgSrc('/icons/image-placeholder.svg');
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  // For external images or after fallback, use a standard img tag with error handling
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