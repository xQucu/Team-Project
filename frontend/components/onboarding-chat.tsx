import { ChatInterface, Message } from "@/components/chat-interface";
import { WheelPicker } from "@/components/wheel-picker";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

interface OnboardingChatProps {
  onComplete: (answers: string[]) => void;
  onBack?: () => void;
}

interface ChatHistoryItem {
  sender: "user" | "assistant";
  content: string;
}

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

interface PickerConfig {
  type: "age" | "weight" | "height" | "days";
  min: number;
  max: number;
  unit: string;
  default: number;
  label: string;
}

export function OnboardingChat({ onComplete, onBack }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pickerConfig, setPickerConfig] = useState<PickerConfig | null>(null);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalModalValue, setGoalModalValue] = useState("Run First 5K");
  const [experienceModalOpen, setExperienceModalOpen] = useState(false);
  const [experienceModalValue, setExperienceModalValue] = useState("Beginner");
  const [injuriesModalOpen, setInjuriesModalOpen] = useState(false);
  const [injuriesModalValue, setInjuriesModalValue] = useState("");

  const detectPicker = (text: string): PickerConfig | null => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("how old") || lowerText.includes("your age")) {
      return { type: "age", min: 14, max: 99, unit: "", default: 25, label: "Select your age" };
    }

    const isWeightQuestion = (
      lowerText.includes("select your weight") ||
      lowerText.includes("what do you weigh") ||
      lowerText.includes("your weight") ||
      lowerText.includes("weigh in kg")
    ) && !lowerText.includes("lose weight") && !lowerText.includes("weight loss");
    if (isWeightQuestion) {
      return { type: "weight", min: 40, max: 200, unit: " kg", default: 75, label: "Select your weight" };
    }

    const isHeightQuestion = (
      lowerText.includes("select your height") ||
      lowerText.includes("how tall are you") ||
      lowerText.includes("your height")
    );
    if (isHeightQuestion) {
      return { type: "height", min: 120, max: 230, unit: " cm", default: 175, label: "Select your height" };
    }

    const isDaysQuestion = (
      lowerText.includes("days per week") ||
      (lowerText.includes("how many days") && lowerText.includes("train")) ||
      lowerText.includes("training days")
    );
    if (isDaysQuestion) {
      return { type: "days", min: 1, max: 7, unit: " days", default: 3, label: "Training days per week" };
    }

    return null;
  };

  const detectGoalQuestion = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes("your goal") ||
      lowerText.includes("what is your goal") ||
      lowerText.includes("what's your goal") ||
      lowerText.includes("enter your goal") ||
      lowerText.includes("describe your goal") ||
      lowerText.includes("goal?") ||
      lowerText.includes("goal for")
    );
  };

  const detectExperienceQuestion = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes("experience level") ||
      lowerText.includes("how experienced") ||
      lowerText.includes("your experience") ||
      lowerText.includes("what is your experience") ||
      lowerText.includes("experience?") ||
      (lowerText.includes("experience") && (lowerText.includes("beginner") || lowerText.includes("intermediate") || lowerText.includes("advanced")))
    );
  };

  const detectInjuriesQuestion = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (
      lowerText.includes("injury") ||
      lowerText.includes("injuries") ||
      lowerText.includes("limitation") ||
      lowerText.includes("limitations") ||
      lowerText.includes("any pain") ||
      lowerText.includes("any issues") ||
      lowerText.includes("pain or issues")
    );
  };

  const GOAL_OPTIONS = [
    "Run First 5K",
    "Improve Speed",
    "Train for Marathon",
    "Build Endurance",
    "Lose Weight",
  ];

  const EXPERIENCE_OPTIONS = [
    "Beginner",
    "Intermediate",
    "Advanced",
  ];

  const sendChatRequest = async (message: string, hist: ChatHistoryItem[], attempt = 0): Promise<any> => {
    setErrorMessage(null);

    let res: Response;
    try {
      res = await fetch("/api/auth/onboarding/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: hist }),
        credentials: "include",
      });
    } catch (fetchError) {
      const error = fetchError instanceof Error ? fetchError.message : "Network request failed";
      setErrorMessage(error);
      throw new Error(error);
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      data = { error: `HTTP ${res.status} ${res.statusText}` };
    }

    if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
      setRetryCount(attempt + 1);
      const retryDelay = data.retry_after
        ? data.retry_after * 1000
        : RETRY_DELAY_MS * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return sendChatRequest(message, hist, attempt + 1);
    }

    if (res.ok) {
      setRetryCount(0);
      setErrorMessage(null);
      return data;
    }

    const error = data?.error || `Request failed (${res.status})`;
    setErrorMessage(error);
    throw new Error(error);
  };

  const handleSendMessage = async (content: string) => {
    setPickerConfig(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content,
        sender: "user",
        timestamp: new Date(),
      },
    ]);

    const newHistory = [...history, { sender: "user" as const, content }];
    setHistory(newHistory);

    setIsTyping(true);
    try {
      const data = await sendChatRequest(content, newHistory);

      let replyContent = data.reply || "";
      
      try {
        const replyJson = JSON.parse(replyContent);
        if (replyJson.reply) {
          replyContent = replyJson.reply;
        }
      } catch {
        // Not JSON
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
        setHistory((prev) => [...prev, { sender: "assistant" as const, content: replyContent }]);

        if (detectGoalQuestion(replyContent)) {
          setGoalModalValue(GOAL_OPTIONS[0]);
          setGoalModalOpen(true);
          setPickerConfig(null);
        } else if (detectExperienceQuestion(replyContent)) {
          setExperienceModalValue(EXPERIENCE_OPTIONS[0]);
          setExperienceModalOpen(true);
          setPickerConfig(null);
        } else if (detectInjuriesQuestion(replyContent)) {
          setInjuriesModalValue("");
          setInjuriesModalOpen(true);
          setPickerConfig(null);
        } else {
          setPickerConfig(detectPicker(replyContent));
        }
      }

      if (data.complete) {
        setIsComplete(true);
        setTimeout(() => {
          onComplete(newHistory.map((h) => h.content));
        }, 1500);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setErrorMessage(message);
      console.error(e);
    }

    setIsTyping(false);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsTyping(true);
      try {
        const data = await sendChatRequest("Hello, I'm ready to start!", []);
        if (data.reply) {
          setMessages([{
            id: `assistant-${Date.now()}`,
            content: data.reply,
            sender: "assistant",
            timestamp: new Date(),
          }]);

          if (detectGoalQuestion(data.reply)) {
            setGoalModalValue(GOAL_OPTIONS[0]);
            setGoalModalOpen(true);
          } else if (detectExperienceQuestion(data.reply)) {
            setExperienceModalValue(EXPERIENCE_OPTIONS[0]);
            setExperienceModalOpen(true);
          } else if (detectInjuriesQuestion(data.reply)) {
            setInjuriesModalValue("");
            setInjuriesModalOpen(true);
          } else {
            setPickerConfig(detectPicker(data.reply));
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unexpected error";
        setErrorMessage(message);
        console.error(e);
      }
      setIsTyping(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirmGoal = (goal: string) => {
    const sanitizedGoal = goal.trim() || GOAL_OPTIONS[0];
    setGoalModalOpen(false);
    handleSendMessage(sanitizedGoal);
  };

  const handleConfirmExperience = (experience: string) => {
    const sanitizedExperience = experience.trim() || EXPERIENCE_OPTIONS[0];
    setExperienceModalOpen(false);
    handleSendMessage(sanitizedExperience);
  };

  const handleConfirmInjuries = (injuries: string) => {
    const sanitizedInjuries = injuries.trim() || "No injuries or limitations.";
    setInjuriesModalOpen(false);
    handleSendMessage(sanitizedInjuries);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="sticky top-0 z-30 flex-shrink-0 bg-background flex items-center gap-4 p-4 border-b border-border">
        {onBack && (
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <img
            src="/images/onboarding-mascot.webp"
            alt="AI Assistant"
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="font-semibold text-foreground">Getting Started</h1>
            <p className="text-xs text-muted-foreground">
              {isTyping 
                ? retryCount > 0 
                  ? `Retrying... (attempt ${retryCount}/${MAX_RETRIES})`
                  : "Thinking..." 
                : "AI Assistant"}
            </p>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="mx-4 mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Onboarding error:</strong> {errorMessage}
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          placeholder={injuriesModalOpen ? "Describe your injuries or limitations..." : experienceModalOpen ? "Choose experience..." : goalModalOpen ? "Choose a goal..." : pickerConfig ? "Use the picker below..." : "Type your answer..."}
          mascotImage="/images/onboarding-mascot.webp"
          disabled={isTyping || isComplete || !!pickerConfig || goalModalOpen || experienceModalOpen || injuriesModalOpen}
          className="flex-1 min-h-0 rounded-none"
          showTypingIndicator={isTyping}
        />

        {goalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setGoalModalOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold">What is your goal?</h2>
                </div>
              </div>

              <div className="grid gap-3 mb-4">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setGoalModalValue(goal)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                      goalModalValue === goal
                        ? "border border-primary bg-primary/10 text-foreground"
                        : "border border-border bg-secondary text-foreground hover:bg-secondary/90"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Custom goal
              </label>
              <textarea
                rows={1}
                onChange={(e) => setGoalModalValue(e.target.value)}
                placeholder="Type your own goal"
                className="w-full rounded-2xl bg-secondary border-0 px-4 py-3 focus:ring-2 focus:ring-primary transition-all resize-none"
              />

              <button
                style={{fontSize:'1.1em'}}
                type="button"
                onClick={() => handleConfirmGoal(goalModalValue)}
                className="mt-5 w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Confirm Goal
              </button>
            </div>
          </div>
        )}

        {experienceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setExperienceModalOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold">Your experience level</h2>
                </div>
              </div>

              <div className="grid gap-3 mb-4">
                {EXPERIENCE_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setExperienceModalValue(level)}
                    className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                      experienceModalValue === level
                        ? "border border-primary bg-primary/10 text-foreground"
                        : "border border-border bg-secondary text-foreground hover:bg-secondary/90"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Custom experience level
              </label>
              <textarea
                rows={1}  
                onChange={(e) => setExperienceModalValue(e.target.value)}
                placeholder="Type your own experience level"
                className="w-full rounded-2xl bg-secondary border-0 px-4 py-3 focus:ring-2 focus:ring-primary transition-all resize-none"
              />

              <button
                type="button"
                style={{fontSize:'1.1em'}}
                onClick={() => handleConfirmExperience(experienceModalValue)}
                className="mt-5 w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Confirm Experience
              </button>
            </div>
          </div>
        )}

        {injuriesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInjuriesModalOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold">Injuries / Limitations</h2>
                </div>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Your injuries
              </label>
              <textarea
                rows={4}
                value={injuriesModalValue}
                onChange={(e) => setInjuriesModalValue(e.target.value)}
                placeholder="Describe any injuries, pain, or restrictions"
                className="w-full rounded-2xl bg-secondary border-0 px-4 py-3 focus:ring-2 focus:ring-primary transition-all resize-none"
              />

              <button
                type="button"
                style={{fontSize:'1.1em'}}
                onClick={() => handleConfirmInjuries(injuriesModalValue)}
                className="mt-5 w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Confirm Injuries
              </button>
            </div>
          </div>
        )}

        {pickerConfig && !isTyping && !isComplete && (
          <WheelPicker
            min={pickerConfig.min}
            max={pickerConfig.max}
            defaultValue={pickerConfig.default}
            unit={pickerConfig.unit}
            label={pickerConfig.label}
            onSelect={() => {}}
            onConfirm={(val) => {
              const content = pickerConfig.type === "age" ? `${val} years old` : 
                              pickerConfig.type === "weight" ? `${val} kg` :
                              pickerConfig.type === "height" ? `${val} cm` :
                              `${val} days`;
              handleSendMessage(content);
            }}
          />
        )}
      </div>
    </div>
  );
}