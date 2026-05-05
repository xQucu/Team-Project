import { ChatInterface, Message } from "@/components/chat-interface";
import { EditWorkoutModal } from "@/components/EditWorkoutModal";
import { ProfileModal } from "@/components/ProfileModal";
import { FullCalendar } from "@/components/full-calendar";
import { LiveSession } from "@/components/live-session";
import { TrainingCard } from "@/components/training-card";
import { TwoWeekCalendar } from "@/components/two-week-calendar";
import { ArrowLeft, LogOut, Menu, Settings, Sun, Moon, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export function HomeScreen({ userName = "User", onLogout, theme = "dark", onToggleTheme }: HomeScreenProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
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

  useEffect(() => {
    // Fetch workouts
    fetch("http://localhost:3000/api/auth/workouts/", { credentials: "include" })
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
      })
      .catch(() => {
        setTrainingData([]);
      });

    // Fetch profile
    fetch("http://localhost:3000/api/auth/me/", { credentials: "include" })
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
  }, []);

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
      const res = await fetch("http://localhost:3000/api/auth/chat/", {
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
        fetch("http://localhost:3000/api/auth/workouts/", { credentials: "include" })
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
          onEdit={() => handleEditWorkout(selectedDate, selectedTraining)}
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
          showTypingIndicator={isTyping}
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
                <p className="font-semibold text-foreground">{profileData.name || userName}</p>
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
            <button className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-foreground">
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
            <button 
              onClick={onToggleTheme}
              className="w-full flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors text-foreground"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
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

      {/* Profile Modal */}
      {profileModalOpen && (
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          data={profileData}
          onSave={async (updated) => {
            try {
              const res = await fetch("http://localhost:3000/api/auth/profile/update/", {
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
              const res = await fetch("http://localhost:3000/api/auth/workouts/modify/", {
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
                fetch("http://localhost:3000/api/auth/workouts/", { credentials: "include" })
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
              const res = await fetch("http://localhost:3000/api/auth/workouts/modify/", {
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
                fetch("http://localhost:3000/api/auth/workouts/", { credentials: "include" })
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
