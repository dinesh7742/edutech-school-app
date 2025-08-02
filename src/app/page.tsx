
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";


export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This effect will run when loading status, user, or role changes.
    
    // If we're still loading authentication state, do nothing.
    if (loading) {
      return;
    }

    // If loading is finished and there's no user, redirect to login.
    if (!user) {
      router.replace("/login");
      return;
    }

    // If loading is finished and we have a user and their role, redirect them.
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
          // Fallback for an unknown or unassigned role.
          router.replace("/login");
          break;
      }
    }
    
    // If loading is finished and we have a user but no role yet, this effect will
    // simply finish. It will run again when the 'role' is eventually loaded,
    // which will then trigger the correct redirection.

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
