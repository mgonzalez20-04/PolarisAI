import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border-2 border-input bg-card/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-foreground",
          "ring-offset-background transition-all duration-300 ease-out",
          "file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground",
          "placeholder:text-muted-foreground placeholder:font-normal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:border-primary focus-visible:bg-card",
          "hover:border-primary/50 hover:bg-card/90",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-50",
          "shadow-sm focus-visible:shadow-md focus-visible:shadow-primary/10",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
