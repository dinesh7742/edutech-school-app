
"use client";

import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ClipboardList, FileText, BookOpen, Image as ImageIcon, UserCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
// import Image from "next/image"; // Removed Image as it was for mock gallery
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock data - replace with actual data fetching for summaries
const mockNotices = [
  { id: "1", title: "School Reopens Tomorrow", content: "Please note that the school reopens tomorrow, August 1st, after the summer break. Regular classes will resume." },
  { id: "2", title: "Annual Sports Day", content: "The Annual Sports Day will be held on August 15th. All students are encouraged to participate." },
  { id: "3", title: "Parent-Teacher Meeting", content: "A Parent-Teacher Meeting is scheduled for August 20th from 9 AM to 12 PM." },
];

const mockHomework = [
  { id: "1", title: "Math Assignment Ch 5", subject: "Mathematics", dueDate: "2024-08-05", fileUrl: "#", dataAiHint: "document sheet" },
  { id: "2", title: "Science Project: Solar System", subject: "Science", dueDate: "2024-08-10", fileUrl: "#", dataAiHint: "document presentation" },
];

const mockCirculars = [
 { id: "1", title: "Fee Payment Reminder", date: "2024-07-28", fileUrl: "#", dataAiHint: "document letter" },
 { id: "2", title: "Holiday List 2024-25", date: "2024-07-20", fileUrl: "#", dataAiHint: "document calendar" },
];

const mockTextbooks = [
  { id: "1", title: "Mathematics Grade 5", subject: "Mathematics", fileUrl: "#", dataAiHint: "textbook math" },
  { id: "2", title: "Science Explorer Grade 5", subject: "Science", fileUrl: "#", dataAiHint: "textbook science" },
];

const dashboardItems = [
  {
    title: "Notice Board",
    icon: Bell,
    description: "View important school announcements and updates.",
    link: "/student/notices",
    buttonText: "View Notices",
    data: mockNotices, // Optional: for inline summary if needed
    summaryField: 'title',
    dataAiHint: "notification bell"
  },
  {
    title: "Homework",
    icon: ClipboardList,
    description: "Check your latest assignments and due dates.",
    link: "/student/homework",
    buttonText: "View Homework",
    data: mockHomework,
    summaryField: 'title',
    dataAiHint: "clipboard list"
  },
  {
    title: "Circulars",
    icon: FileText,
    description: "Access official school circulars and documents.",
    link: "/student/circulars",
    buttonText: "View Circulars",
    data: mockCirculars,
    summaryField: 'title',
    dataAiHint: "document file"
  },
  {
    title: "Textbooks",
    icon: BookOpen,
    description: "Find and download your digital textbooks.",
    link: "/student/textbooks",
    buttonText: "View Textbooks",
    data: mockTextbooks,
    summaryField: 'title',
    dataAiHint: "book open"
  },
  {
    title: "Photo Gallery",
    icon: ImageIcon,
    description: "Explore photos from school events and activities.",
    link: "/student/gallery",
    buttonText: "View Gallery",
    data: [], // No inline summary for gallery on dashboard
    dataAiHint: "image landscape"
  },
  {
    title: "My Profile",
    icon: UserCircle,
    description: "Manage your personal information and settings.",
    link: "/student/profile",
    buttonText: "Go to Profile",
    data: [],
    dataAiHint: "user profile"
  },
];

export function StudentDashboardClient() {
  return (
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map((item) => (
          <Card key={item.title} className="shadow-lg rounded-lg text-center">
            <CardContent className="flex flex-col items-center justify-between pt-6 pb-6 space-y-4 min-h-[280px] sm:min-h-[320px]">
              <div className="flex flex-col items-center space-y-2">
                <item.icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-3" data-ai-hint={item.dataAiHint} />
                <CardTitle className="text-lg sm:text-xl font-semibold">{item.title}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-4 h-12 line-clamp-3 overflow-hidden">
                  {item.description}
                </p>
              </div>
              
              {/* Optional: Display a few items from the mock data as a quick summary */}
              {/* This part is illustrative and may need more refined styling or be removed if not desired */}
              {item.data && item.data.length > 0 && item.summaryField && (
                <ScrollArea className="h-[100px] w-full px-4 text-left my-2">
                  <ul className="space-y-1 text-xs">
                    {item.data.slice(0, 3).map((dataItem: any) => (
                      <li key={dataItem.id} className="p-1.5 bg-background/70 rounded-md border border-border truncate">
                        {dataItem[item.summaryField!]}
                         {dataItem.subject && <span className="text-muted-foreground text-xs"> ({dataItem.subject})</span>}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}


              <Button asChild className="w-full mt-auto">
                <Link href={item.link}>{item.buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
