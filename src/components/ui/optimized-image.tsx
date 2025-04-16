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

  useEffect(() => {
    // Update image source if prop changes
    setImgSrc(src);
    
    // Check if image is from external source or local
    setIsLocal(!src.startsWith('http'));
  }, [src]);

  const handleError = () => {
    console.warn(`Image failed to load: ${src}`);
    // Fallback to a placeholder image if the original image fails to load
    setImgSrc('/icons/image-placeholder.svg');
  };

  // For external images, use a standard img tag with error handling
  if (!isLocal) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
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
    />
  );
} 