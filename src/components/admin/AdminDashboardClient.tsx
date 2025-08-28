
"use client";

import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Users, Edit, Settings, ShieldCheck, BarChart3, Database } from "lucide-react";

export function AdminDashboardClient() {
  const { user } = useAuth();

  const adminTasks = [
    {
      title: "User Management",
      description: "View, edit, promote, and manage all user accounts (students, teachers, admins).",
      link: "/teacher/student-data", // Reusing teacher's student data view for now
      buttonText: "Manage Users",
      icon: Users,
    },
    {
      title: "Content Management",
      description: "Oversee and post school-wide content like notices, homework, circulars.",
      link: "/teacher/post-content", // Reusing teacher's post content for now
      buttonText: "Manage Content",
      icon: Edit,
    },
    {
      title: "School-wide Analytics",
      description: "View overall school statistics, attendance trends, and performance data.",
      link: "#", // Placeholder
      buttonText: "View Analytics",
      icon: BarChart3,
    },
    {
        title: "Backup & Restore",
        description: "Manage school data backups and restore options.",
        link: "#", // Placeholder
        buttonText: "Manage Data",
        icon: Database,
    },
    {
      title: "System Settings",
      description: "Configure application-wide settings, academic years, and parameters.",
      link: "#", // Placeholder
      buttonText: "System Settings",
      icon: Settings,
    },
    {
      title: "Security & Roles",
      description: "Manage user roles, permissions, and system security configurations.",
      link: "#", // Placeholder
      buttonText: "Security Settings",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <WelcomeMessage />
      <p className="text-lg text-muted-foreground">
        This is the Admin Control Center. From here, you have full administrative privileges over the application.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminTasks.map((task) => (
          <Card key={task.title} className="shadow-lg rounded-lg flex flex-col text-center transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <task.icon className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">{task.title}</CardTitle>
              <CardDescription className="text-sm h-12 line-clamp-2">{task.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-end pt-2 pb-6">
              <Button asChild className="w-full mt-auto" disabled={task.link === '#'}>
                <Link href={task.link}>{task.link === '#' ? 'Coming Soon' : task.buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
