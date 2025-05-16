"use client";

import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Users, BarChart3, Settings } from "lucide-react";
import Link from "next/link";

// Mock data for dashboard overview
const mockTeacherStats = {
  totalStudents: 120, // Example for all classes teacher might be involved with
  pendingAssignments: 5,
  upcomingEvents: 2,
};

export function TeacherDashboardClient() {
  return (
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeacherStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across your assigned classes</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Edit3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeacherStats.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">Homework/Assignments</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeacherStats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">School events this month</p>
          </CardContent>
        </Card>
         <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Settings</CardTitle>
            <Settings className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
             <Button variant="outline" size="sm" className="w-full">Profile Settings</Button>
             <p className="text-xs text-muted-foreground mt-1">Manage your account</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Manage Content</CardTitle>
            <CardDescription>Post notices, homework, circulars, textbooks, and gallery photos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/teacher/post-content">
              <Button className="w-full">
                <Edit3 className="mr-2 h-5 w-5" /> Go to Content Posting
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Student Data</CardTitle>
            <CardDescription>View and manage student profiles for your classes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/teacher/student-data">
              <Button className="w-full">
                <Users className="mr-2 h-5 w-5" /> View Student List
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* Placeholder for a list of recent activities or important alerts */}
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent activity to display. This section will show recent posts or student submissions.</p>
          {/* Example item:
          <div className="p-2 border-b">
            <p className="text-sm font-medium">Homework "Chapter 3 Qns" posted for Grade 5A.</p>
            <p className="text-xs text-muted-foreground">2 hours ago</p>
          </div>
          */}
        </CardContent>
      </Card>

    </div>
  );
}
