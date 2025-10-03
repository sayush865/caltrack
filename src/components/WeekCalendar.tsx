import { format, startOfWeek, addDays, addWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface WeekCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function WeekCalendar({ selectedDate, onDateSelect }: WeekCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  
  const today = new Date();
  const currentWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setWeekOffset(weekOffset - 1)}
        className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
      >
        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
      
      <div className="flex gap-0.5 sm:gap-1 overflow-hidden flex-1 justify-between">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`flex flex-col items-center justify-center min-w-[40px] h-12 sm:min-w-[48px] sm:h-14 md:h-16 rounded-lg sm:rounded-xl transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                  ? 'bg-muted border-2 border-primary'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <div className="text-[9px] sm:text-[10px] font-medium uppercase">{format(day, 'EEE')}</div>
              <div className="text-base sm:text-lg md:text-xl font-bold mt-0.5">{format(day, 'd')}</div>
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setWeekOffset(weekOffset + 1)}
        className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
      >
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
}
