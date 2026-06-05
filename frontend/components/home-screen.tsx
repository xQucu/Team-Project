import { ChatInterface, Message } from "@/components/chat-interface";
import { EditWorkoutModal } from "@/components/EditWorkoutModal";
import { ProfileModal } from "@/components/ProfileModal";
import { FullCalendar } from "@/components/full-calendar";
import { LiveSession } from "@/components/live-session";
import { TrainingCard } from "@/components/training-card";
import { TwoWeekCalendar } from "@/components/two-week-calendar";
import { BluetoothConnect } from "@/components/bluetooth-connect";
import { ArrowLeft, LogOut, Menu, Settings, Sun, Moon, User, X, Download } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";

interface ProfileData {
  name: string;
  age: number | "";
  weight: number | "";
  height: number | "";
  fitness_goal: string;
  experience_level: string;
  training_days_per_week: number | "";
  injuries: string;
}

interface TrainingDay {
  id?: number;
  date: string;
  type: "workout" | "rest" | "completed" | "none";
  title?: string;
  description?: string;
  duration?: string;
  exercises?: string[];
}

interface HomeScreenProps {
  userName?: string;
  onLogout: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

// Helper to format date as DD.MM.YYYY for API matching
const formatDateKey = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Training session persistence
const TRAINING_STORAGE_KEY = "cheetahfit_training_session";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedTrainingState {
  isActive: boolean;
  isPaused: boolean;
  startTimestamp: number;
  pausedAt: number | null;
  pausedDuration: number;
  bluetoothDeviceId: string | null;
  gpsDistance: number;
  workoutId: number | null;
}

const saveTrainingState = (state: PersistedTrainingState) => {
  localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(state));
};

const loadTrainingState = (): PersistedTrainingState | null => {
  try {
    const stored = localStorage.getItem(TRAINING_STORAGE_KEY);
    if (!stored) return null;
    
    const state: PersistedTrainingState = JSON.parse(stored);
    
    // Check if session is stale (>24h old)
    if (state.isActive && state.startTimestamp) {
      const elapsed = Date.now() - state.startTimestamp;
      if (elapsed > SESSION_MAX_AGE_MS) {
        localStorage.removeItem(TRAINING_STORAGE_KEY);
        return null;
      }
    }
    
    return state;
  } catch {
    return null;
  }
};

const clearTrainingState = () => {
  localStorage.removeItem(TRAINING_STORAGE_KEY);
};

const loadWorkouts = async (setTrainingData: Dispatch<SetStateAction<TrainingDay[]>>) => {
  try {
    const res = await fetch("/api/auth/workouts/", { credentials: "include" });
    if (!res.ok) return;
    const workoutData = await res.json();
    const workouts = (workoutData.workouts || []).map((w: any) => ({
      id: w.id,
      date: w.date,
      type: w.status === "completed" ? "completed" : w.type === "rest" ? "rest" : "workout",
      title: w.type.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description: w.description,
      duration: w.duration,
    }));
    setTrainingData(workouts);
  } catch (err) {
    console.error("Failed to load workouts:", err);
  }
};

