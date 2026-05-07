import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, Mail, Sun, Moon } from "lucide-react";
import { useState } from "react";

interface LoginScreenProps {
  onLogin: (userData: { id: number; email: string; first_name: string; last_name: string; has_completed_onboarding: boolean }) => void;
  onSignup: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export function LoginScreen({ onLogin, onSignup, theme = "dark", onToggleTheme }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }
      onLogin(data);
    } catch {
      setError("Connection error");
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Theme toggle in top-right */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </button>
      )}

      {/* Logo and mascot */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/images/login-mascot.webp"
          alt="CheetahFit Mascot"
          className="w-32 h-32 object-contain mb-4"
        />
        <h1 className="text-3xl font-bold text-foreground">
          Cheetah<span className="text-primary">Fit</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your AI Training Companion
        </p>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-destructive text-sm text-center">{error}</p>
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-12 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-12 pr-12 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-xl"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </button>
        </div>
      </form>

      {/* Sign up */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground text-sm">
          Don&apos;t have an account?{" "}
          <button
            onClick={onSignup}
            className="text-primary font-semibold hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
