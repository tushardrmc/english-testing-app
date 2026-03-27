"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export default function BrandLogo({
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center py-1", className)}>
      <Image
        src="/educare-logo.webp"
        alt="EduCare English Test"
        width={512}
        height={180}
        priority={priority}
        className={cn("h-auto w-full", imageClassName)}
      />
    </div>
  );
}
