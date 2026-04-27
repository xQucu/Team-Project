import { ChatInterface, Message } from "@/components/chat-interface";
import { FullCalendar } from "@/components/full-calendar";
import { LiveSession } from "@/components/live-session";
import { TrainingCard } from "@/components/training-card";
import { TwoWeekCalendar } from "@/components/two-week-calendar";
import { ArrowLeft, LogOut, Menu, Settings, User, X } from "lucide-react";
import { useMemo, useState } from "react";

interface TrainingDay {
  date: string;
  type: "workout" | "rest" | "completed";
  title?: string;
  description?: string;
  duration?: string;
  exercises?: string[];
}

interface HomeScreenProps {
  userName?: string;
  onLogout: () => void;
}

// Helper to format date as YYYY-MM-DD
const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function HomeScreen({ userName = "User", onLogout }: HomeScreenProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hi, how can I help you?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);

  // Mock training data - in a real app this would come from an API
  const trainingData: TrainingDay[] = useMemo(() => {
    const today = new Date();
    const data: TrainingDay[] = [];

    // Generate sample training data for the current month
    for (let i = -14; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = formatDateKey(date);

      // Skip some days randomly for variety
      if (Math.random() > 0.7 && i !== 0) continue;

      const isPast = i < 0;
      const isRestDay = date.getDay() === 0 || date.getDay() === 3; // Sunday and Wednesday are rest days

      if (isRestDay) {
        data.push({
          date: dateKey,
          type: "rest",
          title: "Rest Day",
          description: "Recovery is important for progress",
        });
      } else if (isPast) {
        data.push({
          date: dateKey,
          type: "completed",
          title: "Running Session",
          description: "Interval training",
          duration: "45 min",
          exercises: ["Warm-up 5 min", "5x 400m sprints", "Cool-down 10 min"],
        });
      } else {
        const workouts = [
          {
            title: "Interval Training",
            description: "8x400m at 5K pace",
            duration: "45 min",
            exercises: [
              "Warm-up 10 min easy",
              "8x400m (90s rest)",
              "Cool-down 10 min",
            ],
          },
          {
            title: "Long Run",
            description: "Endurance building",
            duration: "60 min",
            exercises: [
              "Warm-up 10 min",
              "Easy pace 40 min",
              "Cool-down 10 min",
            ],
          },
          {
            title: "Tempo Run",
            description: "Threshold training",
            duration: "35 min",
            exercises: [
              "Warm-up 10 min",
              "20 min at threshold",
              "Cool-down 5 min",
            ],
          },
        ];
        const workout = workouts[Math.floor(Math.random() * workouts.length)];
        data.push({
          date: dateKey,
          type: "workout",
          ...workout,
        });
      }
    }

    return data;
  }, []);

  // Get training for selected date
  const selectedTraining = useMemo(() => {
    const dateKey = formatDateKey(selectedDate);
    const training = trainingData.find((t) => t.date === dateKey);

    if (!training) {
      return { type: "none" as const };
    }

    return training;
  }, [selectedDate, trainingData]);

  const handleSendMessage = (content: string) => {
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

    setTimeout(() => {
      const responses = [
        "I'm here to help with your training! What would you like to know?",
        "Great question! Let me help you with that.",
        "I can assist you with workout modifications, nutrition tips, or schedule adjustments. What do you need?",
        "Let me check your training plan and get back to you!",
      ];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          content: randomResponse,
          sender: "assistant",
          timestamp: new Date(),
        },
      ]);
    }, 1000);
  };

  const handleDateSelectFromCalendar = (date: Date) => {
    setSelectedDate(date);
  };

  // Show live session
  if (isTraining) {
    return (
      <LiveSession
        onFinish={() => setIsTraining(false)}
        onBack={() => setIsTraining(false)}
      />
    );
  }

  // Show full calendar
  if (showFullCalendar) {
    return (
      <FullCalendar
        onBack={() => setShowFullCalendar(false)}
        onSelectDate={handleDateSelectFromCalendar}
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
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
      <main className="flex-1 p-4 space-y-4">
        {/* Removed overflow-y-auto */}
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
            selectedTraining.type === "workout"
              ? () => setIsTraining(true)
              : undefined
          }
        />

        {/* Trainer section header */}
        <div className="pt-2">
          <h2 className="text-sm font-semibold text-foreground tracking-wide">
            TR<span className="text-primary">AI</span>NER
          </h2>
        </div>

        {/* Chat interface */}
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          placeholder="Ask me anything..."
          mascotImage="/images/login-mascot.webp"
          className="h-80"
        />
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
                <p className="font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">Premium Member</p>
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
            <button className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-foreground">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-foreground">
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
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
    </div>
  );
}
