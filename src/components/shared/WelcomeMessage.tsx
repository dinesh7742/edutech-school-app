
"use client";

import { useAuth } from "@/context/AuthContext";

export function WelcomeMessage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
      <span>Welcome,</span>
      <span className="block text-primary whitespace-nowrap">{user.displayName || "User"}!</span>
    </div>
  );
}
