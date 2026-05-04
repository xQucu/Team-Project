import { TrainingCard } from "@/components/training-card";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Moon,
} from "lucide-react";
import { useMemo, useState } from "react";

interface TrainingDay {
  date: string; // YYYY-MM-DD
  type: "workout" | "rest" | "completed";
  title?: string;
  description?: string;
  duration?: string;
}

interface FullCalendarProps {
  onBack: () => void;
  onSelectDate: (date: Date) => void;
  trainingData: TrainingDay[];
}

export function FullCalendar({
  onBack,
  onSelectDate,
  trainingData,
}: FullCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    const startDay = firstDay.getDay();
    const mondayOffset = startDay === 0 ? 6 : startDay - 1;
    for (let i = 0; i < mondayOffset; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

const formatDateKey = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

  const getTrainingForDate = (date: Date): TrainingDay | undefined => {
    return trainingData.find((t) => t.date === formatDateKey(date));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const navigateMonth = (direction: number) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b border-border">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Training Calendar</h1>
      </header>

      {/* Month navigation */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 px-4 pb-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const training = getTrainingForDate(date);
            const today = isToday(date);
            const past = isPast(date);

            return (
              <button
                key={formatDateKey(date)}
                onClick={() => {
                  onSelectDate(date);
                  setSelectedDate(date);
                }}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-all relative ${
                  today
                    ? "bg-primary text-primary-foreground"
                    : selectedDate?.toDateString() === date.toDateString()
                      ? "ring-2 ring-primary"
                      : "bg-card hover:bg-secondary"
                }`}
              >
                <span
                  className={`text-sm font-medium ${past && !today ? "text-muted-foreground" : ""}`}
                >
                  {date.getDate()}
                </span>

                {/* Training indicator */}
                {training && (
                  <div className="absolute bottom-1">
                    {training.type === "completed" ? (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    ) : training.type === "workout" ? (
                      <Footprints className="h-3 w-3 text-orange-500" />
                    ) : (
                      <Moon className="h-3 w-3 text-blue-400" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <Footprints className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs text-muted-foreground">Workout</span>
          </div>
          <div className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-muted-foreground">Rest</span>
          </div>
        </div>

        {/* Selected training card */}
        {selectedDate && getTrainingForDate(selectedDate) && (
          <div className="p-4 pt-6">
            <TrainingCard
              training={getTrainingForDate(selectedDate)!}
              selectedDate={selectedDate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
