import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:shadow-md hover:shadow-primary/30 hover:scale-105",
        secondary: "border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:shadow-md",
        destructive: "border-transparent bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground hover:shadow-md hover:shadow-destructive/30 hover:scale-105",
        outline: "border-2 border-border/50 bg-background/50 text-foreground hover:bg-accent hover:border-primary/50 hover:shadow-sm",
        success: "border-transparent bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-md hover:shadow-emerald-500/30 hover:scale-105",
        warning: "border-transparent bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:shadow-md hover:shadow-amber-500/30 hover:scale-105",
        info: "border-transparent bg-gradient-to-br from-cyan-500 to-cyan-600 text-white hover:shadow-md hover:shadow-cyan-500/30 hover:scale-105",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
