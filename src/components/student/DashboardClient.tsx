
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, CheckCircle, ArrowRight, FileText, ClipboardList, BookOpen, Video, FileSignature, Users, Contact, MessageSquare, Award, GalleryHorizontal, Edit
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, Timestamp, where, doc, getDoc, setDoc, serverTimestamp, getCountFromServer, onSnapshot, writeBatch } from "firebase/firestore";
import type { Notice, Homework, Circular, LiveClass, HomeworkSubmission, ChatMessage, AppNotification, StudentProfile } from "@/types";
import { TodaySpecial } from "@/components/shared/TodaySpecial";
import { StudentAttendanceDetails } from "@/components/student/StudentAttendanceDetails";
import { useToast } from "@/hooks/use-toast";
import { FileViewer, type FileInfo } from "@/components/shared/FileViewer";
import { BirthdayPopup } from "@/components/shared/BirthdayPopup";
import { format } from 'date-fns';

interface LatestContent {
  notice: Notice | null;
  homework: Homework | null;
  circular: Circular | null;
  liveClass: LiveClass | null;
}

export function StudentDashboardClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [latestContent, setLatestContent] = useState<LatestContent>({ notice: null, homework: null, circular: null, liveClass: null });
  const [loadingContent, setLoadingContent] = useState(true);

  const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [isLatestHomeworkCompleted, setIsLatestHomeworkCompleted] = useState(false);
  const [completingHomework, setCompletingHomework] = useState(false);

  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);
  
  const [birthdayStudent, setBirthdayStudent] = useState<StudentProfile | null>(null);
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  
  useEffect(() => {
    if (!user?.uid) {
      setLoadingContent(false);
      return;
    }

    const checkBirthday = async () => {
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
      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => {
        const notif = { id: docSnap.id, ...(docSnap.data() as AppNotification) };
        toast({
          title: `New Notification: ${notif.type}`,
          description: notif.message,
          action: notif.link ? <Link href={notif.link}><Button variant="outline" size="sm">View</Button></Link> : undefined,
        });
        batch.update(doc(db, 'notifications', notif.id), { isRead: true });
      });

      try {
        await batch.commit();
      } catch (error) {
        console.error("Error marking notifications as read: ", error);
      }
    });
    
    const fetchDashboardData = async () => {
      setLoadingContent(true);

      // Fetch pending conduct notifications
      try {
        const complaintsRef = collection(db, "complaints");
        const complaintsQuery = query(complaintsRef, where("studentUid", "==", user.uid), where("status", "==", "Pending Acknowledgment"));
        const complaintsSnapshot = await getCountFromServer(complaintsQuery);
        setPendingNotificationCount(complaintsSnapshot.data().count);
      } catch (error) { console.error("Error fetching pending notifications:", error); }
      

      try {
        // Fetch latest items for the student's specific class or school-wide
        const relevantGrade = user.grade;
        const relevantDivision = user.division;

        const noticeQuery = query(collection(db, "notices"), where('grade', 'in', [null, '', relevantGrade]), orderBy("timestamp", "desc"), limit(1));
        const homeworkQuery = query(collection(db, "homework"), where("grade", "==", relevantGrade), where("division", "==", relevantDivision), orderBy("timestamp", "desc"), limit(1));
        const circularQuery = query(collection(db, "circulars"), where('grade', 'in', [null, '', relevantGrade]), orderBy("timestamp", "desc"), limit(1));
        const liveClassQuery = query(collection(db, "liveClasses"), where('grade', 'in', [null, '', relevantGrade]), orderBy("timestamp", "desc"), limit(1));

        const [noticeSnap, homeworkSnap, circularSnap, liveClassSnap] = await Promise.all([
            getDocs(noticeQuery),
            getDocs(homeworkQuery),
            getDocs(circularQuery),
            getDocs(liveClassQuery),
        ]);

        const latestNotice = noticeSnap.empty ? null : { id: noticeSnap.docs[0].id, ...noticeSnap.docs[0].data() } as Notice;
        const latestHomework = homeworkSnap.empty ? null : { id: homeworkSnap.docs[0].id, ...homeworkSnap.docs[0].data() } as Homework;
        const latestCircular = circularSnap.empty ? null : { id: circularSnap.docs[0].id, ...circularSnap.docs[0].data() } as Circular;
        const latestLiveClass = liveClassSnap.empty ? null : { id: liveClassSnap.docs[0].id, ...liveClassSnap.docs[0].data() } as LiveClass;

        setLatestContent({ notice: latestNotice, homework: latestHomework, circular: latestCircular, liveClass: latestLiveClass });
        
        if (latestHomework) {
            const submissionDocId = `${latestHomework.id}_${user.uid}`;
            const submissionSnap = await getDoc(doc(db, "homeworkSubmissions", submissionDocId));
            setIsLatestHomeworkCompleted(submissionSnap.exists());
        }

      } catch (error) { console.error("Error fetching latest content:", error); }
      setLoadingContent(false);
    };

    fetchDashboardData();
    
    // Check for unread messages
    const chatId = `group_chat_${user.grade}_${user.division}`;
    const chatDocRef = doc(db, "chats", chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, (chatDoc) => {
        if(chatDoc.exists()) {
            const messages = (chatDoc.data().messages || []) as ChatMessage[];
            setHasUnreadMessages(messages.some(msg => msg.senderId !== user.uid && !msg.readBy?.includes(user.uid || '')));
        }
    });
    
    return () => {
        unsubscribeChat();
        unsubscribeNotifications();
    };
  }, [user, toast]);
  
  const closeBirthdayPopup = () => {
    if (birthdayStudent) {
        localStorage.setItem(`birthday_${birthdayStudent.uid}`, format(new Date(), 'yyyy-MM-dd'));
    }
    setShowBirthdayPopup(false);
  };

  const handleMarkHomeworkCompleted = async () => {
    if (!user || !latestContent.homework) return;
    setCompletingHomework(true);
    const hw = latestContent.homework;
    const submissionDocId = `${hw.id}_${user.uid}`;
    const submissionData: Omit<HomeworkSubmission, "id" | "completedAt"> = {
      homeworkId: hw.id, studentId: user.uid, studentName: user.displayName || "Student",
      grade: user.grade || '', division: user.division || '', homeworkTitle: hw.title, status: 'completed'
    };
    try {
      await setDoc(doc(db, "homeworkSubmissions", submissionDocId), { ...submissionData, completedAt: serverTimestamp() });
      setIsLatestHomeworkCompleted(true);
      toast({ title: "Homework Marked!", description: `"${hw.title}" marked as completed.` });
    } catch (error) { console.error("Error marking homework completed:", error); }
    setCompletingHomework(false);
  };

  const dashboardCards = [
    { id: "notices", title: "Notice Board", link: "/student/notices", contentData: latestContent.notice, icon: FileText, buttonText: "View All" },
    { id: "homework", title: "Homework", link: "/student/homework", contentData: latestContent.homework, icon: ClipboardList, buttonText: "View All" },
    { id: "circulars", title: "Circulars", link: "/student/circulars", contentData: latestContent.circular, icon: FileText, buttonText: "View All" },
    { id: "liveClasses", title: "Live Classes", link: "/student/live-classes", contentData: latestContent.liveClass, icon: Video, buttonText: "View All" }
  ];

  const quickActionLinks = [
    { id: "results", title: "Results", link: "/student/results", icon: Award },
    { id: "exams", title: "Online Exams", link: "/student/exams", icon: Edit },
    { id: "applications", title: "Applications", link: "/student/my-applications", icon: FileSignature },
    { id: "textbooks", title: "Textbooks", link: "/student/textbooks", icon: BookOpen },
    { id: "gallery", title: "Gallery", link: "/student/gallery", icon: GalleryHorizontal },
    { id: "icard", title: "I-Card", link: "/student/icard", icon: Contact },
    { id: "profile", title: "My Profile", link: "/student/profile", icon: Users },
    { id: "chat", title: "Chat", link: "/student/chat", icon: MessageSquare, hasNotification: hasUnreadMessages },
    { id: "conduct", title: "Parent Notifications", link: "/student/conduct-record", icon: MessageSquare, hasNotification: pendingNotificationCount > 0 },
  ];

  return (
    <>
      {showBirthdayPopup && birthdayStudent && <BirthdayPopup student={birthdayStudent} onClose={closeBirthdayPopup} />}
      <FileViewer fileInfo={viewingFile} onOpenChange={(isOpen) => !isOpen && setViewingFile(null)} />
      <div className="space-y-8">
        <WelcomeMessage />
        <StudentAttendanceDetails />
        <TodaySpecial />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {quickActionLinks.map(link => (
            <Link key={link.id} href={link.link}>
              <Card className="text-center p-4 h-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-yellow-300 to-orange-400 text-primary-foreground">
                <div className="relative">
                  <link.icon className="h-10 w-10 mb-2 text-white" />
                  {link.hasNotification && (
                    <>
                     <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    </>
                  )}
                </div>
                <p className="font-semibold text-white">{link.title}</p>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.map(card => (
            <Card key={card.id} className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    {card.icon && <card.icon className="h-6 w-6 text-primary" />} 
                    {card.title}
                  </span>
                  <Button asChild variant="link" size="sm">
                    <Link href={card.link}>View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[150px]">
                {loadingContent ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : !card.contentData ? <p className="text-muted-foreground text-center">No new {card.id.toLowerCase()} found.</p> :
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{card.contentData.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{card.contentData.description}</p>
                    {card.id === "homework" && (
                      <div className="pt-2">
                        {!isLatestHomeworkCompleted ? (
                          <Button size="sm" onClick={handleMarkHomeworkCompleted} disabled={completingHomework}>
                            {completingHomework ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Mark as Completed
                          </Button>
                        ) : <Badge variant="accent"><CheckCircle className="mr-2 h-4 w-4"/>Completed</Badge>}
                      </div>
                    )}
                  </div>
                }
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
