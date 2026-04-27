import { HomeScreen } from "@/components/home-screen";
import { LoginScreen } from "@/components/login-screen";
import { OnboardingChat } from "@/components/onboarding-chat";
import { SignupScreen } from "@/components/signup-screen";
import { useEffect, useState } from "react";

type AppScreen = "login" | "signup" | "onboarding" | "home";

interface UserData {
  name: string;
  email: string;
  hasCompletedOnboarding: boolean;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("cheetahfit_user");
    if (savedUser) {
      const user = JSON.parse(savedUser) as UserData;
      setUserData(user);
      setCurrentScreen(user.hasCompletedOnboarding ? "home" : "onboarding");
    }
  }, []);

  const handleLogin = (email: string, _password: string) => {
    const existingUser = localStorage.getItem("cheetahfit_user");
    if (existingUser) {
      const user = JSON.parse(existingUser) as UserData;
      setUserData(user);
      setCurrentScreen(user.hasCompletedOnboarding ? "home" : "onboarding");
    } else {
      const newUser: UserData = {
        name: email.split("@")[0],
        email,
        hasCompletedOnboarding: false,
      };
      localStorage.setItem("cheetahfit_user", JSON.stringify(newUser));
      setUserData(newUser);
      setCurrentScreen("onboarding");
    }
  };

  const handleSignup = (name: string, email: string, _password: string) => {
    const newUser: UserData = {
      name,
      email,
      hasCompletedOnboarding: false,
    };
    localStorage.setItem("cheetahfit_user", JSON.stringify(newUser));
    setUserData(newUser);
    setCurrentScreen("onboarding");
  };

  const handleOnboardingComplete = (answers: string[]) => {
    console.log("Onboarding answers:", answers);
    if (userData) {
      const updatedUser = { ...userData, hasCompletedOnboarding: true };
      localStorage.setItem("cheetahfit_user", JSON.stringify(updatedUser));
      setUserData(updatedUser);
    }
    setCurrentScreen("home");
  };

  const handleLogout = () => {
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
        />
      )}

      {currentScreen === "signup" && (
        <SignupScreen
          onSignup={handleSignup}
          onBack={() => setCurrentScreen("login")}
        />
      )}

      {currentScreen === "onboarding" && (
        <OnboardingChat onComplete={handleOnboardingComplete} />
      )}

      {currentScreen === "home" && (
        <HomeScreen userName={userData?.name} onLogout={handleLogout} />
      )}
    </div>
  );
}
