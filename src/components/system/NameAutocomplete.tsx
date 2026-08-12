// NameAutocomplete — a text field that inline-completes from the user's own
// history. The best prefix match renders as ghost text after the caret; Tab or
// → accepts it. Remaining matches list below the field, tap to fill.
//
// Layout note: the ghost layer mirrors the input's font + padding exactly, so
// keep the two class strings in sync when restyling.

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { matchNames } from "@/hooks/useNameSuggestions";

export interface NameSuggestion {
  name: string;
  uses: number;
}

interface NameAutocompleteProps<T extends NameSuggestion> {
  value: string;
  onChange: (value: string) => void;
  suggestions: T[];
  /** Called when a suggestion is accepted (ghost or tap) — use it to prefill numbers. */
  onPick?: (suggestion: T) => void;
  placeholder?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Secondary text on each list row, e.g. "220 kcal". */
  renderMeta?: (suggestion: T) => string | null;
}

const FIELD =
  "h-11 w-full rounded-control border border-input bg-card px-3 text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function NameAutocomplete<T extends NameSuggestion>({
  value,
  onChange,
  suggestions,
  onPick,
  placeholder,
  autoFocus,
  ariaLabel,
  className,
  renderMeta,
}: NameAutocompleteProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const matches = useMemo(
    () => (value.trim().length === 0 ? [] : matchNames(suggestions, value, 6)),
    [suggestions, value],
  );

  // Ghost completion only for a real prefix match — never rewrite typed chars.
  const ghost = useMemo(() => {
    if (value.length === 0) return null;
    const hit = matches.find((m) => m.name.toLowerCase().startsWith(value.toLowerCase()));
    if (!hit) return null;
    return { suggestion: hit, suffix: hit.name.slice(value.length) };
  }, [matches, value]);

  const accept = (suggestion: T) => {
    onChange(suggestion.name);
    onPick?.(suggestion);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!ghost) return;
    const el = e.currentTarget;
    const atEnd = el.selectionStart === value.length && el.selectionEnd === value.length;
    if (e.key === "Tab" || (e.key === "ArrowRight" && atEnd) || (e.key === "Enter" && atEnd)) {
      e.preventDefault();
      accept(ghost.suggestion);
    }
  };

  const showList = focused && matches.length > 0;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {/* Ghost layer: mirrors the field metrics, sits under the transparent input */}
        {ghost && ghost.suffix.length > 0 && (
          <div
            aria-hidden="true"
            className={cn(FIELD, "pointer-events-none absolute inset-0 flex items-center border-transparent bg-transparent")}
          >
            <span className="truncate whitespace-pre">
              <span className="invisible">{value}</span>
              <span className="text-muted-foreground">{ghost.suffix}</span>
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          autoComplete="off"
          autoCapitalize="sentences"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          className={cn(FIELD, "relative bg-transparent")}
        />
      </div>

      {ghost && ghost.suffix.length > 0 && (
        <p className="mt-1 text-micro text-muted-foreground">Press Tab to complete</p>
      )}

      {showList && (
        <ul className="mt-1.5 max-h-52 overflow-y-auto rounded-card border border-border bg-card divide-y divide-border">
          {matches.map((m) => {
            const meta = renderMeta?.(m);
            return (
              <li key={m.name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => accept(m)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-instant active:bg-card-hover"
                >
                  <span className="min-w-0 truncate text-body text-foreground">{m.name}</span>
                  {meta && (
                    <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{meta}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default NameAutocomplete;