export function HomeScreen({ userName = "User", onLogout, theme = "dark", onToggleTheme }: HomeScreenProps) {
   const [selectedDate, setSelectedDate] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
  };
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isConnectingBluetooth, setIsConnectingBluetooth] = useState(false);
  const [bluetoothHeartRate, setBluetoothHeartRate] = useState(0);
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);
  const bluetoothDeviceRef = useRef<any>(null);
  const bluetoothHeartRateCallbackRef = useRef<((bpm: number) => void) | null>(null);
  const liveSessionHeartRateRef = useRef<((bpm: number) => void) | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState(0);
  const [gpsDistance, setGpsDistance] = useState(0);
  const gpsWatchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [trainingData, setTrainingData] = useState<TrainingDay[]>([]);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    age: "",
    weight: "",
    height: "",
    fitness_goal: "first_5k",
    experience_level: "beginner",
    training_days_per_week: 3,
    injuries: "",
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hi, how can I help you?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [history, setHistory] = useState<{sender: "user" | "assistant"; content: string}[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<{id?: number; date: string; type: string; duration: string; description: string} | null>(null);
  const [restoredElapsedSeconds, setRestoredElapsedSeconds] = useState(0);
  const [bluetoothDeviceId, setBluetoothDeviceId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isRestoredSession = useRef(false);
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const dataBufferRef = useRef<any[]>([]);
  const elapsedSecondsRef = useRef(0);

  useEffect(() => {
    // Fetch workouts
    loadWorkouts(setTrainingData).catch(() => setTrainingData([]));

    // Fetch profile
    fetch("/api/auth/me/", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setProfileData({
            name: data.name || "",
            age: data.profile.age || "",
            weight: data.profile.weight || "",
            height: data.profile.height || "",
            fitness_goal: data.profile.fitness_goal || "first_5k",
            experience_level: data.profile.experience_level || "beginner",
            training_days_per_week: data.profile.training_days_per_week || 3,
            injuries: data.profile.injuries || "",
          });
        }
      });

    // Restore training session if exists
    const savedState = loadTrainingState();
    if (savedState && savedState.isActive) {
      const now = Date.now();
      const totalPaused = savedState.pausedDuration;
      const currentPauseDuration = savedState.isPaused && savedState.pausedAt
        ? (now - savedState.pausedAt) / 1000
        : 0;
      const elapsed = Math.floor((now - savedState.startTimestamp) / 1000 - totalPaused - currentPauseDuration);
      
      setRestoredElapsedSeconds(Math.max(0, elapsed));
      setGpsDistance(savedState.gpsDistance);
      setBluetoothDeviceId(savedState.bluetoothDeviceId);
      setIsPaused(savedState.isPaused);
      setWorkoutId(savedState.workoutId);
      
      // Auto-start training session
      setIsConnectingBluetooth(true);
      isRestoredSession.current = true;
      
      // Restore Bluetooth device ID for reconnection
      if (savedState.bluetoothDeviceId) {
        localStorage.setItem("cheetahfit_heartrate_device", savedState.bluetoothDeviceId);
      }
    }
  }, []);

  // GPS tracking for live session
  useEffect(() => {
    if (!isTraining) {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      lastPositionRef.current = null;
      setGpsSpeed(0);
      setGpsDistance(0);
      return;
    }

    if (!navigator.geolocation) {
      console.error("GPS not available: navigator.geolocation not supported");
      return;
    }

    const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const handlePosition = (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, speed } = position.coords;
      const speedKmh = speed ? speed * 3.6 : 0;
      
      if (speedKmh >= 5 && lastPositionRef.current) {
        const dist = haversineDistance(lastPositionRef.current.lat, lastPositionRef.current.lng, lat, lng);
        setGpsDistance(prev => prev + dist);
      }
      
      lastPositionRef.current = { lat, lng };
      setGpsSpeed(speedKmh >= 5 ? speedKmh : 0);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error("GPS error:", error.message);
    };

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
    });

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
    };
  }, [isTraining]);

  // Save initial training start timestamp (only once when training starts)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!isTraining || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const existing = loadTrainingState();
    if (!existing || !existing.startTimestamp) {
      saveTrainingState({
        isActive: true,
        isPaused: false,
        startTimestamp: Date.now(),
        pausedAt: null,
        pausedDuration: 0,
        bluetoothDeviceId: bluetoothDevice?.id || null,
        gpsDistance: 0,
        workoutId: workoutId,
      });
    }
  }, [isTraining, workoutId]);

  // Save data to backend every 5 seconds (while training and not paused)
  useEffect(() => {
    if (!isTraining || isPaused || !workoutId) return;

    const interval = setInterval(async () => {
      const dataPoint = {
        elapsed_seconds: elapsedSecondsRef.current,
        distance_km: gpsDistance,
        speed_kmh: gpsSpeed,
        heart_rate: bluetoothHeartRate > 0 ? bluetoothHeartRate : null,
        latitude: lastPositionRef.current?.lat || null,
        longitude: lastPositionRef.current?.lng || null,
      };

      dataBufferRef.current.push(dataPoint);

      if (dataBufferRef.current.length >= 1) {
        try {
          await fetch("/api/auth/workout-data/save/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workout_id: workoutId,
              data_points: dataBufferRef.current,
            }),
            credentials: "include",
          });
          dataBufferRef.current = [];
        } catch (err) {
          console.error("Failed to save workout data:", err);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isTraining, isPaused, workoutId, gpsDistance, gpsSpeed, bluetoothHeartRate]);

  // Persist GPS distance and device updates (preserve existing timestamp)
  useEffect(() => {
    if (!isTraining) return;

    const existing = loadTrainingState();
    if (!existing) return;

    saveTrainingState({
      ...existing,
      gpsDistance,
      bluetoothDeviceId: bluetoothDevice?.id || existing.bluetoothDeviceId || null,
    });
  }, [isTraining, gpsDistance, bluetoothDevice]);

  

  // Get training for selected date
  const selectedTraining = useMemo(() => {
    const dateKey = formatDateKey(selectedDate);
    const training = trainingData.find((t) => t.date === dateKey);

    if (!training) {
      return { type: "none" as const, id: undefined };
    }

    return training;
  }, [selectedDate, trainingData]);

  const handleSendMessage = async (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content,
        sender: "user",
        timestamp: new Date(),
      },
    ]);

    setChatFullscreen(true);
    setIsTyping(true);

    try {
      const res = await fetch("/api/auth/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: content,
          history: history
        }),
        credentials: "include",
      });

      const data = await res.json();

      let replyContent = "";

      // Handle different response formats - reply can be string or object
      if (typeof data.reply === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(data.reply);
          replyContent = parsed.reply || data.reply;
        } catch {
          replyContent = data.reply;
        }
      } else if (typeof data.reply === 'object' && data.reply !== null) {
        // Already parsed - extract inner reply
        replyContent = data.reply.reply || JSON.stringify(data.reply);
      }

      if (replyContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: replyContent,
            sender: "assistant",
            timestamp: new Date(),
          },
        ]);
      }

      // If confirmation is needed, show it (don't duplicate reply - reply already shown above)
      if (data.confirmation_needed) {
        const count = data.confirmation_needed.workout_ids?.length || 0;
        const change = data.confirmation_needed.proposed_change || "this change";
        setMessages((prev) => [
          ...prev,
          {
            id: `confirmation-${Date.now()}`,
            content: `Apply to ${count} workout(s): "${change}"? (Yes/No)`,
            sender: "assistant",
            timestamp: new Date(),
            requires_confirmation: true,
            confirmation_data: data.confirmation_needed,
          },
        ]);
      }

      // Refresh workout data if modifications or new workouts
      if ((data.modifications_applied && data.modifications_applied.length > 0) || (data.newly_created > 0)) {
        fetch("/api/auth/workouts/", { credentials: "include" })
          .then(res => res.json())
          .then(workoutData => {
            const workouts = (workoutData.workouts || []).map((w: any) => ({
              date: w.date,
              type: w.status === "completed" ? "completed" : w.type === "rest" ? "rest" : "workout",
              title: w.type.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              description: w.description,
              duration: w.duration,
            }));
            setTrainingData(workouts);
          });
      }

      // Update history for next message
      setHistory(prev => [
        ...prev,
        { sender: 'user', content },
        { sender: 'assistant', content: replyContent }
      ]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: "I apologize, something went wrong. Please try again.",
          sender: "assistant",
          timestamp: new Date(),
        },
      ]);
    }

    setIsTyping(false);
  };

  const handleDateSelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEditWorkout = (date: Date, training?: any) => {
    if (!training || training.type === "none") {
      setEditingWorkout({
        date: formatDateKey(date),
        type: "easy_run",
        duration: "",
        description: "",
      });
    } else if (training.type !== "completed" && training.id) {
      setEditingWorkout({
        id: training.id,
        date: training.date,
        type: (training.title || "").toLowerCase().replace(" ", "_").replace("workout", "easy_run"), // default to easy_run if just "workout"
        duration: training.duration || "",
        description: training.description || "",
      });
    } else {
      return;
    }
    setEditModalOpen(true);
  };

  // Show live session
  if (isTraining) {
    return (
      <LiveSession
        workoutId={workoutId ?? undefined}
        training={selectedTraining}
        initialHeartRate={bluetoothHeartRate}
        heartRate={bluetoothHeartRate >= 0 ? bluetoothHeartRate : undefined}
        speed={gpsSpeed}
        distance={gpsDistance}
        initialElapsedSeconds={restoredElapsedSeconds}
        initialIsPaused={isPaused}
        onElapsedChange={(seconds) => { elapsedSecondsRef.current = seconds; }}
        onPauseChange={(paused) => {
          setIsPaused(paused);
          const existing = loadTrainingState();
          if (!existing) return;
          
          if (paused) {
            saveTrainingState({
              ...existing,
              isPaused: true,
              pausedAt: Date.now(),
            });
          } else {
            const additionalPause = existing.pausedAt ? (Date.now() - existing.pausedAt) / 1000 : 0;
            saveTrainingState({
              ...existing,
              isPaused: false,
              pausedAt: null,
              pausedDuration: (existing.pausedDuration || 0) + additionalPause,
            });
          }
        }}
        onRegisterHeartRateUpdate={(fn) => { liveSessionHeartRateRef.current = fn; }}
        onFinish={async () => {
          const currentWorkoutId = workoutId;

          if (dataBufferRef.current.length > 0 && currentWorkoutId) {
            try {
              await fetch("/api/auth/workout-data/save/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  workout_id: currentWorkoutId,
                  data_points: dataBufferRef.current,
                }),
                credentials: "include",
              });
            } catch (err) {
              console.error("Failed to save remaining data:", err);
            }
          }

          if (currentWorkoutId) {
            try {
              await fetch("/api/auth/workout-data/finish/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workout_id: currentWorkoutId }),
                credentials: "include",
              });

              setTrainingData((prev) =>
                prev.map((workout) =>
                  workout.id === currentWorkoutId
                    ? { ...workout, type: "completed" }
                    : workout,
                ),
              );
            } catch (err) {
              console.error("Failed to finish workout:", err);
            }
          }

          clearTrainingState();
          dataBufferRef.current = [];
          elapsedSecondsRef.current = 0;
          setIsTraining(false);
          setBluetoothHeartRate(0);
          setRestoredElapsedSeconds(0);
          setGpsDistance(0);
          setIsPaused(false);
          setWorkoutId(null);

          await loadWorkouts(setTrainingData);
        }}
      />
    );
  }

  // Show Bluetooth pairing
  if (isConnectingBluetooth) {
    return (
      <BluetoothConnect
        onConnected={(device, heartRate, onHeartRateUpdate) => {
          bluetoothDeviceRef.current = device;
          setBluetoothDevice(device);
          setBluetoothHeartRate(heartRate);
          setIsConnectingBluetooth(false);
          setIsTraining(true);
          const interval = setInterval(() => {
            if (!isTraining) clearInterval(interval);
          }, 100);
        }}
        onHeartRateChange={(bpm) => {
          setBluetoothHeartRate(bpm);
          if (liveSessionHeartRateRef.current) {
            liveSessionHeartRateRef.current(bpm);
          }
        }}
        onBack={() => {
          setIsConnectingBluetooth(false);
          if (isRestoredSession.current) {
            setIsTraining(true);
          }
        }}
      />
    );
  }

  // Show full calendar
  if (showFullCalendar) {
    return (
      <FullCalendar
        onBack={() => setShowFullCalendar(false)}
        onSelectDate={handleDateSelectFromCalendar}
        onEditWorkout={handleEditWorkout}
        trainingData={trainingData}
      />
    );
  }

  // Show chat fullscreen
  if (chatFullscreen) {
    return (
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        <header className="flex items-center gap-4 p-4 border-b border-border shrink-0">
          <button
            onClick={() => setChatFullscreen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <img
              src="/images/login-mascot.webp"
              alt="AI Assistant"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="font-semibold text-foreground">
                TR<span className="text-primary">AI</span>NER
              </h1>
              <p className="text-xs text-muted-foreground">Ask me anything</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            placeholder="Ask me anything..."
            mascotImage="/images/login-mascot.webp"
            className="flex-1 rounded-none"
            showTypingIndicator={isTyping}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <h1 className="text-2xl font-bold text-foreground">
          Cheetah<span className="text-primary">Fit</span>
        </h1>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6 text-primary" />
        </button>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col p-4 space-y-4 overflow-hidden">
        <div className="space-y-4">
          {/* Two-week calendar */}
          <TwoWeekCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onViewAll={() => setShowFullCalendar(true)}
            trainingData={trainingData}
          />

          {/* Selected day's training */}
          <TrainingCard
            training={selectedTraining}
            selectedDate={selectedDate}
            mascotImage={
              selectedTraining.type === "rest"
                ? "/images/home-mascot.webp"
                : undefined
            }
            onStartTraining={
              selectedTraining.type === "workout" && selectedTraining.id
                ? () => {
                    setWorkoutId(selectedTraining.id!);
                    setIsConnectingBluetooth(true);
                  }
                : undefined
            }
            onEdit={() => handleEditWorkout(selectedDate, selectedTraining)}
          />
        </div>

        {/* Chat interface */}
        <div className="min-h-0 mb-10">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            placeholder="Ask me anything..."
            mascotImage="/images/login-mascot.webp"
            className="h-67 min-h-0"
            showTypingIndicator={isTyping}
          />
        </div>
      </main>

      {/* Side menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Side menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-card border-l border-border z-50 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Menu header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <img
                src="/images/user-avatar.webp"
                alt="Profile"
                className="w-10 h-10 object-contain"
              />
              <div>
                <p className=" font-semibold text-foreground">{profileData.name || userName}</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Menu items */}
          <div className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => {
                setProfileModalOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-foreground"
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </button>
            <button 
              onClick={onToggleTheme}
              className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-foreground"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center gap-3 p-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium animate-pulse"
              >
                <Download className="h-5 w-5" />
                <span>Install CheetahFit</span>
              </button>
            )}

            {isIOS && !isStandalone && (
              <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Install CheetahFit</span>
                </div>
                <p>Tap the share button <span className="font-bold text-foreground">Share</span> and select <span className="font-bold text-foreground">"Add to Home Screen"</span>.</p>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 p-3 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileModalOpen && (
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          data={profileData}
          onSave={async (updated) => {
            try {
              const res = await fetch("/api/auth/profile/update/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
                credentials: "include",
              });
              if (res.ok) {
                setProfileData(updated);
                setProfileModalOpen(false);
              }
            } catch (err) {
              console.error("Failed to update profile:", err);
            }
          }}
        />
      )}

      {/* Edit Workout Modal */}
      {editModalOpen && editingWorkout && (
        <EditWorkoutModal
          workout={editingWorkout}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingWorkout(null);
          }}
          onSave={async (updated) => {
            try {
              const res = await fetch("/api/auth/workouts/modify/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  workout_id: updated.id,
                  new_date: updated.date,
                  new_type: updated.type,
                  new_duration: updated.duration,
                  new_description: updated.description,
                }),
                credentials: "include",
              });
              if (res.ok) {
                setEditModalOpen(false);
                setEditingWorkout(null);
                // Refresh workouts
                fetch("/api/auth/workouts/", { credentials: "include" })
                  .then(res => res.json())
                  .then(data => {
                    const workouts = (data.workouts || []).map((w: any) => ({
                      id: w.id,
                      date: w.date,
                      type: w.status === "completed" ? "completed" : w.type === "rest" ? "rest" : "workout",
                      title: w.type.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                      description: w.description,
                      duration: w.duration,
                    }));
                    setTrainingData(workouts);
                  });
              }
            } catch (err) {
              console.error("Failed to save workout:", err);
            }
          }}
          onDelete={async (id) => {
            try {
              const res = await fetch("/api/auth/workouts/modify/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  workout_id: id,
                  new_date: "delete",
                }),
                credentials: "include",
              });
              if (res.ok) {
                setEditModalOpen(false);
                setEditingWorkout(null);
                // Refresh workouts
                fetch("/api/auth/workouts/", { credentials: "include" })
                  .then(res => res.json())
                  .then(data => {
                    const workouts = (data.workouts || []).map((w: any) => ({
                      id: w.id,
                      date: w.date,
                      type: w.status === "completed" ? "completed" : w.type === "rest" ? "rest" : "workout",
                      title: w.type.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
                      description: w.description,
                      duration: w.duration,
                    }));
                    setTrainingData(workouts);
                  });
              }
            } catch (err) {
              console.error("Failed to delete workout:", err);
            }
          }}
        />
      )}
    </div>
  );
}
