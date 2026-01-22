import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 hover:scale-[1.02] premium-button-hover",
        destructive: "bg-gradient-to-br from-destructive via-destructive to-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/40 hover:-translate-y-0.5 hover:scale-[1.02]",
        outline: "border-2 border-input bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-md",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        premium: "bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-0.5 hover:scale-[1.02] premium-button-hover",
      },
      size: {
        default: "h-11 px-5 py-2.5 text-sm",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
