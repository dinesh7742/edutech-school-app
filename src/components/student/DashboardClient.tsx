
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ClipboardList, FileText, BookOpen, Image as ImageIconLucide, UserCircle, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from "firebase/firestore";
import type { Notice, Homework, Circular } from "@/types";

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

  useEffect(() => {
    if (!user) return;

    // Fetch Latest Notice
    const fetchLatestNotice = async () => {
      setLatestNotice(prev => ({ ...prev, loading: true }));
      try {
        const noticesRef = collection(db, "notices");
        // Fetch a few recent notices to filter client-side for relevance
        const q = query(noticesRef, orderBy("timestamp", "desc"), limit(5));
        const noticeSnapshot = await getDocs(q);
        const allRecentNotices = noticeSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp as Timestamp,
          displayDate: doc.data().timestamp ? new Date((doc.data().timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
        })) as Notice[];

        const relevantNotice = allRecentNotices.find(notice => {
          if (!user.grade || !user.division) return !notice.grade && !notice.division; // School-wide only if user details incomplete
          const isSchoolWide = !notice.grade || notice.grade === "";
          const isGradeMatch = notice.grade === user.grade;
          const isDivisionMatch = notice.division === user.division;
          const isGradeWideForUser = isGradeMatch && (!notice.division || notice.division === "");
          return isSchoolWide || (isGradeMatch && isDivisionMatch) || isGradeWideForUser;
        });
        setLatestNotice({ item: relevantNotice || null, loading: false });
      } catch (error) {
        console.error("Error fetching latest notice:", error);
        setLatestNotice({ item: null, loading: false });
      }
    };

    // Fetch Latest Homework
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
      } catch (error) {
        console.error("Error fetching latest homework:", error);
        setLatestHomework({ item: null, loading: false });
      }
    };

    // Fetch Latest Circular
    const fetchLatestCircular = async () => {
      setLatestCircular(prev => ({ ...prev, loading: true }));
      try {
        const circularsRef = collection(db, "circulars");
        // Fetch a few recent circulars to filter client-side for relevance
        const q = query(circularsRef, orderBy("timestamp", "desc"), limit(5));
        const circularSnapshot = await getDocs(q);
        const allRecentCirculars = circularSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp as Timestamp,
          displayDate: doc.data().timestamp ? new Date((doc.data().timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
        })) as Circular[];

        const relevantCircular = allRecentCirculars.find(circ => {
          if (!user.grade || !user.division) return !circ.grade && !circ.division;
          const isSchoolWide = !circ.grade || circ.grade === "";
          const isGradeMatch = circ.grade === user.grade;
          const isDivisionMatch = circ.division === user.division;
          const isGradeWideForUser = isGradeMatch && (!circ.division || circ.division === "");
          return isSchoolWide || (isGradeMatch && isDivisionMatch) || isGradeWideForUser;
        });
        setLatestCircular({ item: relevantCircular || null, loading: false });
      } catch (error) {
        console.error("Error fetching latest circular:", error);
        setLatestCircular({ item: null, loading: false });
      }
    };

    fetchLatestNotice();
    fetchLatestHomework();
    fetchLatestCircular();

  }, [user]);

  const dashboardCards = [
    {
      id: "notices",
      title: "Notice Board",
      icon: Bell,
      link: "/student/notices",
      buttonText: "View All Notices",
      dataAiHint: "notification bell",
      contentData: latestNotice,
      renderContent: (data: Notice | null) => data && (
        <div className="text-left w-full space-y-1">
          <h3 className="font-semibold text-md truncate">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
          </p>
          <p className="text-sm line-clamp-4 whitespace-pre-wrap">{data.content}</p>
        </div>
      ),
      emptyMessage: "No new notices relevant to you."
    },
    {
      id: "homework",
      title: "Homework",
      icon: ClipboardList,
      link: "/student/homework",
      buttonText: "View All Homework",
      dataAiHint: "clipboard list",
      contentData: latestHomework,
      renderContent: (data: Homework | null) => data && (
        <div className="text-left w-full space-y-1">
          <h3 className="font-semibold text-md truncate">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            Subject: {data.subject} | Due: {data.dueDate} <br/>
            Posted: {data.displayDate} by {data.postedByName}
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
      ),
      emptyMessage: "No new homework for your class."
    },
    {
      id: "circulars",
      title: "Circulars",
      icon: FileText,
      link: "/student/circulars",
      buttonText: "View All Circulars",
      dataAiHint: "document file",
      contentData: latestCircular,
      renderContent: (data: Circular | null) => data && (
        <div className="text-left w-full space-y-1">
          <h3 className="font-semibold text-md truncate">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
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
      ),
      emptyMessage: "No new circulars relevant to you."
    },
  ];

  const actionCards = [
    {
      title: "Textbooks",
      icon: BookOpen,
      description: "Find and download your digital textbooks.",
      link: "/student/textbooks",
      buttonText: "View Textbooks",
      dataAiHint: "book open"
    },
    {
      title: "Photo Gallery",
      icon: ImageIconLucide,
      description: "Explore photos from school events and activities.",
      link: "/student/gallery",
      buttonText: "View Gallery",
      dataAiHint: "image landscape"
    },
    {
      title: "My Profile",
      icon: UserCircle,
      description: "Manage your personal information and settings.",
      link: "/student/profile",
      buttonText: "Go to Profile",
      dataAiHint: "user profile"
    },
  ];

  return (
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => (
          <Card key={card.id} className="shadow-lg rounded-lg flex flex-col">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-2">
                <card.icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" data-ai-hint={card.dataAiHint} />
              </div>
              <CardTitle className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2">
                {card.title}
                {card.contentData?.item && isNew(card.contentData.item.timestamp) && (
                  <Badge variant="destructive" className="animate-pulse">New</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3">
              {card.contentData?.loading ? (
                <div className="flex flex-col items-center justify-center min-h-[100px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading latest {card.title.toLowerCase()}...</p>
                </div>
              ) : card.contentData?.item ? (
                card.renderContent(card.contentData.item as any)
              ) : (
                <p className="text-muted-foreground text-sm px-4 text-center min-h-[100px] flex items-center">{card.emptyMessage}</p>
              )}
              <Button asChild className="w-full mt-auto">
                <Link href={card.link}>{card.buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {actionCards.map((item) => (
          <Card key={item.title} className="shadow-lg rounded-lg text-center flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-center mb-2">
                    <item.icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" data-ai-hint={item.dataAiHint} />
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-4 h-12 line-clamp-3 overflow-hidden">
                {item.description}
              </p>
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

    