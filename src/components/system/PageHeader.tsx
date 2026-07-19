import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  /** Show a back chevron that navigates(-1). */
  back?: boolean;
  /** Optional right-side action node. */
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, back = false, action, className }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "sticky top-0 z-10 bg-background/90 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-md items-center gap-1 px-4">
        {back && (
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="-ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92]"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-title text-foreground">
          {title}
        </h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
