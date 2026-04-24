import { useState, useEffect, useCallback } from "react"
import { ChatInterface, Message } from "@/components/chat-interface"
import { ArrowLeft } from "lucide-react"

const ONBOARDING_QUESTIONS = [
  "Hey there! I'm your personal training assistant 🐆 What's your main fitness goal? (e.g., lose weight, build muscle, improve endurance)",
  "Great choice! How many days per week can you commit to training?",
  "What's your current fitness level? (Beginner, Intermediate, or Advanced)",
  "Do you have access to a gym, or will you be training at home?",
  "Any injuries or physical limitations I should know about?",
  "Perfect! I've got everything I need to create your personalized training plan. Let's get you moving! 💪",
]

interface OnboardingChatProps {
  onComplete: (answers: string[]) => void
  onBack?: () => void
}

export function OnboardingChat({ onComplete, onBack }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)

  const addAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        content,
        sender: "assistant",
        timestamp: new Date(),
      },
    ])
  }, [])

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      addAssistantMessage(ONBOARDING_QUESTIONS[0])
    }, 500)
    return () => clearTimeout(timer)
  }, [addAssistantMessage])

  const handleSendMessage = (content: string) => {
    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content,
        sender: "user",
        timestamp: new Date(),
      },
    ])

    // Save answer
    const newAnswers = [...answers, content]
    setAnswers(newAnswers)

    const nextQuestion = currentQuestion + 1

    if (nextQuestion < ONBOARDING_QUESTIONS.length) {
      // Show typing indicator and next question
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addAssistantMessage(ONBOARDING_QUESTIONS[nextQuestion])
        setCurrentQuestion(nextQuestion)

        // If this was the last question with an actual input expected
        if (nextQuestion === ONBOARDING_QUESTIONS.length - 1) {
          // Complete after showing final message
          setTimeout(() => {
            onComplete(newAnswers)
          }, 2000)
        }
      }, 1000)
    }
  }

  const isLastQuestion = currentQuestion === ONBOARDING_QUESTIONS.length - 1

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
              {isTyping ? "Typing..." : "Let me know about you"}
            </p>
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          placeholder="Type your answer..."
          mascotImage="/images/onboarding-mascot.webp"
          disabled={isTyping || isLastQuestion}
          className="flex-1 rounded-none"
        />
      </div>

      {/* Progress indicator */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Getting to know you</span>
          <span className="text-xs text-primary">
            {Math.min(currentQuestion + 1, ONBOARDING_QUESTIONS.length - 1)}/
            {ONBOARDING_QUESTIONS.length - 1}
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${(Math.min(currentQuestion + 1, ONBOARDING_QUESTIONS.length - 1) / (ONBOARDING_QUESTIONS.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
