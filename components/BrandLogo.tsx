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
    <div className={cn("flex items-center", className)}>
      <Image
        src="/educare-logo.png"
        alt="EduCare English Test"
        width={791}
        height={335}
        priority={priority}
        className={cn("h-auto w-full", imageClassName)}
      />
    </div>
  );
}
