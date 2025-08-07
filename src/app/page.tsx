
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) {
      // Still loading, do nothing.
      return;
    }

    // After loading is complete...
    if (!user) {
      // No user found, redirect to login.
      router.replace("/login");
      return;
    }

    // If user exists, but role is not yet determined.
    if (!role) {
      // Set a timeout to handle cases where role fetching might be stuck
      const roleCheckTimeout = setTimeout(() => {
        // If after 10 seconds the role is still not available,
        // something is wrong. Log out the user and redirect to login.
        if (!role) { // Re-check role inside timeout
           toast({
            title: "Session Issue",
            description: "Could not load your user profile. Your session might have expired. Please log in again.",
            variant: "destructive",
            duration: 7000,
          });
          // To ensure a clean state, you might want to sign the user out here
          // before redirecting, but for now, redirecting is the main goal.
          router.replace("/login");
        }
      }, 10000); // 10-second timeout

      // Cleanup the timeout if the component unmounts or dependencies change
      return () => clearTimeout(roleCheckTimeout);
    }

    // If user and role are available, redirect to the appropriate dashboard.
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

  }, [user, loading, role, router, toast]);

  // Render a loading skeleton while waiting.
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
