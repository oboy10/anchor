import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_14px_34px_rgba(25,128,127,0.24)] hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_18px_42px_rgba(25,128,127,0.28)]",
  secondary:
    "liquid-glass-subtle text-ink hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/55",
  ghost: "text-ink hover:bg-white/45",
  danger:
    "bg-surface text-danger border border-danger/30 hover:-translate-y-0.5 hover:bg-danger-soft",
};

// Comfortable touch targets: md is 44px tall.
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
};

export function buttonVariants(variant: Variant = "primary", size: Size = "md") {
  return cn(base, variants[variant], sizes[size]);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "primary", size = "md", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants(variant, size), className)}
        {...props}
      />
    );
  },
);
