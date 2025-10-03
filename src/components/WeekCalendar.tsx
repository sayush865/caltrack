import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isSameDay } from 'date-fns';

interface WeekCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function WeekCalendar({ selectedDate, onDateSelect }: WeekCalendarProps) {
  const today = new Date();
  const lastMonth = subMonths(today, 1);
  const startDate = startOfMonth(lastMonth);
  const endDate = endOfMonth(today);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        
        return (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            className={`flex flex-col items-center justify-center min-w-[60px] h-20 rounded-2xl transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : isToday
                ? 'bg-muted border-2 border-primary'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <div className="text-xs font-medium">{format(day, 'EEE')}</div>
            <div className="text-2xl font-bold mt-1">{format(day, 'd')}</div>
          </button>
        );
      })}
    </div>
  );
}
