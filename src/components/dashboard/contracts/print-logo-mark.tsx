"use client";

import { useState } from "react";

type PrintLogoMarkProps = {
  logoUrl?: string | null;
  monogram: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
};

export function PrintLogoMark({
  logoUrl,
  monogram,
  alt = "لوگوی تالار",
  className = "print-logo-circle",
  fallbackClassName = "print-monogram",
  imageClassName = "print-hall-logo",
}: PrintLogoMarkProps) {
  const [failed, setFailed] = useState(false);
  const canShowLogo = Boolean(logoUrl && !failed);

  return (
    <div className={className} aria-label="نشان تالار">
      {canShowLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl ?? undefined}
          alt={alt}
          className={imageClassName}
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <div className={fallbackClassName} aria-hidden="true">
          {monogram}
        </div>
      )}
    </div>
  );
}
