
"use client";

import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, Loader2, CheckCircle, FileText, ClipboardList, BookOpen, 
  Image as ImageIcon, Video, FileSignature, ListChecks, UserCircle, Contact, BarChart3, MessageSquareWarning
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Notice, Homework, Circular, LiveClass, HomeworkSubmission, LeaveApplication, LateArrivalApplication, HomeworkAttachment } from "@/types";
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


export function StudentDashboardClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [latestNotice, setLatestNotice] = useState<LatestContent<Notice>>({ item: null, loading: true });
  const [latestHomework, setLatestHomework] = useState<LatestContent<Homework>>({ item: null, loading: true });
  const [latestCircular, setLatestCircular] = useState<LatestContent<Circular>>({ item: null, loading: true });
  const [latestLiveClass, setLatestLiveClass] = useState<LatestContent<LiveClass>>({ item: null, loading: true });


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
        const q = query(ref, orderBy(useTimestampField as string, "desc"), limit(5));
        const snapshot = await getDocs(q);
        const allRecentItems = snapshot.docs.map(doc => dataMapper({ id: doc.id, ...doc.data() }));

        const relevantItem = allRecentItems.find(item => {
          if (!user.grade || !user.division) {
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
      setIsLatestHomeworkCompleted(false); 

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
            attachments: hwData.attachments || [],
            timestamp: hwData.timestamp as Timestamp,
            displayDate: hwData.timestamp ? new Date((hwData.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
            dueDate: hwData.dueDate ? new Date(hwData.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A',
          } as Homework;
          setLatestHomework({ item: currentHomeworkItem, loading: false });

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
         if ((error as any).code === 'failed-precondition' && (error as any).message.includes('index')) {
             console.error("Firestore index required for homework query on student dashboard. Please create an index on 'homework' collection for fields: grade (ASC), division (ASC), timestamp (DESC).");
             toast({title: "Error", description: "A database configuration is needed for homework. Please inform your administrator.", variant: "destructive"});
        }
      }
    };
    fetchLatestHomework();

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
      link: "/student/notices",
      buttonText: "View All Notices",
      lottieUrl: "https://lottie.host/18b87a07-2856-427c-b172-3c8287a9359e/KCaV3od5j0.json",
      description: "Latest school announcements and updates.",
      contentData: latestNotice,
      renderContent: (data: Notice | null) => (
        <div className="w-full h-full p-2 border-4 border-amber-800 bg-green-900 rounded-md flex flex-col justify-center items-center text-center shadow-inner" style={{background: 'linear-gradient(to bottom right, #0a481e, #0c5c28)'}}>
          {data ? (
            <div className="text-white font-mono space-y-2">
              <h3 className="font-bold text-lg underline">{data.title}</h3>
              <p className="text-xs text-slate-300">
                Posted: {data.displayDate} by {data.postedByName}
                {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
              </p>
              <p className="text-sm text-left line-clamp-4 whitespace-pre-wrap">{data.content}</p>
            </div>
          ) : (
            <div className="text-white font-mono">
              <p>No new notices relevant to you.</p>
            </div>
          )}
        </div>
      ),
      emptyMessage: "No new notices relevant to you."
    },
    {
      id: "homework",
      title: "Homework",
      link: "/student/homework",
      buttonText: "View All Homework",
      lottieUrl: "https://lottie.host/a8678b87-48f5-4654-be8d-af198114f85e/y1aQyCq4lW.json",
      description: "Check your latest assignments and due dates.",
      contentData: latestHomework,
      renderContent: (data: Homework | null) => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-[#f0f4f8] bg-cover" style={{backgroundImage: "linear-gradient(90deg, #d3e0f0 1px, transparent 1px), linear-gradient(180deg, #d3e0f0 1px, transparent 1px)", backgroundSize: '1.5rem 1.5rem'}}>
           {data ? (
              <div className="text-left w-full space-y-1 p-1 sm:p-2 rounded-md bg-white/80 backdrop-blur-sm">
                <h3 className="font-semibold text-md text-gray-800">{data.title}</h3>
                <div className="text-xs text-muted-foreground">
                  Subject: {data.subject} | Due: {data.dueDate} <br/>
                  Posted: {data.displayDate} by {data.postedByName}
                  {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
                </div>
                {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap text-gray-700">{data.description}</p>}
                
                {data.attachments && data.attachments.length > 0 && (
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <a href={data.attachments[0].url} target="_blank" rel="noopener noreferrer" download={data.attachments[0].name} data-ai-hint="document sheet">
                      <Download className="mr-2 h-4 w-4" /> 
                      {data.attachments[0].name} {data.attachments.length > 1 ? `(+${data.attachments.length - 1} more)` : ''}
                    </a>
                  </Button>
                )}

                {!isLatestHomeworkCompleted && (
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
                {isLatestHomeworkCompleted && (
                  <Badge variant="accent" className="mt-2 w-full flex items-center justify-center text-center py-2 px-4 text-sm">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Homework Completed
                  </Badge>
                )}
              </div>
            ) : (
                <p className="text-muted-foreground font-medium">No new homework for your class.</p>
            )}
        </div>
      ),
      emptyMessage: "No new homework for your class."
    },
    {
      id: "circulars",
      title: "Circulars",
      link: "/student/circulars",
      buttonText: "View All Circulars",
      lottieUrl: "https://lottie.host/88029a73-d02f-48d1-8179-63304192a0a2/x3n2i6uVOr.json",
      description: "Important circulars and official communications.",
      contentData: latestCircular,
      renderContent: (data: Circular | null) => (
         <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-gray-50">
            {data ? (
                <div className="text-left w-full space-y-1 p-1 sm:p-2 border rounded-md bg-white/90 shadow-sm">
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
            ) : (
                <p className="text-muted-foreground font-medium">No new circulars relevant to you.</p>
            )}
        </div>
      ),
      emptyMessage: "No new circulars relevant to you."
    },
     {
      id: "liveClass",
      title: "Live Class",
      link: "/student/live-classes",
      buttonText: "View All Live Classes",
      lottieUrl: "https://lottie.host/020a169a-65b8-4b36-a859-28a1c0f0a5f9/VqS2a4z0b8.json",
      description: "Join scheduled live classes and sessions.",
      contentData: latestLiveClass,
      renderContent: (data: LiveClass | null) => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-gray-800 text-white">
            {data ? (
                <div className="text-left w-full space-y-2 p-1 sm:p-2 rounded-md bg-gray-900/80">
                <h3 className="font-semibold text-md">{data.subject}</h3>
                <div className="text-xs text-gray-400">
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
            ) : (
                 <p className="text-gray-400 font-medium">No live classes scheduled for you.</p>
            )}
        </div>
      ),
      emptyMessage: "No live classes scheduled for you."
    },
    {
      id: "mySchoolApplications",
      title: "My School Applications",
      link: "/student/my-applications",
      buttonText: "Access Forms & Applications",
      lottieUrl: "https://lottie.host/8192a544-2396-48c0-82d8-21f579979d63/1fRkI5gUeX.json",
      description: "Submit online applications for leave, late arrivals, TC, etc., or download various blank PDF forms.",
      contentData: null, 
      renderContent: null,
      emptyMessage: "" 
    },
    {
      id: "textbooks",
      title: "Textbooks",
      link: "/student/textbooks",
      buttonText: "View Textbooks",
      lottieUrl: "https://lottie.host/170b99f3-803a-4123-9529-688b1b86d997/l9G043o6tV.json",
      description: "Access your digital textbooks for all subjects.",
      contentData: null,
      renderContent: null,
      emptyMessage: ""
    },
    {
      id: "gallery",
      title: "Photo Gallery",
      link: "/student/gallery",
      buttonText: "View Gallery",
      lottieUrl: "https://lottie.host/e26861f1-337b-42a1-b425-a13187216a69/CglfI1a1z7.json",
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
               <div className="h-28 w-28 flex items-center justify-center">
                  <Lottie animationData={card.lottieUrl} loop={true} style={{height: 120, width: 120}} />
               </div>
              <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                {card.title}
                {card.contentData?.item && isNew(
                    (card.contentData.item as any).timestamp
                    ) && (
                  <Badge variant="highlight" className="animate-pulse">New!</Badge>
                )}
              </CardTitle>
               <CardDescription className="text-sm min-h-[3rem] px-2">{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
              {card.contentData?.loading ? (
                <div className="flex flex-col items-center justify-center flex-grow py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading latest...</p>
                </div>
              ) : card.renderContent && card.contentData?.item ? (
                card.renderContent(card.contentData.item as any)
              ) : card.renderContent && !card.contentData.item ? (
                card.renderContent(null)
              ) : (
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
                <div className="h-28 w-28 flex items-center justify-center">
                    <Lottie animationData="https://lottie.host/7e0281b9-a6a3-48ae-8a8b-a3d548b26e7a/2ITiLz1iL6.json" loop={true} style={{height: 120, width: 120}} />
                </div>
                <CardTitle className="text-xl font-semibold">Parent Notifications</CardTitle>
                <CardDescription className="text-sm min-h-[3rem] px-2">View and acknowledge conduct reports from teachers.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
              <div className="flex-grow"></div>
              <Button asChild className="w-full mt-auto">
                <Link href="/student/conduct-record">View Notifications</Link>
              </Button>
            </CardContent>
        </Card>
        <Card className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-2 pt-4 items-center">
                <div className="h-28 w-28 flex items-center justify-center">
                    <Lottie animationData="https://lottie.host/b001a8b3-33e1-487c-a44e-a7455d3ea956/xKikGfVwjD.json" loop={true} style={{height: 110, width: 110}} />
                </div>
                <CardTitle className="text-xl font-semibold">Download I-Card</CardTitle>
                <CardDescription className="text-sm min-h-[3rem] px-2">Download your official school identity card.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
              <div className="flex-grow"></div>
              <Button asChild className="w-full mt-auto">
                <Link href="/student/icard">Get My I-Card</Link>
              </Button>
            </CardContent>
        </Card>
         <Card className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-2 pt-4 items-center">
                <div className="h-28 w-28 flex items-center justify-center">
                    <Lottie animationData="https://lottie.host/e0600bba-1549-430c-8e89-980b6b8d5f66/e1s1YvR5D1.json" loop={true} style={{height: 120, width: 120}} />
                </div>
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
                 <div className="h-28 w-28 flex items-center justify-center">
                    <Lottie animationData="https://lottie.host/020a169a-65b8-4b36-a859-28a1c0f0a5f9/VqS2a4z0b8.json" loop={true} style={{height: 120, width: 120}} />
                 </div>
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
        <Card className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-2 pt-4 items-center">
                <div className="h-28 w-28 flex items-center justify-center">
                    <Lottie animationData="https://lottie.host/523899f8-a831-4148-9584-9f29cf9f0e13/oV58ccA5Tq.json" loop={true} style={{height: 120, width: 120}} />
                </div>
                <CardTitle className="text-xl font-semibold">Progress Card</CardTitle>
                <CardDescription className="text-sm min-h-[3rem] px-2">View and download your academic progress report.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
              <div className="flex-grow"></div>
              <Button asChild className="w-full mt-auto">
                <Link href="/student/progress-card">View Progress Card</Link>
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
