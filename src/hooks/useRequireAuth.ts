"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";

interface UseRequireAuthOptions {
  requiredRole?: UserRole;
  redirectPath?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const { requiredRole, redirectPath = "/login" } = options;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace(redirectPath);
      } else if (requiredRole && role !== requiredRole) {
        // If role is required and doesn't match, redirect to a generic dashboard or login
        // This prevents students from accessing teacher pages and vice-versa
        // A more sophisticated app might redirect to an "access denied" page or the user's own dashboard
        router.replace(user.role === 'student' ? '/student/dashboard' : '/teacher/dashboard');
      }
    }
  }, [user, loading, role, requiredRole, router, redirectPath]);

  return { user, loading, role };
}
