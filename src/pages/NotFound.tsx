import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-8 text-center shadow-card">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Compass className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-display-md text-foreground">404</h1>
        <p className="mt-1 text-heading text-foreground">This page doesn't exist</p>
        <p className="mt-2 text-body text-muted-foreground">
          The link may be old or mistyped. Head back to today's log.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 min-w-[44px] items-center justify-center rounded-control bg-primary px-6 text-label text-primary-foreground transition-transform duration-instant active:scale-[0.92]"
        >
          Back to Today
        </Link>
      </div>
    </div>
  );
}
