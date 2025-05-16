"use client";

import { useAuth } from "@/context/AuthContext";

export function WelcomeMessage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
      Welcome, <span className="text-primary">{user.displayName || "User"}</span>!
    </h1>
  );
}
