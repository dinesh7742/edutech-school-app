
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, CheckCircle, ArrowRight, FileText, ClipboardList, BookOpen, Image as ImageIcon, Video, FileSignature, Users, BarChart3, Contact, MessageSquare, ClipboardCheck as ExamIcon
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp, where, doc, getDoc, setDoc, serverTimestamp, getCountFromServer, onSnapshot } from "firebase/firestore";
import type { Notice, Homework, Circular, LiveClass, HomeworkSubmission, HomeworkAttachment, ChatMessage } from "@/types";
import { TodaySpecial } from "@/components/shared/TodaySpecial";
import { StudentAttendanceSummary } from "@/components/student/StudentAttendanceSummary";
import { useToast } from "@/hooks/use-toast";

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
  const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [isLatestHomeworkCompleted, setIsLatestHomeworkCompleted] = useState(false);
  const [completingHomework, setCompletingHomework] = useState(false);


  useEffect(() => {
    if (!user?.uid) {
      setLoadingNotifications(false);
      return;
    }

    const fetchPendingNotifications = async () => {
      setLoadingNotifications(true);
      try {
        const complaintsRef = collection(db, "complaints");
        const q = query(
          complaintsRef,
          where("studentUid", "==", user.uid),
          where("status", "==", "Pending Acknowledgment")
        );
        const snapshot = await getCountFromServer(q);
        setPendingNotificationCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching pending notification count:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };
    
    fetchPendingNotifications();


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

    // Check for unread messages
    const chatsRef = collection(db, "chats");
    const chatsQuery = query(chatsRef, where("participants", "array-contains", user.uid));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      let unreadFound = false;
      snapshot.forEach((chatDoc) => {
        const messages = (chatDoc.data().messages || []) as ChatMessage[];
        for (const msg of messages) {
          if (msg.senderId !== user.uid && !msg.readBy?.includes(user.uid)) {
            unreadFound = true;
            break;
          }
        }
        if (unreadFound) return;
      });
      setHasUnreadMessages(unreadFound);
    });
    
    return () => unsubscribe();


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
      title: "Notice Board / सूचना पट्ट",
      link: "/student/notices",
      buttonText: "View All Notices",
      icon: FileText,
      description: "Latest school announcements and updates. / नवीनतम स्कूल घोषणाएँ और अपडेट।",
      contentData: latestNotice,
      renderContent: (data: Notice | null) => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center shadow-inner bg-background">
          {data ? (
            <div className="text-foreground space-y-2">
              <h3 className="font-bold text-lg underline">{data.title}</h3>
              <p className="text-xs text-muted-foreground">
                Posted: {data.displayDate} by {data.postedByName}
                {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
              </p>
              <p className="text-sm text-left line-clamp-4 whitespace-pre-wrap">{data.content}</p>
            </div>
          ) : (
            <div className="text-muted-foreground">
              <p>No new notices relevant to you.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "homework",
      title: "Homework / गृहकार्य",
      link: "/student/homework",
      buttonText: "View All Homework",
      icon: ClipboardList,
      description: "Check your latest assignments and due dates. / अपने नवीनतम असाइनमेंट और देय तिथियों की जांच करें।",
      contentData: latestHomework,
      renderContent: (data: Homework | null) => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
           {data ? (
              <div className="text-left w-full space-y-1 p-1 sm:p-2 rounded-md bg-card">
                <h3 className="font-semibold text-md text-card-foreground">{data.title}</h3>
                <div className="text-xs text-muted-foreground">
                  Subject: {data.subject} | Due: {data.dueDate} <br/>
                  Posted: {data.displayDate} by {data.postedByName}
                  {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
                </div>
                {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap text-card-foreground">{data.description}</p>}
                
                {data.attachments && data.attachments.length > 0 && (
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <a href={data.attachments[0].url} target="_blank" rel="noopener noreferrer" download={data.attachments[0].name} data-ai-hint="document sheet">
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
    },
    {
      id: "exams",
      title: "Online Exams / ऑनलाइन परीक्षा",
      link: "/student/exams",
      buttonText: "View All Exams",
      icon: ExamIcon,
      description: "Take online exams and tests assigned to your class. / अपनी कक्षा को सौंपे गए ऑनलाइन परीक्षा और टेस्ट दें।",
    },
    {
      id: "circulars",
      title: "Circulars / परिपत्र",
      link: "/student/circulars",
      buttonText: "View All Circulars",
      icon: FileText,
      description: "Important circulars and official communications. / महत्वपूर्ण परिपत्र और आधिकारिक संचार।",
      contentData: latestCircular,
      renderContent: (data: Circular | null) => (
         <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
            {data ? (
                <div className="text-left w-full space-y-1 p-1 sm:p-2 border rounded-md bg-card shadow-sm">
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
                            {data.fileName || 'Download Circular'}
                        </a>
                        </Button>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground font-medium">No new circulars relevant to you.</p>
            )}
        </div>
      ),
    },
     {
      id: "liveClass",
      title: "Live Class / लाइव क्लास",
      link: "/student/live-classes",
      buttonText: "View All Live Classes",
      icon: Video,
      description: "Join scheduled live classes and sessions. / निर्धारित लाइव कक्षाओं और सत्रों में शामिल हों।",
      contentData: latestLiveClass,
      renderContent: (data: LiveClass | null) => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
            {data ? (
                <div className="text-left w-full space-y-2 p-1 sm:p-2 rounded-md bg-card">
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
            ) : (
                 <p className="text-muted-foreground font-medium">No live classes scheduled for you.</p>
            )}
        </div>
      ),
    },
    {
      id: "chat",
      title: "Chat with Teacher / शिक्षक के साथ चैट करें",
      link: "/student/chat",
      buttonText: "Open Chat",
      icon: MessageSquare,
      description: "Communicate directly with your class teacher. / अपने कक्षा शिक्षक से सीधे संवाद करें।",
    },
    {
      id: "mySchoolApplications",
      title: "My School Applications / मेरे स्कूल आवेदन",
      link: "/student/my-applications",
      buttonText: "Access Forms",
      icon: FileSignature,
      description: "Apply for leave, late arrivals, etc., or download forms. / छुट्टी, देर से आने आदि के लिए आवेदन करें, या फॉर्म डाउनलोड करें।",
    },
    {
      id: "textbooks",
      title: "Textbooks / पाठ्यपुस्तकें",
      link: "/student/textbooks",
      buttonText: "View Textbooks",
      icon: BookOpen,
      description: "Access your digital textbooks for all subjects. / सभी विषयों के लिए अपनी डिजिटल पाठ्यपुस्तकें एक्सेस करें।",
    },
    {
      id: "gallery",
      title: "Photo Gallery / फोटो गैलरी",
      link: "/student/gallery",
      buttonText: "View Gallery",
      icon: ImageIcon,
      description: "Explore photos from school events and activities. / स्कूल की घटनाओं और गतिविधियों की तस्वीरें देखें।",
    },
    {
      id: "conductRecord",
      title: "Parent Notifications / अभिभावक सूचनाएं",
      link: "/student/conduct-record",
      buttonText: "View Notifications",
      icon: FileSignature,
      description: "View and acknowledge conduct reports from teachers. / शिक्षकों से आचरण रिपोर्ट देखें और स्वीकार करें।",
    },
    {
      id: "icard",
      title: "Download I-Card / आई-कार्ड डाउनलोड करें",
      link: "/student/icard",
      buttonText: "Get My I-Card",
      icon: Contact,
      description: "Download your official school identity card. / अपना आधिकारिक स्कूल पहचान पत्र डाउनलोड करें।",
    },
    {
      id: "attendance",
      title: "My Attendance / मेरी उपस्थिति",
      link: "/student/attendance",
      buttonText: "View Detailed Attendance",
      icon: CheckCircle,
      description: "View your detailed attendance records. / अपने विस्तृत उपस्थिति रिकॉर्ड देखें।",
    },
    {
      id: "profile",
      title: "My Profile / मेरी प्रोफाइल",
      link: "/student/profile",
      buttonText: "Go to Profile",
      icon: Users,
      description: "Manage your personal information and settings. / अपनी व्यक्तिगत जानकारी और सेटिंग्स प्रबंधित करें।",
    },
    {
      id: "progressCard",
      title: "Progress Card / प्रगति कार्ड",
      link: "/student/progress-card",
      buttonText: "View Progress Card",
      icon: BarChart3,
      description: "View and download your academic progress report. / अपनी शैक्षणिक प्रगति रिपोर्ट देखें और डाउनलोड करें।",
    },
  ];
  
  return (
    <div className="space-y-8">
      <WelcomeMessage />
      <StudentAttendanceSummary />
      <TodaySpecial />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => {
          const showNotificationBadge = card.id === "conductRecord" && pendingNotificationCount > 0;
          const showChatBadge = card.id === "chat" && hasUnreadMessages;
          return (
            <Card key={card.id} className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
              <CardHeader className="pb-2 pt-4 items-center">
                <div className="h-28 w-28 flex items-center justify-center">
                  <card.icon className="h-16 w-16 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                  {card.title}
                  {card.contentData?.item && isNew(
                      (card.contentData.item as any).timestamp
                      ) && (
                    <Badge variant="highlight" className="animate-pulse">New!</Badge>
                  )}
                  {showNotificationBadge && (
                    <Badge variant="destructive" className="animate-pulse">New!</Badge>
                  )}
                  {showChatBadge && (
                    <Badge variant="destructive" className="animate-pulse">New!</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm min-h-[4.5rem] px-2">{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
                {card.contentData?.loading ? (
                  <div className="flex flex-col items-center justify-center flex-grow py-4 min-h-[150px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading latest...</p>
                  </div>
                ) : card.renderContent ? (
                  <div className="flex-grow w-full min-h-[150px] flex items-center justify-center">
                      {card.renderContent(card.contentData.item as any)}
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center min-h-[150px]">
                  </div>
                )}
                <Button asChild className="w-full mt-auto">
                  <Link href={card.link}>{card.buttonText} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
