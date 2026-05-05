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
  const [pickerConfig, setPickerConfig] = useState<PickerConfig | null>(null);

  const detectPicker = (text: string): PickerConfig | null => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("how old") || lowerText.includes("your age")) {
      return { type: "age", min: 14, max: 99, unit: "", default: 25, label: "Select your age" };
    }
    if (lowerText.includes("weight") || lowerText.includes("weigh")) {
      return { type: "weight", min: 40, max: 200, unit: " kg", default: 75, label: "Select your weight" };
    }
    if (lowerText.includes("height") || lowerText.includes("tall")) {
      return { type: "height", min: 120, max: 230, unit: " cm", default: 175, label: "Select your height" };
    }
    if (lowerText.includes("days per week") || (lowerText.includes("how many days") && lowerText.includes("train"))) {
      return { type: "days", min: 1, max: 7, unit: " days", default: 3, label: "Training days per week" };
    }
    return null;
  };

  const sendChatRequest = async (message: string, hist: ChatHistoryItem[], attempt = 0): Promise<any> => {
    const res = await fetch("http://localhost:3000/api/auth/onboarding/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: hist }),
      credentials: "include",
    });

    const data = await res.json();

    if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
      setRetryCount(attempt + 1);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return sendChatRequest(message, hist, attempt + 1);
    }

    if (res.ok) {
      setRetryCount(0);
      return data;
    }

    throw new Error(data.error || "Request failed");
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
      const data = await sendChatRequest(content, history);

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
        
        // Check if next question needs a picker
        setPickerConfig(detectPicker(replyContent));
      }

      if (data.complete) {
        setIsComplete(true);
        setTimeout(() => {
          onComplete(newHistory.map(h => h.content));
        }, 1500);
      }
    } catch (e) {
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
          setPickerConfig(detectPicker(data.reply));
        }
      } catch (e) {
        console.error(e);
      }
      setIsTyping(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 p-4 border-b border-border">
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

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          placeholder={pickerConfig ? "Use the picker below..." : "Type your answer..."}
          mascotImage="/images/onboarding-mascot.webp"
          disabled={isTyping || isComplete || !!pickerConfig}
          className="flex-1 rounded-none"
          showTypingIndicator={isTyping}
        />
        
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

      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            {isComplete ? "Complete!" : "Getting to know you"}
          </span>
        </div>
      </div>
    </div>
  );
}