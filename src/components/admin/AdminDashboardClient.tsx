
"use client";

import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Settings, ShieldCheck, Edit } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function AdminDashboardClient() {
  const { user } = useAuth();

  const adminTasks = [
    {
      title: "User Management",
      description: "View, edit, and manage all user accounts (students, teachers, admins).",
      icon: Users,
      link: "/admin/user-management", // Placeholder link, page to be created
      buttonText: "Manage Users",
      dataAiHint: "group users profile"
    },
    {
      title: "Content Management",
      description: "Oversee and manage all posted content like notices, homework, circulars.",
      icon: Edit,
      link: "/admin/content-management", // Placeholder link, page to be created
      buttonText: "Manage Content",
      dataAiHint: "edit document"
    },
    {
      title: "System Settings",
      description: "Configure application-wide settings and parameters.",
      icon: Settings,
      link: "/admin/system-settings", // Placeholder link, page to be created
      buttonText: "System Settings",
      dataAiHint: "gear settings"
    },
    {
      title: "Security & Roles",
      description: "Manage user roles and system security configurations.",
      icon: ShieldCheck,
      link: "/admin/security", // Placeholder link, page to be created
      buttonText: "Security Settings",
      dataAiHint: "shield check security"
    },
  ];

  return (
    <div className="space-y-8">
      <WelcomeMessage />
      <p className="text-lg text-muted-foreground">
        This is the Admin Dashboard. You have overarching permissions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminTasks.map((task) => (
          <Card key={task.title} className="shadow-lg rounded-lg flex flex-col text-center">
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <task.icon className="h-16 w-16 text-primary" data-ai-hint={task.dataAiHint}/>
              </div>
              <CardTitle className="text-xl font-semibold">{task.title}</CardTitle>
              <CardDescription className="text-sm h-12 line-clamp-2">{task.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-end pt-2 pb-6">
              <Button asChild className="w-full mt-auto">
                <Link href={task.link}>{task.buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
       <p className="text-sm text-muted-foreground pt-4">
        Note: The links above are placeholders. Specific admin functionalities for user and content management need to be built out.
      </p>
    </div>
  );
}
