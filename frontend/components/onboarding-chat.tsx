import { ChatInterface, Message } from "@/components/chat-interface";
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

export function OnboardingChat({ onComplete, onBack }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const sendChatRequest = async (message: string, hist: ChatHistoryItem[], attempt = 0): Promise<any> => {
    const res = await fetch("http://localhost:3000/api/auth/onboarding/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: hist }),
      credentials: "include",
    });

    const data = await res.json();

    if (res.status === 429 && attempt < MAX_RETRIES) {
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
        }
      } catch (e) {
        console.error(e);
      }
      setIsTyping(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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

    const newHistory = [...history, { sender: "user" as const, content }];
    setHistory(newHistory);

    setIsTyping(true);
    try {
      const data = await sendChatRequest(content, history);

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            content: data.reply,
            sender: "assistant",
            timestamp: new Date(),
          },
        ]);
        setHistory((prev) => [...prev, { sender: "assistant" as const, content: data.reply }]);
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

      <div className="flex-1 flex flex-col">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          placeholder="Type your answer..."
          mascotImage="/images/onboarding-mascot.webp"
          disabled={isTyping || isComplete}
          className="flex-1 rounded-none"
          showTypingIndicator={isTyping}
        />
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