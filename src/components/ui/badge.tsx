import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "primary", ...props }: BadgeProps) {
  const variantStyles = {
    primary: "bg-primary-50 text-primary-700 border border-primary-200",
    secondary: "bg-neutral-100 text-neutral-700 border border-neutral-200",
    success: "bg-success-50 text-success-700 border border-success-200",
    warning: "bg-warning-50 text-warning-700 border border-warning-200",
    danger: "bg-danger-50 text-danger-700 border border-danger-200",
    outline: "bg-white text-neutral-700 border border-neutral-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
