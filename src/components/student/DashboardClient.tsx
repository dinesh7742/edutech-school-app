
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ClipboardList, FileText, BookOpen, Image as ImageIconLucide, UserCircle, Download, Loader2, Video, ListChecks, CalendarPlus, Hourglass, AlertTriangle, FileSignature, Edit, FileArchive, CheckCircle, MailOpen } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { Notice, Homework, Circular, LiveClass, HomeworkSubmission, LeaveApplication, LateArrivalApplication } from "@/types";
import { TodaySpecial } from "@/components/shared/TodaySpecial";
import { StudentAttendanceSummary } from "@/components/student/StudentAttendanceSummary";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";


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

const getStatusBadgeVariant = (status?: LeaveApplication['status'] | LateArrivalApplication['status']) => {
  if (!status) return "default";
  switch (status) {
    case "Pending":
      return "outline";
    case "Approved":
      return "accent";
    case "Rejected":
      return "destructive";
    default:
      return "default";
  }
};

const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      // Assuming dateString is 'YYYY-MM-DD'
      return format(parseISO(dateString), "dd MMM yyyy");
    } catch (e) {
      // Fallback if parseISO fails (e.g., dateString is not in expected format)
      return dateString;
    }
};


export function StudentDashboardClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [latestNotice, setLatestNotice] = useState<LatestContent<Notice>>({ item: null, loading: true });
  const [latestHomework, setLatestHomework] = useState<LatestContent<Homework>>({ item: null, loading: true });
  const [latestCircular, setLatestCircular] = useState<LatestContent<Circular>>({ item: null, loading: true });
  const [latestLiveClass, setLatestLiveClass] = useState<LatestContent<LiveClass>>({ item: null, loading: true });
  const [latestLeaveApplication, setLatestLeaveApplication] = useState<LatestContent<LeaveApplication>>({ item: null, loading: true });
  const [latestLateArrivalRequest, setLatestLateArrivalRequest] = useState<LatestContent<LateArrivalApplication>>({ item: null, loading: true });


  const [isLatestHomeworkCompleted, setIsLatestHomeworkCompleted] = useState(false);
  const [completingHomework, setCompletingHomework] = useState(false);


  useEffect(() => {
    if (!user) return;

    const fetchGenericLatestItem = async <T extends { grade?: string | null; division?: string | null; timestamp?: Timestamp }>(
      collectionName: string,
      setter: React.Dispatch<React.SetStateAction<LatestContent<T>>>,
      dataMapper: (doc: any) => T,
      useTimestampField: keyof T = "timestamp" as keyof T
    ) => {
      setter(prev => ({ ...prev, loading: true }));
      try {
        const ref = collection(db, collectionName);
        // Fetch the 5 most recent items overall, then filter client-side for relevance
        const q = query(ref, orderBy(useTimestampField as string, "desc"), limit(5));
        const snapshot = await getDocs(q);
        const allRecentItems = snapshot.docs.map(doc => dataMapper({ id: doc.id, ...doc.data() }));

        // Client-side filtering logic to find the single most relevant item for the student
        const relevantItem = allRecentItems.find(item => {
          if (!user.grade || !user.division) {
             // If student's grade/division is unknown, only show school-wide items
             return !item.grade && !item.division;
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


    const fetchLatestHomework = async () => {
      if (!user?.uid || !user?.grade || !user?.division) {
        setLatestHomework({ item: null, loading: false });
        setIsLatestHomeworkCompleted(false);
        return;
      }
      setLatestHomework(prev => ({ ...prev, loading: true }));
      setIsLatestHomeworkCompleted(false); // Reset completion status on new fetch

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
          const currentHomeworkItem = {
            id: hwDoc.id,
            ...hwData,
            timestamp: hwData.timestamp as Timestamp,
            displayDate: hwData.timestamp ? new Date((hwData.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
            // Ensure dueDate is handled correctly, even if it's just a date string from Firestore
            dueDate: hwData.dueDate ? new Date(hwData.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A',
          } as Homework;
          setLatestHomework({ item: currentHomeworkItem, loading: false });

          // Check if this specific homework has been submitted
          const submissionDocId = `${currentHomeworkItem.id}_${user.uid}`;
          const submissionDocRef = doc(db, "homeworkSubmissions", submissionDocId);
          const submissionSnap = await getDoc(submissionDocRef);
          setIsLatestHomeworkCompleted(submissionSnap.exists());

        } else {
          setLatestHomework({ item: null, loading: false });
          setIsLatestHomeworkCompleted(false);
        }
      } catch (error) {
        console.error("Error fetching latest homework:", error);
        setLatestHomework({ item: null, loading: false });
        setIsLatestHomeworkCompleted(false);
         // Specific error handling for missing Firestore index
         if ((error as any).code === 'failed-precondition' && (error as any).message.includes('index')) {
             console.error("Firestore index required for homework query on student dashboard. Please create an index on 'homework' collection for fields: grade (ASC), division (ASC), timestamp (DESC).");
             toast({title: "Error", description: "A database configuration is needed for homework. Please inform your administrator.", variant: "destructive"});
        }
      }
    };
    fetchLatestHomework();

    const fetchLatestApplicationStatus = async <T extends { studentUid: string; applicationDate?: Timestamp; applicationTimestamp?: Timestamp }>(
        collectionName: string,
        setter: React.Dispatch<React.SetStateAction<LatestContent<T>>>,
        timestampField: keyof T // 'applicationDate' for leave, 'applicationTimestamp' for late arrival
      ) => {
        if (!user?.uid) {
          setter({ item: null, loading: false });
          return;
        }
        setter(prev => ({ ...prev, loading: true }));
        try {
          const appsRef = collection(db, collectionName);
          const q = query(
            appsRef,
            where("studentUid", "==", user.uid),
            orderBy(timestampField as string, "desc"),
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const appDoc = snapshot.docs[0];
            setter({ item: { id: appDoc.id, ...appDoc.data() } as T, loading: false });
          } else {
            setter({ item: null, loading: false });
          }
        } catch (error: any) {
          console.error(`Error fetching latest ${collectionName}:`, error);
          setter({ item: null, loading: false });
          if ((error as any).code === 'failed-precondition' && (error as any).message.includes('index')) {
            console.error(`Firestore index required for ${collectionName} query. Collection: '${collectionName}', Fields: studentUid (ASC), ${timestampField as string} (DESC).`);
            toast({title: "Error", description: `Database setup needed for ${collectionName} status. Contact admin.`, variant: "destructive"});
          }
        }
      };

    fetchLatestApplicationStatus<LeaveApplication>("leaveApplications", setLatestLeaveApplication, "applicationDate");
    fetchLatestApplicationStatus<LateArrivalApplication>("lateArrivalRequests", setLatestLateArrivalRequest, "applicationTimestamp");


  }, [user, toast]);

  const handleMarkHomeworkCompleted = async (homeworkItem: Homework) => {
    if (!user || !homeworkItem || !user.uid || !user.grade || !user.division) {
      toast({ title: "Error", description: "User or homework details missing.", variant: "destructive"});
      return;
    }
    setCompletingHomework(true);
    const submissionDocId = `${homeworkItem.id}_${user.uid}`;
    const submissionDocRef = doc(db, "homeworkSubmissions", submissionDocId);

    const submissionData: HomeworkSubmission = {
      homeworkId: homeworkItem.id,
      studentId: user.uid,
      studentName: user.displayName || "Unknown Student",
      grade: user.grade,
      division: user.division,
      homeworkTitle: homeworkItem.title,
      completedAt: serverTimestamp(),
      status: 'completed',
    };

    try {
      await setDoc(submissionDocRef, submissionData);
      setIsLatestHomeworkCompleted(true);
      toast({
        title: "Homework Marked!",
        description: `"${homeworkItem.title}" marked as completed.`,
      });
      console.log("TODO: Notify teacher about homework completion for homeworkId:", homeworkItem.id, "by studentId:", user.uid);
    } catch (error: any) {
      console.error("Error marking homework as completed:", error);
      toast({
        title: "Error",
        description: `Could not mark homework as completed. ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setCompletingHomework(false);
    }
  };


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
        <div className="text-left w-full space-y-1 p-1 sm:p-2 border-primary rounded-md bg-background">
          <h3 className="font-semibold text-md">{data.title}</h3>
          <div className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
            {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
          </div>
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
        <div className="text-left w-full space-y-1 p-1 sm:p-2 border-primary rounded-md bg-background">
          <h3 className="font-semibold text-md">{data.title}</h3>
          <div className="text-xs text-muted-foreground">
            Subject: {data.subject} | Due: {data.dueDate} <br/>
            Posted: {data.displayDate} by {data.postedByName}
            {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
          </div>
          {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap">{data.description}</p>}
          {data.fileUrl && (
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href={data.fileUrl} target="_blank" rel="noopener noreferrer" data-ai-hint="document sheet">
                <Download className="mr-2 h-4 w-4" /> {data.fileName || 'Download Attachment'}
              </a>
            </Button>
          )}
          {data && !isLatestHomeworkCompleted && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => handleMarkHomeworkCompleted(data)}
              disabled={completingHomework}
            >
              {completingHomework && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Completed
            </Button>
          )}
          {data && isLatestHomeworkCompleted && (
            <Badge variant="accent" className="mt-2 w-full flex items-center justify-center text-center py-2 px-4 text-sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              Homework Completed
            </Badge>
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
         <div className="text-left w-full space-y-1 p-1 sm:p-2 border-primary rounded-md bg-background">
          <h3 className="font-semibold text-md">{data.title}</h3>
          <div className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
             {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
          </div>
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
        <div className="text-left w-full space-y-2 p-1 sm:p-2 border-primary rounded-md bg-background">
          <h3 className="font-semibold text-md">{data.subject}</h3>
          <div className="text-xs text-muted-foreground">
            Posted: {data.displayDate} by {data.postedByName}
            {data.grade && ` | For: Grade ${data.grade}${data.division ? ` Div ${data.division}` : ' (All Div)'}`}
            {!data.grade && ' | School Wide'}
            {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
          </div>
          {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap">{data.description}</p>}
          <Button asChild variant="destructive" size="sm" className="mt-2 w-full">
            <a href={data.meetingLink} target="_blank" rel="noopener noreferrer" data-ai-hint="video play">
              Join Meeting
            </a>
          </Button>
        </div>
      ) : null,
      emptyMessage: "No live classes scheduled for you."
    },
     {
      id: "applyLeave",
      title: "Leave Application Status",
      icon: MailOpen,
      link: "/student/apply-leave",
      buttonText: "Apply or View History",
      dataAiHint: "mail letter envelope",
      description: "View the status of your recent leave application or submit a new one.",
      contentData: latestLeaveApplication,
      renderContent: (data: LeaveApplication | null) => data ? (
        <div className="text-left w-full space-y-1 p-1 sm:p-2 border-primary rounded-md bg-background">
          <p className="text-sm"><strong>Applied:</strong> {data.applicationDate ? format(data.applicationDate.toDate(), "PP") : "N/A"}</p>
          <p className="text-sm"><strong>Dates:</strong> {formatDateDisplay(data.leaveStartDate)} - {formatDateDisplay(data.leaveEndDate)}</p>
          <p className="text-sm"><strong>Reason:</strong> {data.reason}</p>
          <div className="flex items-center gap-2">
             <p className="text-sm font-medium">Status:</p>
            <Badge variant={getStatusBadgeVariant(data.status)}>{data.status}</Badge>
          </div>
          {data.teacherComments && (
            <p className="text-sm mt-1 pt-1 border-t border-muted"><strong>Teacher's Comment:</strong> <span className="whitespace-pre-wrap">{data.teacherComments}</span></p>
          )}
        </div>
      ) : null,
      emptyMessage: "You haven't applied for leave recently."
    },
    {
      id: "lateArrivalRequest",
      title: "Late Arrival / Early Departure",
      icon: AlertTriangle,
      link: "/student/late-arrival",
      buttonText: "Submit or View History",
      dataAiHint: "alert triangle time",
      description: "Request permission for late arrival or early departure. View status of recent requests.",
      contentData: latestLateArrivalRequest,
      renderContent: (data: LateArrivalApplication | null) => data ? (
        <div className="text-left w-full space-y-1 p-1 sm:p-2 border-primary rounded-md bg-background">
          <p className="text-sm"><strong>Requested for:</strong> {formatDateDisplay(data.requestDate)} at {data.time}</p>
          <p className="text-sm"><strong>Type:</strong> {data.type}</p>
          <p className="text-sm"><strong>Reason:</strong> {data.reason}</p>
           <div className="flex items-center gap-2">
             <p className="text-sm font-medium">Status:</p>
            <Badge variant={getStatusBadgeVariant(data.status)}>{data.status}</Badge>
          </div>
          {data.teacherComments && (
            <p className="text-sm mt-1 pt-1 border-t border-muted"><strong>Teacher's Comment:</strong> <span className="whitespace-pre-wrap">{data.teacherComments}</span></p>
          )}
        </div>
      ) : null,
      emptyMessage: "No recent late arrival or early departure requests."
    },
    {
      id: "mySchoolApplications",
      title: "My School Applications",
      icon: FileSignature,
      link: "/student/my-applications",
      buttonText: "Access Forms & Applications",
      dataAiHint: "form signature document",
      description: "Submit online applications for leave, late arrivals, TC, etc., or download various blank PDF forms.",
      contentData: null, 
      renderContent: null,
      emptyMessage: "" 
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
    }
  ];

  return (
    <div className="space-y-8">
      <WelcomeMessage />
      <StudentAttendanceSummary />
      <TodaySpecial />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => (
          <Card key={card.id} className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-2 pt-4 items-center">
               <card.icon className="h-16 w-16 text-primary" data-ai-hint={card.dataAiHint}/>
              <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                {card.title}
                {card.contentData?.item && isNew(
                    (card.contentData.item as any).timestamp ||
                    (card.contentData.item as LeaveApplication).applicationDate ||
                    (card.contentData.item as LateArrivalApplication).applicationTimestamp
                    ) && (
                  <Badge variant="highlight" className="animate-pulse">New!</Badge>
                )}
                 {(card.id === 'applyLeave' && latestLeaveApplication.item?.status === "Pending") && (
                    <Hourglass className="h-4 w-4 text-orange-500 animate-spin" />
                 )}
                 {(card.id === 'lateArrivalRequest' && latestLateArrivalRequest.item?.status === "Pending") && (
                    <Hourglass className="h-4 w-4 text-orange-500 animate-spin" />
                 )}
              </CardTitle>
               <CardDescription className="text-sm min-h-[3rem] px-2">{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
              {card.renderContent && card.contentData?.loading && (
                <div className="flex flex-col items-center justify-center flex-grow py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading latest...</p>
                </div>
              )}
              {card.renderContent && !card.contentData?.loading && card.contentData?.item && (
                card.renderContent(card.contentData.item as any)
              )}
              {card.renderContent && !card.contentData?.loading && !card.contentData?.item && (
                <p className="text-muted-foreground text-sm px-4 text-center flex-grow flex items-center justify-center py-4">{card.emptyMessage}</p>
              )}
              {!card.renderContent && (
                 <div className="flex-grow flex items-center justify-center">
                 </div>
              )}
              <Button asChild className="w-full mt-auto">
                <Link href={card.link}>{card.buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
         <Card className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-2 pt-4 items-center">
                <ListChecks className="h-16 w-16 text-primary" data-ai-hint="attendance list" />
                <CardTitle className="text-xl font-semibold">My Attendance</CardTitle>
                <CardDescription className="text-sm min-h-[3rem] px-2">View your detailed attendance records.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
              <div className="flex-grow"></div>
              <Button asChild className="w-full mt-auto">
                <Link href="/student/attendance">View Detailed Attendance</Link>
              </Button>
            </CardContent>
          </Card>
        <Card className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-2 pt-4 items-center">
                 <UserCircle className="h-16 w-16 text-primary" data-ai-hint="user profile" />
                <CardTitle className="text-xl font-semibold">My Profile</CardTitle>
                <CardDescription className="text-sm min-h-[3rem] px-2">Manage your personal information and settings.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
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
    
    

    
