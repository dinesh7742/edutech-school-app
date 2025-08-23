
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, CheckCircle, ArrowRight, FileText, ClipboardList, BookOpen, Video, FileSignature, Users, BarChart3, Contact, MessageSquare, ClipboardCheck, Award, School, BookCopy, BookCheck, CalendarPlus, AlertTriangle, Edit, FileArchive
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp, where, doc, getDoc, setDoc, serverTimestamp, getCountFromServer, onSnapshot, writeBatch } from "firebase/firestore";
import type { Notice, Homework, Circular, LiveClass, HomeworkSubmission, HomeworkAttachment, ChatMessage, AppNotification, StudentProfile } from "@/types";
import { TodaySpecial } from "@/components/shared/TodaySpecial";
import { StudentAttendanceDetails } from "@/components/student/StudentAttendanceDetails";
import { useToast } from "@/hooks/use-toast";
import { FileViewer, type FileInfo } from "@/components/shared/FileViewer";
import NextImage from 'next/image';
import { BirthdayPopup } from "@/components/shared/BirthdayPopup";
import { format } from 'date-fns';

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

  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  
  const [birthdayStudent, setBirthdayStudent] = useState<StudentProfile | null>(null);
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  
  useEffect(() => {
    if (!user?.uid) {
      setLoadingNotifications(false);
      return;
    }

    const checkBirthday = async () => {
        if (!user.uid) return;

        const profileDocRef = doc(db, "studentProfiles", user.uid);
        const profileDoc = await getDoc(profileDocRef);

        if (profileDoc.exists()) {
            const studentData = profileDoc.data() as StudentProfile;
            if (studentData.dateOfBirth) {
                const today = format(new Date(), 'MM-dd');
                const birthDate = format(new Date(studentData.dateOfBirth), 'MM-dd');
                
                if (today === birthDate) {
                    const lastShown = localStorage.getItem(`birthday_${studentData.uid}`);
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    if (lastShown !== todayStr) {
                         setBirthdayStudent(studentData);
                         setShowBirthdayPopup(true);
                    }
                }
            }
        }
    };

    checkBirthday();
    
    // Listener for new direct notifications (e.g., absence)
    const notificationsRef = collection(db, "notifications");
    const notificationsQuery = query(
      notificationsRef,
      where("recipientUid", "==", user.uid),
      where("isRead", "==", false)
    );
    const unsubscribeNotifications = onSnapshot(notificationsQuery, async (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as AppNotification) }));
      
      if (newNotifications.length > 0) {
        const batch = writeBatch(db);
        newNotifications.forEach(notif => {
          // Show a toast for each new notification
          toast({
            title: `New Notification: ${notif.type}`,
            description: notif.message,
            action: notif.link ? (
              <Link href={notif.link}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
            ) : undefined,
          });
          // Mark as read immediately after showing
          const notifRef = doc(db, 'notifications', notif.id);
          batch.update(notifRef, { isRead: true });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error marking notifications as read: ", error);
        }
      }
    });

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
        return relevantItem || null;
      } catch (error) {
        console.error(`Error fetching latest ${collectionName}:`, error);
        setter({ item: null, loading: false });
        return null;
      }
    };
    
    const checkAllContent = async () => {
        
        const notice = await fetchGenericLatestItem<Notice>("notices", setLatestNotice, (data) => ({
          ...data,
          timestamp: data.timestamp as Timestamp,
          displayDate: data.timestamp ? new Date((data.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
        } as Notice));

        const circular = await fetchGenericLatestItem<Circular>("circulars", setLatestCircular, (data) => ({
          ...data,
          timestamp: data.timestamp as Timestamp,
          displayDate: data.timestamp ? new Date((data.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
        } as Circular));

        const liveClass = await fetchGenericLatestItem<LiveClass>("liveClasses", setLatestLiveClass, (data) => ({
          ...data,
          timestamp: data.timestamp as Timestamp,
          displayDate: data.timestamp ? new Date((data.timestamp as Timestamp).seconds * 1000).toLocaleDateString() : 'N/A',
        } as LiveClass));
        
        // Specific logic for Homework
        if (user?.uid && user?.grade && user?.division) {
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
        } else {
             setLatestHomework({ item: null, loading: false });
             setIsLatestHomeworkCompleted(false);
        }
    };
    checkAllContent();
    
    // Check for unread messages
    const chatsRef = collection(db, "chats");
    const chatsQuery = query(chatsRef, where("participants", "array-contains", user.uid));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
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
    
    return () => {
        unsubscribeChats();
        unsubscribeNotifications();
    };
  }, [user, toast]);
  
  const closeBirthdayPopup = () => {
    if (birthdayStudent) {
        localStorage.setItem(`birthday_${birthdayStudent.uid}`, format(new Date(), 'yyyy-MM-dd'));
    }
    setShowBirthdayPopup(false);
  };

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
      description: "Latest school announcements and updates. / नवीनतम स्कूल घोषणाएँ और अपडेट।",
      contentData: latestNotice,
      renderContent: (data: Notice | null) => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-card">
          <div className="p-4 bg-background rounded-lg shadow-lg w-full max-w-xs">
            {data ? (
              <div className="text-foreground space-y-2">
                <h3 className="font-bold text-lg underline">{data.title}</h3>
                <div className="text-xs text-muted-foreground">
                  <span>Posted: {data.displayDate} by {data.postedByName}</span>
                  {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
                </div>
                <p className="text-sm text-left line-clamp-4 whitespace-pre-wrap">{data.content}</p>
              </div>
            ) : (
              <div className="text-muted-foreground">
                <p>No new notices relevant to you.</p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "homework",
      title: "Homework / गृहकार्य",
      link: "/student/homework",
      buttonText: "View All Homework",
      description: "Check your latest assignments and due dates. / अपने नवीनतम असाइनमेंट और देय तिथियों की जांच करें।",
      contentData: latestHomework,
      renderContent: (data: Homework | null) => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-between items-center text-center bg-card">
           <NextImage 
            src="https://i.postimg.cc/PrX9fzpG/cartoon-children-doing-homework-together-two-cartoon-children-sit-side-side-table-fully-focused-comp.jpg"
            alt="Homework"
            width={200}
            height={120}
            className="rounded-md object-cover mt-2"
            data-ai-hint="children homework study"
          />
          <div className="flex-grow w-full flex items-center justify-center">
            {data ? (
              <div className="text-left w-full space-y-1 p-1 sm:p-2 rounded-md">
                <h3 className="font-semibold text-md text-card-foreground">{data.title}</h3>
                <div className="text-xs text-muted-foreground">
                  <span>Subject: {data.subject} | Due: {data.dueDate}</span> <br />
                  <span>Posted: {data.displayDate} by {data.postedByName}</span>
                  {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
                </div>
                
                {data.attachments && data.attachments.length > 0 && (
                   <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => { e.stopPropagation(); data.attachments && setViewingFile({ url: data.attachments[0].url, type: data.attachments[0].type, name: data.attachments[0].name })}}
                    >
                      View Attachment
                    </Button>
                )}
              </div>
            ) : (
                <p className="text-muted-foreground font-medium p-4">No new homework for your class.</p>
            )}
          </div>
          {data && (
            <div className="w-full p-1 sm:p-2">
              {!isLatestHomeworkCompleted ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => { e.stopPropagation(); handleMarkHomeworkCompleted(data)}}
                  disabled={completingHomework}
                >
                  {completingHomework && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mark as Completed
                </Button>
              ) : (
                <Badge variant="accent" className="w-full flex items-center justify-center text-center py-2 px-4 text-sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Homework Completed
                </Badge>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "results",
      title: "My Results / मेरे परिणाम",
      link: "/student/results",
      buttonText: "View My Results",
      description: "Check your scores for Unit Tests, First Semester, and Second Semester.",
      renderContent: () => {
        const resultItems = [
          { name: "Unit Test", link: "/student/results", icon: ClipboardCheck },
          { name: "First Semester", link: "/student/results", icon: BookCopy },
          { name: "Second Semester", link: "/student/results", icon: BookCheck },
          { name: "Scholarship Exam", link: "/student/scholarships", icon: Award },
        ];
        return (
          <div className="w-full h-full p-2 rounded-md grid grid-cols-2 gap-2 bg-background">
            {resultItems.map(item => (
              <Link key={item.name} href={item.link} className="group flex flex-col items-center justify-center p-2 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                 <div className="flex items-center justify-center h-20 w-full">
                    <item.icon className="h-10 w-10 text-primary" />
                 </div>
                 <span className="text-xs font-semibold text-center text-foreground">{item.name}</span>
              </Link>
            ))}
          </div>
        );
      }
    },
    {
      id: "onlineExams",
      title: "Online Exams / ऑनलाइन परीक्षा",
      link: "/student/exams",
      buttonText: "Go to Exams",
      description: "Take online exams and tests assigned by your teachers. / अपने शिक्षकों द्वारा सौंपे गए ऑनलाइन परीक्षा और टेस्ट दें।",
      renderContent: () => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
          <NextImage 
            src="https://i.postimg.cc/NMYbw07V/school-exams-hero.png" 
            alt="Online Exams"
            width={200}
            height={120}
            className="rounded-md object-cover"
            data-ai-hint="exam paper test"
          />
        </div>
      )
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
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-card">
          <div className="p-4 bg-background rounded-lg shadow-lg w-full max-w-xs">
            {data ? (
              <div className="text-left w-full space-y-1">
                <h3 className="font-semibold text-md text-foreground">{data.title}</h3>
                <div className="text-xs text-muted-foreground">
                  <span>Posted: {data.displayDate} by {data.postedByName}</span>
                  {isNew(data.timestamp) && <Badge variant="highlight" className="ml-2 text-xs">New</Badge>}
                </div>
                {data.description && <p className="text-sm line-clamp-3 whitespace-pre-wrap">{data.description}</p>}
                {data.fileUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setViewingFile({ url: data.fileUrl!, type: 'pdf', name: data.fileName || 'Circular' })}
                  >
                    View Circular
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground font-medium">No new circulars relevant to you.</p>
            )}
          </div>
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
                    <span>Posted: {data.displayDate} by {data.postedByName}</span>
                    {data.grade && <span> | For: Grade {data.grade}{data.division ? ` Div ${data.division}` : ' (All Div)'}</span>}
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
      description: "Communicate directly with your class teacher. / अपने कक्षा शिक्षक से सीधे संवाद करें।",
      renderContent: () => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
          <NextImage 
            src="https://i.postimg.cc/RF84S3St/pngtree-chating-on-phone-illustrations-png-image-17628344.png" 
            alt="Chat with teacher"
            width={200}
            height={120}
            className="rounded-md object-contain"
            data-ai-hint="chat conversation"
          />
        </div>
      )
    },
    {
      id: "mySchoolApplications",
      title: "My School Applications / मेरे स्कूल आवेदन",
      link: "/student/my-applications",
      buttonText: "Access Forms",
      description: "Apply for leave, late arrivals, certificates, or download forms. / छुट्टी, देर से आने, प्रमाण पत्र आदि के लिए आवेदन करें, या फॉर्म डाउनलोड करें।",
      renderContent: () => {
        const applicationItems = [
          { name: "Leave Application", link: "/student/apply-leave", icon: CalendarPlus },
          { name: "Late Arrival", link: "/student/late-arrival", icon: AlertTriangle },
          { name: "Bonafide Certificate", link: "/student/other-applications/submit?formType=BonafideCertificateRequest", icon: FileText },
          { name: "Download Forms", link: "/student/school-forms", icon: FileArchive },
        ];
        return (
          <div className="w-full h-full p-2 rounded-md grid grid-cols-2 gap-2 bg-background">
            {applicationItems.map(item => (
              <Link key={item.name} href={item.link} className="group flex flex-col items-center justify-center p-2 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center h-20 w-full">
                  <item.icon className="h-10 w-10 text-primary" />
                </div>
                <span className="text-xs font-semibold text-center text-foreground">{item.name}</span>
              </Link>
            ))}
          </div>
        );
      }
    },
    {
      id: "textbooks",
      title: "Textbooks / पाठ्यपुस्तकें",
      link: "/student/textbooks",
      buttonText: "View Textbooks",
      description: "Access your digital textbooks for all subjects. / सभी विषयों के लिए अपनी डिजिटल पाठ्यपुस्तकें एक्सेस करें।",
      renderContent: () => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
          <NextImage 
            src="https://i.postimg.cc/rsFxF0Hd/images-1.jpg" 
            alt="Textbooks"
            width={200}
            height={120}
            className="rounded-md object-cover"
            data-ai-hint="books stack"
          />
        </div>
      )
    },
    {
      id: "gallery",
      title: "Photo Gallery / फोटो गैलरी",
      link: "/student/gallery",
      buttonText: "View Gallery",
      description: "Explore photos from school events and activities. / स्कूल की घटनाओं और गतिविधियों की तस्वीरें देखें।",
      renderContent: () => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
          <NextImage
            src="https://i.postimg.cc/hvVChjWv/images.jpg"
            alt="Photo Gallery"
            width={200}
            height={120}
            className="rounded-md object-contain"
            data-ai-hint="gallery photos event"
          />
        </div>
      ),
    },
    {
      id: "conductRecord",
      title: "Parent Notifications / अभिभावक सूचनाएं",
      link: "/student/conduct-record",
      buttonText: "View Notifications",
      description: "View and acknowledge conduct reports from teachers. / शिक्षकों से आचरण रिपोर्ट देखें और स्वीकार करें।",
      renderContent: () => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
          <NextImage 
            src="https://i.postimg.cc/3RSb0RwF/382-3822268-transparent-parent-and-child-reading-clipart-bilingual-families.png" 
            alt="Parent Notifications"
            width={200}
            height={120}
            className="rounded-md object-contain"
            data-ai-hint="parent child reading"
          />
        </div>
      )
    },
    {
      id: "icard",
      title: "Download I-Card / आई-कार्ड डाउनलोड करें",
      link: "/student/icard",
      buttonText: "Get My I-Card",
      description: "Download your official school identity card. / अपना आधिकारिक स्कूल पहचान पत्र डाउनलोड करें।",
      renderContent: () => (
        <div className="w-full h-full p-2 rounded-md flex flex-col justify-center items-center text-center bg-background">
          <NextImage
            src="https://i.postimg.cc/Px4PwpZR/images-2025-08-20-T195046-534.jpg"
            alt="Download I-Card"
            width={120}
            height={120}
            className="rounded-md object-contain"
            data-ai-hint="id card person"
          />
        </div>
      ),
    },
    {
      id: "attendance",
      title: "My Attendance / मेरी उपस्थिति",
      link: "/student/attendance",
      buttonText: "View Detailed Attendance",
      description: "View your detailed attendance records. / अपने विस्तृत उपस्थिति रिकॉर्ड देखें।",
      icon: Users,
    },
    {
      id: "profile",
      title: "My Profile / मेरी प्रोफाइल",
      link: "/student/profile",
      buttonText: "Go to Profile",
      icon: Contact,
      description: "Manage your personal information and settings. / अपनी व्यक्तिगत जानकारी और सेटिंग्स प्रबंधित करें।",
    },
  ];
  
  return (
    <>
      {showBirthdayPopup && birthdayStudent && (
        <BirthdayPopup student={birthdayStudent} onClose={closeBirthdayPopup} />
      )}
      <FileViewer fileInfo={viewingFile} onOpenChange={(isOpen) => !isOpen && setViewingFile(null)} />
      <div className="space-y-8">
        <WelcomeMessage />
        <StudentAttendanceDetails />
        <TodaySpecial />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => {
            const showNotificationBadge = card.id === "conductRecord" && pendingNotificationCount > 0;
            const showChatBadge = card.id === "chat" && hasUnreadMessages;
            const hasDynamicContent = !!card.contentData;
            const isNewItem = hasDynamicContent && card.contentData.item && isNew((card.contentData.item as any).timestamp);
            const hasIcon = !!card.icon;

            return (
              <Card key={card.id} className="text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-yellow-300 to-orange-400">
                <div className="p-4 bg-primary text-primary-foreground">
                  <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                    {card.title}
                    {isNewItem && (
                      <Badge variant="highlight" className="animate-pulse">New!</Badge>
                    )}
                    {showNotificationBadge && (
                      <Badge variant="destructive" className="animate-pulse">New!</Badge>
                    )}
                    {showChatBadge && (
                      <Badge variant="destructive" className="animate-pulse">New!</Badge>
                    )}
                  </CardTitle>
                </div>
                <CardContent className="flex flex-col flex-grow items-center justify-between p-4 space-y-3">
                  {hasIcon && (
                    <div className="flex justify-center my-4 min-h-[64px] items-center">
                        <card.icon className={`h-16 w-16 text-primary`} />
                    </div>
                  )}
                   <div className="text-sm min-h-[4rem] px-2 flex-grow flex flex-col items-center justify-center w-full">
                      <CardDescription className="text-card-foreground font-medium">{card.description}</CardDescription>
                  </div>

                  {hasDynamicContent && card.contentData.loading ? (
                    <div className="flex flex-col items-center justify-center flex-grow py-4 min-h-[150px]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground mt-2">Loading latest...</p>
                    </div>
                  ) : card.renderContent ? (
                    <div className="flex-grow w-full min-h-[150px] flex items-center justify-center">
                        {card.renderContent(hasDynamicContent ? card.contentData.item : null)}
                    </div>
                  ) : (
                    <div className="flex-grow flex items-center justify-center min-h-[150px]">
                    </div>
                  )}
                  <Button asChild className="w-auto px-6 mt-auto font-bold bg-primary text-primary-foreground" variant="default">
                    <Link href={card.link}>
                      {card.buttonText}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
