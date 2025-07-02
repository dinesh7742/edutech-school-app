
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";


export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything until the auth state is fully loaded
    if (loading) {
      return;
    }

    // If loading is done and there's no user, they should be on the login page.
    if (!user) {
      router.replace("/login");
      return;
    }

    // If loading is done and there is a user, redirect based on their role.
    switch (role) {
      case "student":
        router.replace("/student/dashboard");
        break;
      case "teacher":
        router.replace("/teacher/dashboard");
        break;
      case "admin":
        router.replace("/admin/dashboard");
        break;
      default:
        // If user exists but has no valid role, it's a broken state.
        // Redirecting to login is a safe fallback.
        router.replace("/login");
        break;
    }
  }, [user, loading, role, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Edutech</h1>
        <p className="text-muted-foreground">Loading your experience...</p>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}
