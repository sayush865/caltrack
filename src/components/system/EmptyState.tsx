import { Check, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  headline: string;
  copy: string;
  action?: { label: string; onClick: () => void };
  /** Success tones + Check icon — for "all logged" style states. */
  celebratory?: boolean;
  className?: string;
}

/**
 * Every empty state is an activation CTA — components must never return null
 * when empty (Hard rule 8).
 */
export function EmptyState({
  icon,
  headline,
  copy,
  action,
  celebratory = false,
  className,
}: EmptyStateProps) {
  const Icon = celebratory ? Check : icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-10 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "grid h-24 w-24 place-items-center rounded-full",
          celebratory ? "bg-success-soft" : "bg-primary-soft",
        )}
      >
        <Icon
          className={cn(
            "h-10 w-10",
            celebratory ? "text-success" : "text-primary",
          )}
          strokeWidth={1.75}
        />
      </div>
      <h3 className="mt-4 text-heading text-foreground">{headline}</h3>
      <p className="mt-1 text-body text-muted-foreground">{copy}</p>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5 min-h-11 rounded-control px-6 transition-transform duration-instant active:scale-[0.92]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
