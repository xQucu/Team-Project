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

interface LiveSessionProps {
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
}: LiveSessionProps) {
  const [isPaused, setIsPaused] = useState(initialIsPaused);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [internalHeartRate, setInternalHeartRate] = useState(
    initialHeartRate || 142,
  );
  const [hasBluetooth, setHasBluetooth] = useState(initialHeartRate > 0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [inputText, setInputText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  const heartRate =
    externalHeartRate !== undefined ? externalHeartRate : internalHeartRate;
  //const heartRate = 150
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
              <div className="flex items-center justify-center gap-2">
                <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                <span className="text-3xl font-bold text-foreground">
                  {heartRate}
                </span>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-destructive text-sm">Could not read heart rate</p>
                <p className="text-2xl font-bold text-muted-foreground">--</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-1">
              {hrZone.zone > 1 ? (
                <img
                  src={`/images/zone-${hrZone.zone - 1}.png`}
                  alt={`Zone ${hrZone.zone - 1}`}
                  className="w-1/4 h-auto object-contain opacity-70 scale-90 origin-right"
                />
              ) : (
                <div className="w-1/4 flex-shrink-0" />
              )}
              <img
                src={`/images/zone-${hrZone.zone}.png`}
                alt={hrZone.label}
                className="w-1/2 h-auto object-contain"
              />
              {hrZone.zone < 5 ? (
                <img
                  src={`/images/zone-${hrZone.zone + 1}.png`}
                  alt={`Zone ${hrZone.zone + 1}`}
                  className="w-1/4 h-auto object-contain opacity-70 scale-90 origin-left"
                />
              ) : (
                <div className="w-1/4 flex-shrink-0" />
              )}
            </div>
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