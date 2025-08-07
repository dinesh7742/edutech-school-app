
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
    // Wait until loading is finished
    if (loading) {
      return;
    }

    // If user is not logged in, redirect to login page.
    if (!user) {
      router.replace("/login");
      return;
    }

    // If user is logged in, redirect based on their role.
    if (role) {
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
    } else {
      // This case might happen if user document is missing in Firestore.
      // Redirect to login after a short delay, with a message.
      const timer = setTimeout(() => {
        toast({
          title: "Profile Incomplete",
          description: "Your user profile could not be loaded. Please contact support or try logging in again.",
          variant: "destructive",
          duration: 7000,
        });
        router.replace("/login");
      }, 2000);
      return () => clearTimeout(timer);
    }

  }, [user, loading, role, router, toast]);

  // Render a loading skeleton while waiting for authentication and redirection.
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
