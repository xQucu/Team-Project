import { Calendar, Check, ChevronRight } from "lucide-react";
import { useMemo } from "react";

interface TrainingDay {
  date: string; // YYYY-MM-DD
  type: "workout" | "rest" | "completed";
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
    return date.toISOString().split("T")[0];
  };

  const days = useMemo(() => {
    const today = new Date();
    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const result: DayInfo[] = [];

    // Get the Monday of current week
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

    // Generate 14 days (2 weeks)
    for (let i = 0; i < 14; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateKey = formatDateKey(date);
      const training = trainingData.find((t) => t.date === dateKey);

      result.push({
        date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        isToday:
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
        isPast: date < today && !result[result.length - 1]?.isToday,
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
