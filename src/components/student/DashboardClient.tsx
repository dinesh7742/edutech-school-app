
"use client";

import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ClipboardList, FileText, BookOpen, Image as ImageIcon, UserCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock data - replace with actual data fetching
const mockNotices = [
  { id: "1", title: "School Reopens Tomorrow", content: "Please note that the school reopens tomorrow, August 1st, after the summer break. Regular classes will resume." },
  { id: "2", title: "Annual Sports Day", content: "The Annual Sports Day will be held on August 15th. All students are encouraged to participate." },
  { id: "3", title: "Parent-Teacher Meeting", content: "A Parent-Teacher Meeting is scheduled for August 20th from 9 AM to 12 PM." },
];

const mockHomework = [
  { id: "1", title: "Math Assignment Ch 5", subject: "Mathematics", dueDate: "2024-08-05", fileUrl: "https://placehold.co/200x100.png", dataAiHint: "document sheet" },
  { id: "2", title: "Science Project: Solar System", subject: "Science", dueDate: "2024-08-10", fileUrl: "https://placehold.co/200x100.png", dataAiHint: "document presentation" },
];

const mockCirculars = [
 { id: "1", title: "Fee Payment Reminder", date: "2024-07-28", fileUrl: "https://placehold.co/200x100.png", dataAiHint: "document letter" },
 { id: "2", title: "Holiday List 2024-25", date: "2024-07-20", fileUrl: "https://placehold.co/200x100.png", dataAiHint: "document calendar" },
];

const mockTextbooks = [
  { id: "1", title: "Mathematics Grade 5", subject: "Mathematics", fileUrl: "https://placehold.co/150x200.pdf", dataAiHint: "textbook math" },
  { id: "2", title: "Science Explorer Grade 5", subject: "Science", fileUrl: "https://placehold.co/150x200.pdf", dataAiHint: "textbook science" },
];

const mockGalleryEvents = [
  { id: "1", title: "Annual Day Celebration 2023", images: Array(5).fill(null).map((_, i) => ({ url: `https://placehold.co/600x400.png?id=${i}`, alt: `Event photo ${i+1}` })), dataAiHint: "school event" },
  { id: "2", title: "Science Exhibition", images: Array(5).fill(null).map((_, i) => ({ url: `https://placehold.co/600x400.png?id=sci${i}`, alt: `Exhibition photo ${i+1}`})), dataAiHint: "science fair" },
];


export function StudentDashboardClient() {
  return (
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Notice Board */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow border-2 border-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">Notice Board</CardTitle>
            <Bell className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] pr-4">
              <ul className="space-y-3">
                {mockNotices.map(notice => (
                  <li key={notice.id} className="p-3 bg-secondary/50 rounded-md border border-primary">
                    <h4 className="font-medium text-sm">{notice.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
             <Link href="/student/notices" className="text-sm text-primary hover:underline mt-4 block text-right">View All Notices</Link>
          </CardContent>
        </Card>

        {/* Homework */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">Homework</CardTitle>
            <ClipboardList className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] pr-4">
            <ul className="space-y-3">
              {mockHomework.map(hw => (
                <li key={hw.id} className="p-3 bg-secondary/50 rounded-md border border-primary">
                  <h4 className="font-medium text-sm">{hw.title}</h4>
                  <p className="text-xs text-muted-foreground">Subject: {hw.subject} | Due: {hw.dueDate}</p>
                  {hw.fileUrl && <a href={hw.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1" data-ai-hint={hw.dataAiHint}>View Attachment <ExternalLink size={12}/></a>}
                </li>
              ))}
            </ul>
            </ScrollArea>
             <Link href="/student/homework" className="text-sm text-primary hover:underline mt-4 block text-right">View All Homework</Link>
          </CardContent>
        </Card>

        {/* Circulars */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">Circulars</CardTitle>
            <FileText className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] pr-4">
            <ul className="space-y-3">
              {mockCirculars.map(circ => (
                <li key={circ.id} className="p-3 bg-secondary/50 rounded-md border border-primary">
                  <h4 className="font-medium text-sm">{circ.title}</h4>
                  <p className="text-xs text-muted-foreground">Date: {circ.date}</p>
                   {circ.fileUrl && <a href={circ.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1" data-ai-hint={circ.dataAiHint}>View Circular <ExternalLink size={12}/></a>}
                </li>
              ))}
            </ul>
            </ScrollArea>
             <Link href="/student/circulars" className="text-sm text-primary hover:underline mt-4 block text-right">View All Circulars</Link>
          </CardContent>
        </Card>

        {/* Textbooks */}
        <Card className="md:col-span-2 lg:col-span-1 shadow-lg hover:shadow-xl transition-shadow border-2 border-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">Textbooks</CardTitle>
            <BookOpen className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
             <ScrollArea className="h-[250px] pr-4">
            <ul className="space-y-3">
              {mockTextbooks.map(book => (
                <li key={book.id} className="p-3 bg-secondary/50 rounded-md border border-primary">
                  <h4 className="font-medium text-sm">{book.title}</h4>
                  <p className="text-xs text-muted-foreground">Subject: {book.subject}</p>
                  <a href={book.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1" data-ai-hint={book.dataAiHint}>Download PDF <ExternalLink size={12}/></a>
                </li>
              ))}
            </ul>
            </ScrollArea>
             <Link href="/student/textbooks" className="text-sm text-primary hover:underline mt-4 block text-right">View All Textbooks</Link>
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        <Card className="md:col-span-2 shadow-lg hover:shadow-xl transition-shadow border-2 border-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">Photo Gallery</CardTitle>
            <ImageIcon className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-4">
                {mockGalleryEvents.map(event => (
                  <div key={event.id}>
                    <h4 className="font-medium text-md mb-2">{event.title}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {event.images.slice(0,5).map((img, idx) => ( // Show up to 5 images
                         <Image key={idx} src={img.url} alt={img.alt || event.title} width={100} height={100} className="rounded-md object-cover aspect-square" data-ai-hint={event.dataAiHint} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Link href="/student/gallery" className="text-sm text-primary hover:underline mt-4 block text-right">View Full Gallery</Link>
          </CardContent>
        </Card>
        
        {/* My Self / Profile Link */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-2 border-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">My Profile</CardTitle>
            <UserCircle className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">View and update your personal information.</p>
            <Link href="/student/profile" className="text-primary font-medium hover:underline">
              Go to My Profile
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

