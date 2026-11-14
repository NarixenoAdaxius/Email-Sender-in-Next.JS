"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  style,
  priority = false,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [isLocal, setIsLocal] = useState<boolean>(!src.startsWith("http"));
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setIsLocal(!src.startsWith("http"));
  }, [src]);

  const handleError = () => {
    setHasError(true);
    if (src.includes("logo")) {
      setImgSrc("/logo.svg");
    } else {
      setImgSrc("/icons/image-placeholder.svg");
    }
  };

  if (!isLocal || hasError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width || 100}
      height={height || 100}
      className={className}
      style={style}
      priority={priority}
      onError={handleError}
      unoptimized={src.endsWith(".svg")}
    />
  );
}
