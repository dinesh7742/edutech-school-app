"use client";

import type React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const StudentDashboardPage = dynamic(
  () => import("@/app/student/dashboard/page"),
  { 
    ssr: false,
    loading: () => (
        <div className="flex flex-col min-h-screen">
            <Navbar />
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
            <Footer />
        </div>
    )
  }
);


export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth({ requiredRole: "student" });

  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
