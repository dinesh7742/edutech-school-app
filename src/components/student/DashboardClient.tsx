
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ClipboardList, FileText, BookOpen, Image as ImageIconLucide, UserCircle, Download, Loader2, Video, Tv2, ListChecks, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from "firebase/firestore";
import type { Notice, Homework, Circular, LiveClass } from "@/types";
import { TodaySpecial } from "@/components/shared/TodaySpecial";
import { StudentAttendanceSummary } from "@/components/student/StudentAttendanceSummary"; 

interface LatestContent<T> {
  item: T | null;
  loading: boolean;
}

const isNew = (timestamp: Timestamp | undefined): boolean => {
  if (!timestamp) return false;
  const itemDate = timestamp.toDate();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return itemDate > twentyFourHoursAgo;
};

export function StudentDashboardClient() {
  const { user } = useAuth();
  const [latestNotice, setLatestNotice] = useState<LatestContent<Notice>>({ item: null, loading: true });
  const [latestHomework, setLatestHomework] = useState<LatestContent<Homework>>({ item: null, loading: true });
  const [latestCircular, setLatestCircular] = useState<LatestContent<Circular>>({ item: null, loading: true });
  const [latestLiveClass, setLatestLiveClass] = useState<LatestContent<LiveClass>>({ item: null, loading: true });


  useEffect(() => {
    if (!user) return;

    const fetchGenericLatestItem = async <T extends { grade?: string | null; division?: string | null; timestamp?: Timestamp }>(
      collectionName: string,
      setter: React.Dispatch<React.SetStateAction<LatestContent<T>>>,
      dataMapper: (doc: any) => T
    ) => {
      setter(prev => ({ ...prev, loading: true }));
      try {
        const ref = collection(db, collectionName);
        // Fetch 5 most recent for client-side filtering for notices, circulars, live classes
        // This ensures we find a relevant item even if the absolute latest isn't for this student
        const q = query(ref, orderBy("timestamp", "desc"), limit(5)); 
        const snapshot = await getDocs(q);
        const allRecentItems = snapshot.docs.map(doc => dataMapper({ id: doc.id, ...doc.data() }));

        const relevantItem = allRecentItems.find(item => {
          if (!user.grade || !user.division) { 
             return !item.grade && !item.division; // Only school-wide if student has no grade/division
          }
          const isSchoolWide = !item.grade || item.grade === "";
          const isGradeMatch = item.grade === user.grade;
          const isDivisionMatch = item.division === user.division;
          const isGradeWideForUser = isGradeMatch && (!item.division || item.division === "");
          return isSchoolWide || (isGradeMatch && isDivisionMatch) || isGradeWideForUser;
        });
        setter({ item: relevantItem || null, loading: false });
      } catch (error) {
        console.error(`Error fetching latest ${collectionName}:`, error);
        setter({ item: null, loading: false });
      }
    };
    
    fetchGenericLatestItem<Notice>("notices", setLatestNotice, (data) => ({
      ...data,
      timestamp: data.timestamp as Timestamp,
      displayDate: data.timestamp ? new Date((data.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
    } as Notice));

    fetchGenericLatestItem<Circular>("circulars", setLatestCircular, (data) => ({
      ...data,
      timestamp: data.timestamp as Timestamp,
      displayDate: data.timestamp ? new Date((data.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
    } as Circular));

    fetchGenericLatestItem<LiveClass>("liveClasses", setLatestLiveClass, (data) => ({
      ...data,
      timestamp: data.timestamp as Timestamp,
      displayDate: data.timestamp ? new Date((data.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
    } as LiveClass));


    // Fetch Latest Homework (specific query for student's class)
    const fetchLatestHomework = async () => {
      if (!user.grade || !user.division) {
        setLatestHomework({ item: null, loading: false });
        return;
      }
      setLatestHomework(prev => ({ ...prev, loading: true }));
      try {
        const homeworkRef = collection(db, "homework");
        const q = query(
          homeworkRef,
          where("grade", "==", user.grade),
          where("division", "==", user.division),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const homeworkSnapshot = await getDocs(q);
        if (!homeworkSnapshot.empty) {
          const hwDoc = homeworkSnapshot.docs[0];
          const hwData = hwDoc.data();
          setLatestHomework({
            item: {
              id: hwDoc.id,
              ...hwData,
              timestamp: hwData.timestamp as Timestamp,
              displayDate: hwData.timestamp ? new Date((hwData.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
              dueDate: hwData.dueDate ? new Date(hwData.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A',
            } as Homework,
            loading: false,
          });
        } else {
          setLatestHomework({ item: null, loading: false });
        }
      } catch (error)
      {
        console.error("Error fetching latest homework:", error);
        setLatestHomework({ item: null, loading: false });
         if ((error as any).code === 'failed-precondition' && (error as any).message.includes('index')) {
             console.error("Firestore index required for homework query on student dashboard. Please create an index on 'homework' collection for fields: grade (ASC), division (ASC), timestamp (DESC).");
            // Optionally, you could use toast here to inform the admin/user if this is critical
        }
      }
    };
    fetchLatestHomework();

  }, [user]);

  const dashboardCards = [
    {
      id: "notices",
      title: "Notice Board",
      icon: Bell,
      link: "/student/notices",
      buttonText: "View All Notices",
      dataAiHint: "notification bell",
      description: "Latest school announcements and updates.",
      contentData: latestNotice,
      renderContent: (data: Notice | null) => data ? (
        <div className="text-left w-full space-y-1 p-2 border border-primary/50 rounded-md bg-background">
          <h3 className="font-semibold text-md truncate">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
            {isNew(data.timestamp) && <Badge variant="destructive" className="ml-2 text-xs">New</Badge>}
          </p>
          <p className="text-sm line-clamp-4 whitespace-pre-wrap">{data.content}</p>
        </div>
      ) : null,
      emptyMessage: "No new notices relevant to you."
    },
    {
      id: "homework",
      title: "Homework",
      icon: ClipboardList,
      link: "/student/homework",
      buttonText: "View All Homework",
      dataAiHint: "clipboard list",
      description: "Check your latest assignments and due dates.",
      contentData: latestHomework,
      renderContent: (data: Homework | null) => data ? (
        <div className="text-left w-full space-y-1 p-2 border border-primary/50 rounded-md bg-background">
          <h3 className="font-semibold text-md truncate">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            Subject: {data.subject} | Due: {data.dueDate} <br/>
            Posted: {data.displayDate} by {data.postedByName}
            {isNew(data.timestamp) && <Badge variant="destructive" className="ml-2 text-xs">New</Badge>}
          </p>
          {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap">{data.description}</p>}
          {data.fileUrl && (
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href={data.fileUrl} target="_blank" rel="noopener noreferrer" data-ai-hint="document sheet">
                <Download className="mr-2 h-4 w-4" /> {data.fileName || 'Download Attachment'}
              </a>
            </Button>
          )}
        </div>
      ) : null,
      emptyMessage: "No new homework for your class."
    },
    {
      id: "circulars",
      title: "Circulars",
      icon: FileText,
      link: "/student/circulars",
      buttonText: "View All Circulars",
      dataAiHint: "document file",
      description: "Important circulars and official communications.",
      contentData: latestCircular,
      renderContent: (data: Circular | null) => data ? (
         <div className="text-left w-full space-y-1 p-2 border border-primary/50 rounded-md bg-background">
          <h3 className="font-semibold text-md truncate">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
             {isNew(data.timestamp) && <Badge variant="destructive" className="ml-2 text-xs">New</Badge>}
          </p>
          {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap">{data.description}</p>}
          {data.fileUrl && (
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href={data.fileUrl} target="_blank" rel="noopener noreferrer" data-ai-hint="document letter">
                <Download className="mr-2 h-4 w-4" /> {data.fileName || 'Download Circular'}
              </a>
            </Button>
          )}
        </div>
      ) : null,
      emptyMessage: "No new circulars relevant to you."
    },
     {
      id: "liveClass",
      title: "Live Class",
      icon: Video,
      link: "/student/live-classes", 
      buttonText: "View All Live Classes",
      dataAiHint: "video conference",
      description: "Join scheduled live classes and sessions.",
      contentData: latestLiveClass,
      renderContent: (data: LiveClass | null) => data ? (
        <div className="text-left w-full space-y-2 p-2 border border-primary/50 rounded-md bg-background">
          <h3 className="font-semibold text-md truncate">{data.subject}</h3>
          <p className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
            {isNew(data.timestamp) && <Badge variant="destructive" className="ml-2 text-xs">New</Badge>}
          </p>
          {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap">{data.description}</p>}
          <Button asChild variant="destructive" size="sm" className="mt-2 w-full">
            <a href={data.meetingLink} target="_blank" rel="noopener noreferrer">
              Join Meeting
            </a>
          </Button>
        </div>
      ) : null,
      emptyMessage: "No live classes scheduled for you."
    },
    {
      id: "textbooks",
      title: "Textbooks",
      icon: BookOpen,
      link: "/student/textbooks",
      buttonText: "View Textbooks",
      dataAiHint: "book open",
      description: "Access your digital textbooks for all subjects.",
      contentData: null, 
      renderContent: null,
      emptyMessage: ""
    },
    {
      id: "gallery",
      title: "Photo Gallery",
      icon: ImageIconLucide,
      link: "/student/gallery",
      buttonText: "View Gallery",
      dataAiHint: "image landscape",
      description: "Explore photos from school events and activities.",
      contentData: null,
      renderContent: null,
      emptyMessage: ""
    },
  ];

  return (
    <div className="space-y-8">
      <WelcomeMessage />
      <StudentAttendanceSummary />
      <TodaySpecial />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => (
          <Card key={card.id} className="shadow-lg rounded-lg flex flex-col bg-card text-card-foreground text-center">
            <CardHeader>
              <div className="flex items-center justify-center mb-2">
                <card.icon className="h-12 w-12 text-primary" data-ai-hint={card.dataAiHint} />
              </div>
              <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                {card.title}
                {card.contentData?.item && isNew((card.contentData.item as any).timestamp) && (
                  <Badge variant="destructive" className="animate-pulse">New</Badge>
                )}
              </CardTitle>
               <CardDescription className="text-xs h-8 line-clamp-2">{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 min-h-[220px]">
              {card.renderContent && card.contentData?.loading && (
                <div className="flex flex-col items-center justify-center flex-grow">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading latest...</p>
                </div>
              )}
              {card.renderContent && !card.contentData?.loading && card.contentData?.item && (
                card.renderContent(card.contentData.item as any)
              )}
              {card.renderContent && !card.contentData?.loading && !card.contentData?.item && (
                <p className="text-muted-foreground text-sm px-4 text-center flex-grow flex items-center justify-center">{card.emptyMessage}</p>
              )}
              {!card.renderContent && ( 
                 <div className="flex-grow"></div> 
              )}
              <Button asChild className="w-full mt-auto">
                <Link href={card.link}>{card.buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
         <Card className="shadow-lg rounded-lg text-center flex flex-col bg-card text-card-foreground">
            <CardHeader>
                <div className="flex items-center justify-center mb-2">
                    <ListChecks className="h-12 w-12 text-primary" data-ai-hint="attendance list" />
                </div>
                <CardTitle className="text-xl font-semibold">My Attendance</CardTitle>
                <CardDescription className="text-xs h-8 line-clamp-2">View your detailed attendance records.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-4 min-h-[220px]">
              <div className="flex-grow"></div>
              <Button asChild className="w-full mt-auto">
                <Link href="/student/attendance">View Detailed Attendance</Link>
              </Button>
            </CardContent>
          </Card>
        <Card className="shadow-lg rounded-lg text-center flex flex-col bg-card text-card-foreground">
            <CardHeader>
                <div className="flex items-center justify-center mb-2">
                    <UserCircle className="h-12 w-12 text-primary" data-ai-hint="user profile" />
                </div>
                <CardTitle className="text-xl font-semibold">My Profile</CardTitle>
                <CardDescription className="text-xs h-8 line-clamp-2">Manage your personal information and settings.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-4 min-h-[220px]">
              <div className="flex-grow"></div>
              <Button asChild className="w-full mt-auto">
                <Link href="/student/profile">Go to Profile</Link>
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
