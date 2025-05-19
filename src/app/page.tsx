
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";


export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (role === "student") {
          router.replace("/student/dashboard");
        } else if (role === "teacher") {
          router.replace("/teacher/dashboard");
        } else if (role === "admin") { // Added admin redirection
          router.replace("/admin/dashboard");
        }
         else {
          // If role is not defined yet (e.g. during signup), stay or redirect to a pending page
          // For now, redirect to login if role is unknown after loading
          router.replace("/login"); 
        }
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, role, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">CampusConnect</h1>
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
