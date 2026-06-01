import { speakText } from "@/lib/speech";
import {
  Gauge,
  Heart,
  MapPin,
  Pause,
  Play,
  Square,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";

const motivationalQuotes = [
  "You're doing amazing! Keep pushing!",
  "Every step counts. You've got this!",
  "Champions are made when no one is watching!",
  "Feel the burn, embrace the strength!",
  "You're faster than you think!",
  "This is where legends are made!",
  "Push through - greatness awaits!",
];

interface WorkoutSection {
  text: string;
  time?: string;
  seconds?: number;
}

const parseSectionTime = (section: string): number | undefined => {
  const lower = section.toLowerCase();
  const match = lower.match(/(\d+)\s*(min|minute|minutes|sec|second|seconds)/i);
  if (!match) return undefined;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("min")) return value * 60;
  return value;
};

const splitWorkoutDescription = (description: string) => {
  const normalized = description.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const byLines = normalized
    .split(/\n+|;\s*/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (byLines.length > 1) {
    return byLines;
  }

  const lower = normalized.toLowerCase();
  if (lower.includes(" then ")) {
    return normalized
      .split(/\bthen\b/i)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }

  if (lower.includes(" after ")) {
    return normalized
      .split(/\bafter\b/i)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return sentences.length > 1 ? sentences : [normalized];
};

const buildWorkoutSpeech = (sections: WorkoutSection[]) => {
  if (sections.length === 0) return "";
  if (sections.length === 1) {
    const durationText = sections[0].time ? ` for ${sections[0].time}` : "";
    return `${sections[0].text}${durationText}`;
  }

  return sections
    .map((section, index) => {
      const durationText = section.time ? ` for ${section.time}` : " for a short while";
      if (index === 0) return `Start with ${section.text}${durationText}`;
      if (index === sections.length - 1) return `Finally, ${section.text}${durationText}`;
      return `After ${sections[index - 1]?.time ?? "a few minutes"}, switch to ${section.text}${durationText}`;
    })
    .join(". ");
};

const buildWorkoutSections = async (description: string): Promise<WorkoutSection[]> => {
  if (!description.trim()) return [];

  const prompt = `Parse this workout description into distinct exercise phases. For each phase, extract the exercise name/activity and duration.

Workout Description: "${description}"

Return a JSON array with objects having:
- "name": the exercise name or activity (string)
- "duration": the time duration like "5 min", "30 sec", or "10 minutes" (string)

If no duration is specified for a phase, omit the duration field.
Return ONLY valid JSON array, no other text. Example: [{"name": "warm-up jog", "duration": "5 min"}, {"name": "sprints", "duration": "10 min"}]`;

  try {
    const response = await fetch("/api/auth/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: prompt,
        history: []
      }),
      credentials: "include",
    });

    if (!response.ok) {
      console.error("Failed to fetch workout sections from API");
      return [];
    }

    const data = await response.json();
    let jsonStr = data.reply?.trim() || "";
    
    // Extract JSON if it's wrapped in markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => {
      const seconds = parseSectionTime(item.duration || "");
      const timeStr = seconds 
        ? `${Math.floor(seconds / 60) > 0 ? `${Math.floor(seconds / 60)} min` : `${seconds} sec`}`
        : undefined;

      return {
        text: item.name || "",
        time: timeStr,
        seconds,
      };
    }).filter((s: WorkoutSection) => s.text);
  } catch (error) {
    console.error("Error parsing workout sections with AI:", error);
    return [];
  }
};


interface LiveSessionProps {
  workoutId?: number;
  training?: {
    id?: number;
    date?: string;
    type: "workout" | "rest" | "completed" | "none";
    title?: string;
    description?: string;
    duration?: string;
  };
  initialHeartRate?: number;
  heartRate?: number;
  speed?: number;
  distance?: number;
  initialElapsedSeconds?: number;
  initialIsPaused?: boolean;
  onPauseChange?: (isPaused: boolean) => void;
  onElapsedChange?: (seconds: number) => void;
  onHeartRateUpdate?: (bpm: number) => void;
  onRegisterHeartRateUpdate?: (callback: (bpm: number) => void) => void;
  onFinish: () => void;
}

