import {
  ArrowLeft,
  Gauge,
  Heart,
  MapPin,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const motivationalQuotes = [
  "You're doing amazing! Keep pushing!",
  "Every step counts. You've got this!",
  "Champions are made when no one is watching!",
  "Feel the burn, embrace the strength!",
  "You're faster than you think!",
  "This is where legends are made!",
  "Push through - greatness awaits!",
];

interface LiveSessionProps {
  initialHeartRate?: number;
  heartRate?: number;
  onHeartRateUpdate?: (bpm: number) => void;
  onRegisterHeartRateUpdate?: (callback: (bpm: number) => void) => void;
  onFinish: () => void;
  onBack: () => void;
}

export function LiveSession({
  initialHeartRate = 0,
  heartRate: externalHeartRate,
  onHeartRateUpdate,
  onRegisterHeartRateUpdate,
  onFinish,
  onBack,
}: LiveSessionProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [internalHeartRate, setInternalHeartRate] = useState(
    initialHeartRate || 142,
  );
  const [hasBluetooth, setHasBluetooth] = useState(initialHeartRate > 0);

  const heartRate =
    externalHeartRate !== undefined ? externalHeartRate : internalHeartRate;
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [quote] = useState(
    () =>
      motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)],
  );

  // Timer effect
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      // Only simulate stats if no Bluetooth connected
      if (!hasBluetooth) {
        setInternalHeartRate((prev: number) =>
          Math.min(
            180,
            Math.max(120, prev + Math.floor(Math.random() * 5) - 2),
          ),
        );
      }
      setDistance((prev) => prev + Math.random() * 0.01);
      setSpeed((prev) => Math.max(0, 10 + Math.random() * 5));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, hasBluetooth]);

  // Sync Bluetooth heart rate updates
  useEffect(() => {
    if (externalHeartRate !== undefined) {
      setHasBluetooth(true);
    }
  }, [externalHeartRate]);

  // Register heart rate update callback when Bluetooth connected
  useEffect(() => {
    if (initialHeartRate > 0 && onRegisterHeartRateUpdate) {
      onRegisterHeartRateUpdate(setInternalHeartRate);
    }
  }, [initialHeartRate, onRegisterHeartRateUpdate]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getHeartRateZone = (hr: number) => {
    if (hr < 120)
      return { zone: 1, label: "ZONE 1", color: "bg-blue-500", width: "20%" };
    if (hr < 140)
      return { zone: 2, label: "ZONE 2", color: "bg-green-500", width: "40%" };
    if (hr < 155)
      return { zone: 3, label: "ZONE 3", color: "bg-yellow-500", width: "60%" };
    if (hr < 170)
      return { zone: 4, label: "ZONE 4", color: "bg-orange-500", width: "80%" };
    return { zone: 5, label: "ZONE 5", color: "bg-red-500", width: "100%" };
  };

  const hrZone = getHeartRateZone(heartRate);

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
        <h1 className="text-xl font-bold text-foreground tracking-wide">
          LIVE SESSION
        </h1>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 space-y-4">
        {/* Motivational quote with mascot */}
        <div className="bg-card rounded-xl p-4 flex items-center gap-3">
          <img
            src="/images/live-session-mascot.webp"
            alt="Cheetah mascot"
            className="w-14 h-14 object-contain flex-shrink-0"
          />
          <div className="bg-secondary rounded-xl rounded-tl-none px-4 py-3 flex-1">
            <p className="text-foreground text-sm">{quote}</p>
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-card rounded-xl p-6 space-y-6">
          {/* Elapsed time */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Elapsed Time
            </p>
            <p className="text-5xl font-bold text-foreground tracking-wider">
              {formatTime(elapsedSeconds)}
            </p>
          </div>

          {/* Heart rate */}
          <div className="bg-secondary rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
              <span className="text-3xl font-bold text-foreground">
                {heartRate}
              </span>
            </div>
            {/* <div className="h-2 bg-muted rounded-full overflow-hidden"> */}
            {/*   <div */}
            {/*     className={`h-full ${hrZone.color} transition-all duration-500`} */}
            {/*     style={{ width: hrZone.width }} */}
            {/*   /> */}
            {/* </div> */}
            {/* <p className="text-center text-orange-500 font-semibold text-sm tracking-wider"> */}
            {/*   {hrZone.label} */}
            {/* </p> */}
          </div>
        </div>

        {/* Distance and Speed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 text-center">
            <MapPin className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {distance.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground uppercase">KM</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <Gauge className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {speed.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground uppercase">KM/H</p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold py-4 rounded-xl transition-colors"
          >
            {isPaused ? (
              <>
                <Play className="h-5 w-5" />
                RESUME
              </>
            ) : (
              <>
                <Pause className="h-5 w-5" />
                PAUSE
              </>
            )}
          </button>
          <button
            onClick={onFinish}
            className="flex items-center justify-center gap-2 bg-destructive/20 hover:bg-destructive/30 text-destructive font-semibold py-4 rounded-xl transition-colors"
          >
            <Square className="h-4 w-4 fill-current" />
            FINISH
          </button>
        </div>
      </main>
    </div>
  );
}
