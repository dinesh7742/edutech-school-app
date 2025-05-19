
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
        const targetDashboard = user.role === 'student' ? '/student/dashboard' : '/teacher/dashboard';
        router.replace(targetDashboard);
      }
    }
  }, [user, loading, role, requiredRole, router, redirectPath]);

  return { user, loading, role };
}
