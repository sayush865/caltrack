import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SurfaceProps = HTMLAttributes<HTMLDivElement>;

/** The ONE card treatment: rounded-card + hairline border + paper sheet, no shadow. */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-border bg-card",
        className,
      )}

      {...props}
    />
  ),
);
Surface.displayName = "Surface";