export function LiveSession({
  initialHeartRate = 0,
  heartRate: externalHeartRate,
  speed: externalSpeed,
  distance: externalDistance,
  initialElapsedSeconds = 0,
  initialIsPaused = false,
  onPauseChange,
  onElapsedChange,
  onHeartRateUpdate,
  onRegisterHeartRateUpdate,
  onFinish,
  workoutId: propWorkoutId,
  training: propTraining,
}: LiveSessionProps) {
  const [isPaused, setIsPaused] = useState(initialIsPaused);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [internalHeartRate, setInternalHeartRate] = useState(
    initialHeartRate || 142,
  );
  const [hasBluetooth, setHasBluetooth] = useState(initialHeartRate > 0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [workoutSections, setWorkoutSections] = useState<WorkoutSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [inputText, setInputText] = useState("");
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<any>(null);
  const sectionEndTimesRef = useRef<number[]>([]);
  const nextSectionAnnouncedRef = useRef<number>(1);
  const trainingCompleteRef = useRef<boolean>(false);

  const heartRate =
    externalHeartRate !== undefined ? externalHeartRate : internalHeartRate;
  const distance = externalDistance ?? 0;
  const speed = externalSpeed ?? 0;
  const [quote] = useState(
    () =>
      motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)],
  );

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInputText(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthesisRef.current = window.speechSynthesis;
    }
  }, []);

  // On mount: fetch workout plan from persisted training state and speak it
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initializeWorkout = async () => {
      try {
        console.log("Live session mounted with props:", { propWorkoutId, propTraining });
        // If parent provided `training`, use it (construction similar to home-screen)
        if (propTraining) {
          const sections = await buildWorkoutSections(propTraining.description || propTraining.title || "");
          // persist sections to state so other effects can use them
          setWorkoutSections(sections);
          console.log("Live session workoutSections initialized:", sections);

          const textToSpeak = sections.length
          ? `Today's workout: ${buildWorkoutSpeech(sections)}`
          : "You have a workout scheduled for today.";
          console.log("Speaking workout plan:", textToSpeak);
          setIsSpeaking(true);
          speakText(
            textToSpeak,
            () => setIsSpeaking(true),
            () => setIsSpeaking(false),
            (err) => {},
          );
          return;
        }
      } catch (error) {
        console.error("Error initializing live session:", error);
      }
    };

    initializeWorkout();
  }, [propTraining]);

  // Start/Stop Listening
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Send message to /chat endpoint
  const [history, setHistory] = useState<{sender: "user" | "assistant"; content: string}[]>([]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    
    setInputText("");

    try {
      const response = await fetch("/api/auth/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: inputText,
          history: history
        }),
        credentials: "include",
      });
      const data = await response.json();
    
      console.log(data.reply);
      setHistory(prev => [
        ...prev,
        {sender: 'user', content: inputText},
        {sender: 'assistant', content: data.reply}
      ])
      // Speak the response
      speakText(data.reply);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [inputText]);

  // Timer effect
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const newValue = prev + 1;
        onElapsedChange?.(newValue);
        return newValue;
      });
      if (!hasBluetooth) {
        setInternalHeartRate((prev: number) =>
          Math.min(
            180,
            Math.max(120, prev + Math.floor(Math.random() * 5) - 2),
          ),
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, hasBluetooth, workoutSections, onElapsedChange]);

  // Compute cumulative end times for sections (seconds)
  useEffect(() => {
    if (workoutSections.length === 0) {
      sectionEndTimesRef.current = [];
      trainingCompleteRef.current = false;
      return;
    }

    const endTimes: number[] = [];
    let acc = 0;
    for (const s of workoutSections) {
      if (s.seconds === undefined) {
        // If a section has no defined seconds, mark remaining as infinite
        endTimes.push(Number.POSITIVE_INFINITY);
        break;
      }
      acc += s.seconds;
      endTimes.push(acc);
    }
    sectionEndTimesRef.current = endTimes;
    trainingCompleteRef.current = false;
  }, [workoutSections]);

  // Update current section when elapsedSeconds crosses boundaries and announce change
  useEffect(() => {
    const endTimes = sectionEndTimesRef.current;
    if (!endTimes || endTimes.length === 0) return;

    let idx = endTimes.findIndex((t) => elapsedSeconds < t);
    if (idx === -1) idx = workoutSections.length - 1;

    if (idx !== currentSectionIndex) {
      setCurrentSectionIndex(idx);
      const section = workoutSections[idx];
      try {
        const announcement = `Now: ${section.text}`;
        console.log("Section changed ->", idx, section.text);
        // speak the section name
        speakText(announcement);
      } catch (err) {
        console.error("Error announcing section change", err);
      }
    }
    // If we've passed the last defined end time, announce completion once
    const lastEnd = endTimes[endTimes.length - 1];
    if (Number.isFinite(lastEnd) && elapsedSeconds >= lastEnd && !trainingCompleteRef.current) {
      trainingCompleteRef.current = true;
      try {
        console.log("Training complete");
        speakText("Training complete. Great job!");
      } catch (err) {
        console.error("Error announcing training completion", err);
      }
    }
  }, [elapsedSeconds, workoutSections, currentSectionIndex]);

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
      <header className="flex items-center justify-center p-4 border-b border-border">
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

        {workoutSections.length > 0 && (
          <div className="bg-card rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Current phase
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                {currentSectionIndex + 1} of {workoutSections.length}
              </h2>
            </div>
            <div className="space-y-3 text-sm text-foreground">
              {(() => {
                const section = workoutSections[currentSectionIndex];
                const isLast = currentSectionIndex === workoutSections.length - 1;
                const durationText = section.time ? ` for ${section.time}` : " for a short while";
                const transitionText = isLast
                  ? section.time
                    ? `Finish strong for ${section.time}.`
                    : "Finish strong."
                  : `After this, switch to the next exercise.`;

                return (
                  <div className="bg-primary/5 rounded-xl p-3 space-y-1">
                    <div className="font-semibold">
                      {section.text}
                      {durationText}
                    </div>
                    <p className="text-xs text-muted-foreground">{transitionText}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Chat UI */}
        <div className="bg-card rounded-xl p-4 space-y-4">
         
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or speak..."
              className="flex-1 p-2 rounded-lg bg-secondary text-foreground"
            />
            <button
              onClick={toggleListening}
              className={`p-2 rounded-lg ${isListening ? "bg-red-500" : "bg-primary"}`}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              onClick={sendMessage}
              className="p-2 rounded-lg bg-primary"
            >
              <Volume2 className="h-5 w-5" />
            </button>
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
            {heartRate > 0 ? (
              <>
                <div className="flex items-center justify-center gap-2">
                  <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                  <span className="text-3xl font-bold text-foreground">
                    {heartRate}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-destructive text-sm">Could not read heart rate</p>
                <p className="text-2xl font-bold text-muted-foreground">--</p>
              </div>
            )}
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
            onClick={() => {
              setIsPaused(!isPaused);
              onPauseChange?.(!isPaused);
            }}
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