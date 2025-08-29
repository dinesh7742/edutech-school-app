
"use client";

import type React from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth({ requiredRole: "admin" });

  if (loading || !user) {
     return (
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-64 bg-white dark:bg-gray-800 p-4 space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <main className="container flex-grow py-8 px-4 md:px-6">
          <div className="space-y-6">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <AdminSidebar />
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
