import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dayKey, friendlyDay, isFuture, localDayEnd, parseDayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface DayHeaderProps {
  dateKey: string;
  onChange: (dateKey: string) => void;
  className?: string;
}

function shiftDayKey(key: string, days: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** Diary date pager: left/right chevrons + friendlyDay with calendar popover. Future dates blocked. */
export function DayHeader({ dateKey, onChange, className }: DayHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const nextKey = shiftDayKey(dateKey, 1);
  const nextBlocked = isFuture(nextKey);

  return (
    <header className={cn("sticky top-0 z-10 bg-background/90 backdrop-blur", className)}>
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => onChange(shiftDayKey(dateKey, -1))}
          className="grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform duration-instant active:scale-[0.92]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-11 min-w-[44px] items-center gap-2 rounded-full px-4 transition-transform duration-instant active:scale-[0.97]"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-heading text-foreground">{friendlyDay(dateKey)}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-card border-border bg-card p-0 shadow-raised" align="center">
            <Calendar
              mode="single"
              selected={parseDayKey(dateKey)}
              defaultMonth={parseDayKey(dateKey)}
              disabled={(date) => date > localDayEnd()}
              onSelect={(date) => {
                if (!date) return;
                onChange(dayKey(date));
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <button
          type="button"
          aria-label="Next day"
          disabled={nextBlocked}
          onClick={() => onChange(nextKey)}
          className={cn(
            "grid h-11 w-11 place-items-center rounded-full transition-transform duration-instant",
            nextBlocked ? "text-text-disabled" : "text-foreground active:scale-[0.92]",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
