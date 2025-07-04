
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";


export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial authentication check is complete.
    if (loading) {
      return;
    }

    // If auth is checked and there's no user, they must log in.
    if (!user) {
      router.replace("/login");
      return;
    }

    // If there IS a user and their role has been determined, redirect them.
    if (user && role) {
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
          // Fallback for an unknown role.
          router.replace("/login");
          break;
      }
    }
    
    // If user exists but role is not yet loaded, this effect does nothing and waits.
    // It will re-run when the 'role' state changes, triggering the correct redirect.

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
