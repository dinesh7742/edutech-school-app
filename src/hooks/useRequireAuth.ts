
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
        console.log('[useRequireAuth] No user found. Redirecting to:', redirectPath);
        router.replace(redirectPath);
      } else if (requiredRole && role !== requiredRole) {
        const targetDashboard = user.role === 'student' ? '/student/dashboard' : '/teacher/dashboard';
        console.log(`[useRequireAuth] Role mismatch. User role: '${role}', Required role: '${requiredRole}'. Redirecting to user's dashboard: ${targetDashboard}`);
        router.replace(targetDashboard);
      } else {
        // console.log('[useRequireAuth] Auth check passed. User is authorized.');
      }
    }
  }, [user, loading, role, requiredRole, router, redirectPath]);

  return { user, loading, role };
}
