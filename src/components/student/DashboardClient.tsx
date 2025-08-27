
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, CheckCircle, ArrowRight, FileText, ClipboardList, BookOpen, Video, FileSignature, Users, Contact, Award, ImageIcon, School, MessageSquare, Edit
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc, serverTimestamp, getCountFromServer, onSnapshot, writeBatch } from "firebase/firestore";
import type { Notice, Homework, Circular, LiveClass, HomeworkSubmission, ChatMessage, AppNotification, StudentProfile } from "@/types";
import { TodaySpecial } from "@/components/shared/TodaySpecial";
import { StudentAttendanceDetails } from "@/components/student/StudentAttendanceDetails";
import { useToast } from "@/hooks/use-toast";
import { FileViewer, type FileInfo } from "@/components/shared/FileViewer";
import { BirthdayPopup } from "@/components/shared/BirthdayPopup";
import { format } from 'date-fns';
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MessageSquareWarning } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [notificationMessages, setNotificationMessages] = useState<AppNotification[]>([]);
  
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
    
    // Listen for new notifications
    const notificationsRef = collection(db, "notifications");
    const notificationsQuery = query(
      notificationsRef,
      where("recipientUid", "==", user.uid),
      where("isRead", "==", false)
    );
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const newNotifications = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as AppNotification) }));
        setNotificationMessages(current => [...current, ...newNotifications]);
        if (!isNotificationDialogOpen) {
          setIsNotificationDialogOpen(true);
        }
      }
    });
    
    const fetchDashboardData = async () => {
      setLoadingContent(true);

      try {
        const complaintsRef = collection(db, "complaints");
        const complaintsQuery = query(complaintsRef, where("studentUid", "==", user.uid), where("status", "==", "Pending Acknowledgment"));
        const complaintsSnapshot = await getCountFromServer(complaintsQuery);
        setPendingNotificationCount(complaintsSnapshot.data().count);
      } catch (error) { console.error("Error fetching pending notifications:", error); }
      

      try {
        if (!user.grade || !user.division) {
          console.warn("User is missing grade or division, skipping content fetch.");
          setLoadingContent(false);
          return;
        }

        const noticeQuery = query(collection(db, "notices"), where('grade', 'in', [null, '', user.grade]));
        const homeworkQuery = query(collection(db, "homework"), where("grade", "==", user.grade), where("division", "==", user.division));
        const circularQuery = query(collection(db, "circulars"), where('grade', 'in', [null, '', user.grade]));
        const liveClassQuery = query(collection(db, "liveClasses"), where('grade', 'in', [null, '', user.grade]));

        const [noticeSnap, homeworkSnap, circularSnap, liveClassSnap] = await Promise.all([
            getDocs(noticeQuery),
            getDocs(homeworkQuery),
            getDocs(circularQuery),
            getDocs(liveClassQuery),
        ]);
        
        const sortAndGetLatest = (snapshot: any) => {
          if (snapshot.empty) return null;
          const docs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
          docs.sort((a: any, b: any) => (b.timestamp as Timestamp).toMillis() - (a.timestamp as Timestamp).toMillis());
          return docs[0];
        }

        const latestNotice = sortAndGetLatest(noticeSnap);
        const latestHomework = sortAndGetLatest(homeworkSnap);
        const latestCircular = sortAndGetLatest(circularSnap);
        const latestLiveClass = sortAndGetLatest(liveClassSnap);

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
    
    if (user.grade && user.division) {
      const chatId = `group_chat_${user.grade}_${user.division}`;
      const chatDocRef = doc(db, "chats", chatId);
      const unsubscribeChat = onSnapshot(chatDocRef, (chatDoc) => {
          if(chatDoc.exists()) {
              const messages = (chatDoc.data().messages || []) as ChatMessage[];
              setHasUnreadMessages(messages.some(msg => msg.senderId !== user.uid && !msg.readBy?.includes(user.uid || '')));
          }
      });
      return () => unsubscribeChat();
    }
    
    return () => {
        unsubscribeNotifications();
    };
  }, [user, toast, isNotificationDialogOpen]);

  const markNotificationsAsRead = async () => {
    if (notificationMessages.length === 0) return;

    const batch = writeBatch(db);
    notificationMessages.forEach(notif => {
      const notifRef = doc(db, 'notifications', notif.id);
      batch.update(notifRef, { isRead: true });
    });
    try {
      await batch.commit();
      setNotificationMessages([]);
    } catch (error) {
      console.error("Error marking notifications as read: ", error);
    }
  };
  
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
    { 
      id: "notices", 
      title: "Notice Board", 
      link: "/student/notices", 
      contentData: latestContent.notice, 
      icon: FileText, 
      buttonText: "View All",
      gradient: "from-yellow-400 to-orange-500",
    },
    { 
      id: "homework", 
      title: "Homework", 
      link: "/student/homework", 
      contentData: latestContent.homework, 
      icon: ClipboardList, 
      buttonText: "View All",
      gradient: "from-yellow-400 to-orange-500",
    },
    { 
      id: "circulars", 
      title: "Circulars", 
      link: "/student/circulars", 
      contentData: latestContent.circular, 
      icon: FileText, 
      buttonText: "View All",
      gradient: "from-yellow-400 to-orange-500",
    },
    { 
      id: "liveClasses", 
      title: "Live Classes", 
      link: "/student/live-classes", 
      contentData: latestContent.liveClass, 
      icon: Video, 
      buttonText: "View All",
      gradient: "from-cyan-400 to-blue-500",
    }
  ];

  const quickActionLinks = [
    { id: "results", title: "Results", link: "/student/results", icon: Award },
    { id: "exams", title: "Online Exams", link: "/student/exams", icon: Edit },
    { id: "applications", title: "Applications", link: "/student/my-applications", icon: FileSignature },
    { id: "textbooks", title: "Textbooks", link: "/student/textbooks", icon: BookOpen },
    { id: "gallery", title: "Gallery", link: "/student/gallery", icon: ImageIcon },
    { id: "icard", title: "I-Card", link: "/student/icard", icon: Contact },
    { id: "profile", title: "My Profile", link: "/student/profile", icon: Users },
    { id: "chat", title: "Chat", link: "/student/chat", icon: MessageSquare, hasNotification: hasUnreadMessages },
    { id: "conduct", title: "Parent Notifications", link: "/student/conduct-record", icon: MessageSquareWarning, hasNotification: pendingNotificationCount > 0 },
    { id: "school", title: "About School", link: "/student/about-school", icon: School },
  ];

  const getHindiMessage = (notification: AppNotification) => {
    switch(notification.type) {
        case "NewNotice": return `नई सूचना: ${notification.message.replace('New Notice: ', '')}`;
        case "NewHomework": return `नया होमवर्क: ${notification.message.replace('New homework posted for ', '')}`;
        case "NewCircular": return `नया परिपत्र: ${notification.message.replace('New Circular: ', '')}`;
        case "NewLiveClass": return `नई लाइव क्लास: ${notification.message.replace('Live class scheduled for ', '')}`;
        default: return "नई अधिसूचना";
    }
  }

  return (
    <>
      <AlertDialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Updates / नई सूचनाएं</AlertDialogTitle>
            <AlertDialogDescription>
                You have new items. Click to view.
                <br />
                आपके लिए नई वस्तुएं हैं। देखने के लिए क्लिक करें।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-3 max-h-60 overflow-y-auto">
            {notificationMessages.map((msg, index) => (
                <Link key={index} href={msg.link} onClick={() => { setIsNotificationDialogOpen(false); markNotificationsAsRead(); }} className="block p-3 border rounded-md hover:bg-muted transition-colors">
                    <p className="font-semibold">{msg.message}</p>
                    <p className="text-sm text-muted-foreground">{getHindiMessage(msg)}</p>
                </Link>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {setIsNotificationDialogOpen(false); markNotificationsAsRead(); }}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showBirthdayPopup && birthdayStudent && <BirthdayPopup student={birthdayStudent} onClose={closeBirthdayPopup} />}
      <FileViewer fileInfo={viewingFile} onOpenChange={(isOpen) => !isOpen && setViewingFile(null)} />
      <div className="space-y-8">
        <WelcomeMessage />
        <StudentAttendanceDetails />
        <TodaySpecial />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.map(card => (
            <Card key={card.id} className={cn("shadow-lg rounded-2xl overflow-hidden group text-black", card.gradient)}>
                <CardHeader className="p-4">
                  <CardTitle className="flex justify-between items-center text-xl">
                    <span className="flex items-center gap-2 font-bold">
                       {card.title === "Live Classes" ? (
                         <span className="border-2 border-black rounded-md px-3 py-1 bg-white/20">
                           {card.title}
                         </span>
                       ) : card.title === "Circulars" ? (
                         <span className="border-2 border-black rounded-md px-3 py-1 bg-white/20">
                           {card.title}
                         </span>
                       ) : card.title === "Notice Board" ? (
                         <span className="border-2 border-black rounded-md px-3 py-1 bg-white/20">
                           {card.title}
                         </span>
                       ) : card.title === "Homework" ? (
                         <span className="border-2 border-black rounded-md px-3 py-1 bg-white/20">
                           {card.title}
                         </span>
                       ) : (
                         card.title
                       )}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="text-black hover:bg-black/20 hover:text-white">
                      <Link href={card.link}>{card.buttonText} <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4 min-h-[150px]">
                  <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center bg-white/20 rounded-full p-2 group-hover:scale-105 transition-transform duration-300">
                      <card.icon className="h-12 w-12 text-blue-800" />
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                      {loadingContent ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div> : !card.contentData ? <p className="opacity-80 text-center font-semibold">No new {card.id.toLowerCase()} found.</p> :
                      <div className="space-y-1">
                          <h3 className="font-bold text-lg line-clamp-2">{card.contentData.title || card.contentData.subject}</h3>
                          {card.contentData.description && <p className="text-sm opacity-90 line-clamp-2 font-semibold">{card.contentData.description}</p>}
                          {(card.id === "homework") && (
                          <div className="pt-2">
                              {!isLatestHomeworkCompleted ? (
                              <Button size="sm" onClick={handleMarkHomeworkCompleted} disabled={completingHomework} variant="secondary">
                                  {completingHomework ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Mark as Completed
                              </Button>
                              ) : <Badge variant="accent"><CheckCircle className="mr-2 h-4 w-4"/>Completed</Badge>}
                          </div>
                          )}
                      </div>
                      }
                  </div>
                </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {quickActionLinks.map(link => (
            <Link key={link.id} href={link.link}>
              <Card className="text-center p-4 h-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 group bg-gradient-to-br from-yellow-400 to-orange-500">
                <div className="relative mb-2">
                  <div className="p-3 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors duration-300">
                    <link.icon className="h-8 w-8 text-blue-800" />
                  </div>
                  {link.hasNotification && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500/75 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white"></span>
                    </span>
                  )}
                </div>
                <p className="font-bold text-black">{link.title}</p>
              </Card>
            </Link>
          ))}
        </div>
        
      </div>
    </>
  );
}
