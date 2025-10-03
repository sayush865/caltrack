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
  const currentWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setWeekOffset(weekOffset - 1)}
        className="h-8 w-8 shrink-0 hover:bg-accent"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex gap-1.5 flex-1 overflow-x-auto">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`
                flex flex-col items-center justify-center 
                flex-1 min-w-[48px] h-16 
                rounded-lg
                transition-all duration-200
                ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : isToday
                    ? 'bg-secondary border-2 border-foreground'
                    : 'bg-muted hover:bg-accent'
                }
              `}
            >
              <div className={`text-[10px] font-medium uppercase tracking-wider ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {format(day, 'EEE')}
              </div>
              <div className="text-xl font-semibold mt-0.5">
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
        className="h-8 w-8 shrink-0 hover:bg-accent"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
