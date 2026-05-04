import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  placeholder?: string;
  mascotImage?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  showTypingIndicator?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  placeholder = "Type your message...",
  mascotImage = "/images/login-mascot.webp",
  title = "TRAINER",
  disabled = false,
  className = "",
  showTypingIndicator = false,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when it becomes enabled
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue("");
      // Focus will be regained via the useEffect when disabled becomes false again
      // but let's also focus it here just in case
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`flex flex-col bg-card rounded-xl ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold tracking-wide">
          TR<span className="text-primary">AI</span>NER
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar min-h-[200px] max-h-[calc(100vh-180px)]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.sender === "assistant" && (
              <img
                src={mascotImage}
                alt="AI Assistant"
                className="w-10 h-10 object-contain flex-shrink-0"
              />
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                message.sender === "user"
                  ? "bg-secondary text-secondary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {message.sender === "assistant" ? (
                <div className="text-sm leading-relaxed">
                  <MarkdownContent content={message.content} />
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {showTypingIndicator && (
          <div className="flex items-end gap-2 justify-start">
            <img
              src={mascotImage}
              alt="AI Assistant"
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-secondary border-0 text-foreground placeholder:text-muted-foreground rounded-full px-4 h-11"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || disabled}
            className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  try {
    return (
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          code: ({ node, className, ...props }) => {
            const isInline = !className?.includes('block');
            return isInline
              ? <code className="bg-secondary px-1 rounded text-xs" {...props} />
              : <code className="bg-secondary block p-2 rounded text-xs" {...props} />;
          },
        }}
      >
        {String(content)}
      </ReactMarkdown>
    );
  } catch {
    return <p className="text-sm">{content}</p>;
  }
}
