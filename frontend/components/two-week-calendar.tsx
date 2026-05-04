import { Calendar, Check, ChevronRight } from "lucide-react";
import { useMemo } from "react";

interface TrainingDay {
  id?: number;
  date: string; // YYYY-MM-DD
  type: "workout" | "rest" | "completed" | "none";
  title?: string;
  description?: string;
  duration?: string;
}

interface DayInfo {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  training?: TrainingDay;
}

interface TwoWeekCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onViewAll?: () => void;
  trainingData?: TrainingDay[];
}

export function TwoWeekCalendar({
  selectedDate,
  onDateSelect,
  onViewAll,
  trainingData = [],
}: TwoWeekCalendarProps) {
  const formatDateKey = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start from Monday of current week
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const result: DayInfo[] = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateKey = formatDateKey(date);
      const training = trainingData.find((t) => t.date === dateKey);

      const isTodayDate = date.getTime() === today.getTime();

      result.push({
        date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        isToday: isTodayDate,
        isPast: date.getTime() < today.getTime(),
        training,
      });
    }

    return result;
  }, [trainingData]);

  const week1 = days.slice(0, 7);
  const week2 = days.slice(7, 14);

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const DayCell = ({ day }: { day: DayInfo }) => (
    <button
      onClick={() => onDateSelect?.(day.date)}
      className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all relative ${
        day.isToday
          ? "bg-primary text-primary-foreground"
          : isSelected(day.date)
            ? "bg-secondary text-foreground ring-2 ring-primary"
            : "bg-secondary/50 text-foreground hover:bg-secondary"
      }`}
    >
      <span className="text-[9px] font-medium opacity-80">{day.dayName}</span>
      <span className="text-base font-bold">{day.dayNumber}</span>

      {/* Training indicator */}
      {day.training && (
        <div className="absolute -bottom-0.5">
          {day.training.type === "completed" ? (
            <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-2 w-2 text-primary-foreground" />
            </div>
          ) : day.training.type === "workout" ? (
            <div className="w-1.5 h-1.5 my-1 rounded-full bg-orange-500" />
          ) : (
            <div className="w-1.5 h-1.5 my-1 rounded-full bg-blue-400" />
          )}
        </div>
      )}
    </button>
  );

  return (
    <div className="bg-card rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium tracking-wide">
            2-WEEK SCHEDULE
          </span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Week 1 */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {week1.map((day, i) => (
          <DayCell key={i} day={day} />
        ))}
      </div>

      {/* Week 2 */}
      <div className="grid grid-cols-7 gap-1.5">
        {week2.map((day, i) => (
          <DayCell key={i} day={day} />
        ))}
      </div>
    </div>
  );
}
