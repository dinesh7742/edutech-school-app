"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

// Mock data - replace with actual data fetching
const mockNotices = [
  { id: "1", title: "School Reopens Tomorrow", content: "Please note that the school reopens tomorrow, August 1st, after the summer break. Regular classes will resume according to the usual schedule. Ensure all holiday homework is submitted.", date: "2024-07-31" },
  { id: "2", title: "Annual Sports Day", content: "The Annual Sports Day will be held on August 15th. All students are encouraged to participate in various events. Practice sessions will be held post-school hours. Contact sports teacher for details.", date: "2024-07-25" },
  { id: "3", title: "Parent-Teacher Meeting", content: "A Parent-Teacher Meeting is scheduled for August 20th from 9 AM to 12 PM to discuss student progress. Attendance of at least one parent is mandatory.", date: "2024-07-22" },
  { id: "4", title: "Library Books Return", content: "All students are requested to return overdue library books by August 5th to avoid fines. New book issuance will be paused for defaulters.", date: "2024-07-20" },
];


export default function StudentNoticesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <Bell className="h-8 w-8" />
        All Notices
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockNotices.map(notice => (
          <Card key={notice.id} className="shadow-lg">
            <CardHeader>
              <CardTitle>{notice.title}</CardTitle>
              <p className="text-xs text-muted-foreground">Posted on: {notice.date}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{notice.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
       {mockNotices.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No notices available at the moment.</p>
      )}
    </div>
  );
}
