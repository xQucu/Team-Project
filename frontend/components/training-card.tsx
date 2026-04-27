import { Check, Clock, Footprints, Moon, Play } from "lucide-react";

interface TrainingInfo {
  type: "workout" | "rest" | "none" | "completed";
  title?: string;
  description?: string;
  duration?: string;
  exercises?: string[];
}

interface TrainingCardProps {
  training: TrainingInfo;
  mascotImage?: string;
  selectedDate?: Date;
  onStartTraining?: () => void;
}

export function TrainingCard({
  training,
  mascotImage,
  selectedDate,
  onStartTraining,
}: TrainingCardProps) {
  const isToday = selectedDate
    ? selectedDate.toDateString() === new Date().toDateString()
    : true;

  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "Today";

  if (training.type === "none") {
    return (
      <div className="bg-card rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-3">{dateLabel}</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
            <Footprints className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">
              No training plan set
            </p>
            <p className="text-xs text-muted-foreground/70">
              Start a chat to create your plan
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (training.type === "rest") {
    return (
      <div className="bg-card rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-3">{dateLabel}</p>
        <div className="flex items-center gap-4">
          {mascotImage ? (
            <img
              src={mascotImage}
              alt="Rest day"
              className="w-12 h-12 object-contain"
            />
          ) : (
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
              <Moon className="h-6 w-6 text-blue-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-foreground font-medium">Rest Day</p>
            <p className="text-xs text-muted-foreground">
              Recovery is important for progress
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (training.type === "completed") {
    return (
      <div className="bg-card rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-3">{dateLabel}</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-foreground font-medium">{training.title}</p>
            <p className="text-xs text-primary">Completed</p>
            {training.duration && (
              <p className="text-xs text-muted-foreground mt-1">
                {training.duration}
              </p>
            )}
          </div>
        </div>
        {training.exercises && training.exercises.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Exercises:</p>
            <ul className="space-y-1">
              {training.exercises.map((exercise, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground flex items-center gap-2"
                >
                  <Check className="h-3 w-3 text-primary" />
                  {exercise}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Workout type
  return (
    <div className="bg-card rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-3">{dateLabel}</p>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
          <Footprints className="h-6 w-6 text-orange-500" />
        </div>
        <div className="flex-1">
          <p className="text-foreground font-medium">{training.title}</p>
          <p className="text-xs text-muted-foreground">
            {training.description}
          </p>
          {training.duration && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {training.duration}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Exercise list */}
      {training.exercises && training.exercises.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Exercises:</p>
          <ul className="space-y-1">
            {training.exercises.map((exercise, i) => (
              <li
                key={i}
                className="text-sm text-foreground flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                {exercise}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Start training button - only show for today */}
      {isToday && onStartTraining && (
        <button
          onClick={onStartTraining}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
        >
          <Play className="h-5 w-5 fill-current" />
          Start Training
        </button>
      )}
    </div>
  );
}
