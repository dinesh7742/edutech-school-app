
"use client";

import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardLoading() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 w-full lg:col-span-2" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AdminDashboardClient />
    </Suspense>
  );
}
