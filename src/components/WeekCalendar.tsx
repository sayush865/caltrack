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
  const currentWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="flex items-center gap-2 px-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setWeekOffset(weekOffset - 1)}
        className="h-9 w-9 shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex gap-1.5 sm:gap-2 overflow-hidden flex-1 justify-between">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`
                flex flex-col items-center justify-center 
                min-w-[44px] h-14 sm:min-w-[52px] sm:h-16 md:min-w-[60px] md:h-18
                rounded-xl sm:rounded-2xl
                transition-all duration-300 ease-out
                relative overflow-hidden
                ${
                  isSelected
                    ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg scale-105 shadow-primary/30'
                    : isToday
                    ? 'bg-gradient-to-br from-secondary/20 to-accent/20 border-2 border-primary shadow-md'
                    : 'bg-card hover:bg-muted/60 hover:scale-105 shadow-sm'
                }
              `}
            >
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              )}
              <div className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide relative z-10 ${isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg sm:text-xl md:text-2xl font-bold mt-0.5 relative z-10 ${isSelected ? 'text-primary-foreground' : ''}`}>
                {format(day, 'd')}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setWeekOffset(weekOffset + 1)}
        className="h-9 w-9 shrink-0 hover:bg-primary/10 hover:text-primary transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
