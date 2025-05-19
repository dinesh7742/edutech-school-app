
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
        // If a required role is specified and the user's role doesn't match,
        // redirect them to their own default dashboard or to the login page if no role.
        let targetDashboard = "/login";
        if (user.role === 'student') {
          targetDashboard = '/student/dashboard';
        } else if (user.role === 'teacher') {
          targetDashboard = '/teacher/dashboard';
        } else if (user.role === 'admin') {
          targetDashboard = '/admin/dashboard';
        }
        router.replace(targetDashboard);
      }
    }
  }, [user, loading, role, requiredRole, router, redirectPath]);

  return { user, loading, role };
}
