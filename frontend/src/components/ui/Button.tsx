"use client";

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      intent: {
        primary:
          "bg-primary text-primaryFg hover:bg-primary/90 focus-visible:ring-primary",
        secondary:
          "bg-surface text-fg border border-border hover:bg-surface/80 focus-visible:ring-border",
        outline:
          "bg-transparent text-fg border border-border hover:bg-surface focus-visible:ring-border",
        ghost:
          "bg-transparent text-fg hover:bg-surface focus-visible:ring-border",
        danger:
          "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger",
      },
      size: {
        sm: "h-8 px-3 py-1 rounded",
        md: "h-9 px-4 py-2 rounded-md",
        lg: "h-11 px-6 py-3 rounded-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, intent, size, fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ intent, size, fullWidth }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

