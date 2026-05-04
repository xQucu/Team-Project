import { HomeScreen } from "@/components/home-screen";
import { LoginScreen } from "@/components/login-screen";
import { OnboardingChat } from "@/components/onboarding-chat";
import { SignupScreen } from "@/components/signup-screen";
import { useEffect, useState } from "react";

type AppScreen = "login" | "signup" | "onboarding" | "home";
type Theme = "dark" | "light";

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  has_completed_onboarding: boolean;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("cheetahfit_theme");
    return (saved as Theme) || "dark";
  });

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
    localStorage.setItem("cheetahfit_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  useEffect(() => {
    fetch("http://localhost:3000/api/auth/me/", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        setUserData(data);
        localStorage.setItem("cheetahfit_user", JSON.stringify(data));
        setCurrentScreen(data.has_completed_onboarding ? "home" : "onboarding");
      })
      .catch(() => {
        localStorage.removeItem("cheetahfit_user");
      });
  }, []);

  const handleLogin = (user: UserData) => {
    const userWithLocal: UserData = {
      ...user,
      has_completed_onboarding: user.has_completed_onboarding,
    };
    localStorage.setItem("cheetahfit_user", JSON.stringify(userWithLocal));
    setUserData(userWithLocal);
    setCurrentScreen(user.has_completed_onboarding ? "home" : "onboarding");
  };

  const handleSignup = (user: UserData) => {
    const userWithLocal: UserData = {
      ...user,
      has_completed_onboarding: false,
    };
    localStorage.setItem("cheetahfit_user", JSON.stringify(userWithLocal));
    setUserData(userWithLocal);
    setCurrentScreen("onboarding");
  };

  const handleOnboardingComplete = (_answers: string[]) => {
    fetch("http://localhost:3000/api/auth/me/", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setUserData(data);
        localStorage.setItem("cheetahfit_user", JSON.stringify(data));
        setCurrentScreen("home");
      });
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3000/api/auth/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    localStorage.removeItem("cheetahfit_user");
    setUserData(null);
    setCurrentScreen("login");
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background">
      {currentScreen === "login" && (
        <LoginScreen
          onLogin={handleLogin}
          onSignup={() => setCurrentScreen("signup")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {currentScreen === "signup" && (
        <SignupScreen
          onSignup={handleSignup}
          onBack={() => setCurrentScreen("login")}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {currentScreen === "onboarding" && (
        <OnboardingChat onComplete={handleOnboardingComplete} />
      )}

      {currentScreen === "home" && (
        <HomeScreen 
          userName={userData?.first_name}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}