
"use client";

import { useState, useEffect, useMemo } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, ClipboardList, BookOpen, Video, ClipboardCheck, Users, Download, ListChecks, ArrowRight, BarChart3, MessageSquareWarning, MessageSquare, Archive, GraduationCap, Phone
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, Timestamp, getCountFromServer, doc, getDoc, onSnapshot } from "firebase/firestore";
import type { StudentProfile, HomeworkSubmission, ChatMessage, NotificationMessage } from "@/types";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function TeacherDashboardClient() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  
  const [studentsInClass, setStudentsInClass] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [isDownloadingStudentData, setIsDownloadingStudentData] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
  const [loadingPendingCounts, setLoadingPendingCounts] = useState(true);

  const [todaysAttendanceMarked, setTodaysAttendanceMarked] = useState<boolean | null>(null);
  const [loadingTodaysAttendanceStatus, setLoadingTodaysAttendanceStatus] = useState(true);
  
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [notificationMessages, setNotificationMessages] = useState<NotificationMessage[]>([]);
  
  const { totalStudents, maleStudents, femaleStudents } = useMemo(() => {
    const total = studentsInClass.length;
    const males = studentsInClass.filter(s => s.gender === 'Male').length;
    const females = studentsInClass.filter(s => s.gender === 'Female').length;
    return { totalStudents: total, maleStudents: males, femaleStudents: females };
  }, [studentsInClass]);
  
  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const handleDownloadStudentData = async () => {
    if (!teacherUser?.grade || !teacherUser?.division) {
      toast({
        title: "Cannot Download Data",
        description: "Your profile is missing assigned grade/division.",
        variant: "destructive",
      });
      return;
    }
    setIsDownloadingStudentData(true);
    try {
      if (studentsInClass.length === 0) {
        toast({
          title: "No Data",
          description: "No students found for your assigned class to download.",
        });
        setIsDownloadingStudentData(false);
        return;
      }

      const dataForExcel = studentsInClass.map(student => ({
        "First Name": student.firstName || "",
        "Middle Name": student.middleName || "",
        "Last Name": student.lastName || "",
        "Mother's Name": student.motherName || "",
        "Father's Occupation": student.fatherOccupation || "",
        "Mother's Occupation": student.motherOccupation || "",
        "Date of Birth": student.dateOfBirth || "",
        "Gender": student.gender || "",
        "Grade": student.grade || "",
        "Division": student.division || "",
        "Contact Number": student.contactNumber || "",
        "Aadhar Card Number": student.aadharCardNumber || "",
        "PEN Number": student.penNumber || "",
        "G.R. Number": student.grNumber || "",
        "Religion": student.religion || "",
        "Caste": student.caste || "",
        "Full Address": student.fullAddress || "",
        "Email": student.email || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Grade_${teacherUser.grade}${teacherUser.division}`);
      
      XLSX.writeFile(workbook, `Student_Data_Grade_${teacherUser.grade}${teacherUser.division}.xlsx`);

      toast({
        title: "Download Started",
        description: "Student data Excel sheet is being prepared.",
      });

    } catch (error: any) {
      console.error("Error downloading student data:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Could not download student data.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingStudentData(false);
    }
  };

  useEffect(() => {
    if (!teacherUser) return;

    let hasOpenedDialog = false;

    const fetchAllData = async () => {
      // Fetch students in class
      if (teacherUser.grade && teacherUser.division) {
        setLoadingStudents(true);
        const profilesQuery = query(collection(db, "studentProfiles"), where("grade", "==", teacherUser.grade), where("division", "==", teacherUser.division), orderBy("firstName"));
        getDocs(profilesQuery).then(snapshot => {
          setStudentsInClass(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentProfile)));
        }).catch(err => console.error("Error fetching students:", err)).finally(() => setLoadingStudents(false));
      } else {
        setLoadingStudents(false);
      }
      
      // Fetch pending submission counts
      setLoadingPendingCounts(true);
      const leaveQuery = query(collection(db, "leaveApplications"), where("status", "==", "Pending"));
      const lateArrivalQuery = query(collection(db, "lateArrivalRequests"), where("status", "==", "Pending"));
      const otherAppsQuery = query(collection(db, "otherStudentApplications"), where("status", "==", "Pending"));
      Promise.all([getCountFromServer(leaveQuery), getCountFromServer(lateArrivalQuery), getCountFromServer(otherAppsQuery)])
        .then(([leave, late, other]) => {
          setPendingSubmissionsCount(leave.data().count + late.data().count + other.data().count);
        }).catch(err => console.error("Error fetching submission counts:", err)).finally(() => setLoadingPendingCounts(false));

      // Fetch recent homework submissions
      if (teacherUser.grade && teacherUser.division) {
        setLoadingSubmissions(true);
        const submissionsQuery = query(collection(db, "homeworkSubmissions"), where("grade", "==", teacherUser.grade), where("division", "==", teacherUser.division), orderBy("completedAt", "desc"), limit(5));
        getDocs(submissionsQuery).then(snapshot => {
          setRecentSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HomeworkSubmission)));
        }).catch(err => console.error("Error fetching submissions:", err)).finally(() => setLoadingSubmissions(false));
      }

      // Check today's attendance
      if (teacherUser.grade && teacherUser.division) {
        setLoadingTodaysAttendanceStatus(true);
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const attendanceDocId = `${todayStr}_${teacherUser.grade}_${teacherUser.division}`;
        getDoc(doc(db, "dailyAttendance", attendanceDocId)).then(docSnap => {
          setTodaysAttendanceMarked(docSnap.exists());
        }).catch(err => console.error("Error checking attendance:", err)).finally(() => setLoadingTodaysAttendanceStatus(false));
      }

      // Check for new notifications to show in dialog
      const newMessages: NotificationMessage[] = [];
      const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const checkNewCollection = async (collectionName: string, link: string, engMsg: string, hindiMsg: string) => {
        const q = query(collection(db, collectionName), where("status", "==", "Pending"), where("applicationTimestamp", ">=", twentyFourHoursAgo));
        const snapshot = await getCountFromServer(q);
        if (snapshot.data().count > 0) {
            newMessages.push({ link, english: `${engMsg} (${snapshot.data().count} new)`, hindi: `${hindiMsg} (${snapshot.data().count} नई)` });
        }
      };
      
      try {
        await checkNewCollection("leaveApplications", "/teacher/leave-applications", "New Leave Applications", "नए अवकाश आवेदन");
        if (!hasOpenedDialog && newMessages.length > 0) {
            setNotificationMessages(newMessages);
            setIsNotificationDialogOpen(true);
            hasOpenedDialog = true;
        }
      } catch (error) { console.warn("Could not check for new submissions:", error); }
    };

    fetchAllData();

    // Listen for unread messages
    const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", teacherUser.uid));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
        setHasUnreadMessages(snapshot.docs.some(chatDoc => 
            (chatDoc.data().messages || []).some((msg: ChatMessage) => msg.senderId !== teacherUser.uid && !msg.readBy?.includes(teacherUser.uid!))
        ));
    });

    return () => unsubscribe();
  }, [teacherUser]);

  const getAttendanceCardDescription = () => {
    if (loadingTodaysAttendanceStatus) return "Checking status...";
    if (todaysAttendanceMarked) return "Attendance for today has been marked.";
    if (todaysAttendanceMarked === false) return <span className="font-semibold text-destructive">Attendance for today is pending!</span>;
    if (teacherUser && (!teacherUser.grade || !teacherUser.division)) return "Update profile to mark attendance.";
    return "Mark daily attendance for your class.";
  };

  const mainActionItems = [
    { id: "postContent", title: "Manage Content", description: "Create notices, homework, circulars, and more.", link: "/teacher/post-content", buttonText: "Post Content", icon: ClipboardList, className: "bg-pink-500 hover:bg-pink-600" },
    { id: "studentData", title: "Student Data", description: "View and manage student profiles for your assigned classes.", link: "/teacher/student-data", buttonText: "View Student List", icon: Users, className: "bg-green-600 hover:bg-green-700" },
    { id: "markAttendance", title: "Mark Attendance", description: getAttendanceCardDescription(), link: "/teacher/mark-attendance", buttonText: "Mark Attendance", icon: ListChecks, className: "bg-blue-600 hover:bg-blue-700" },
    { id: "manageSubmissions", title: "Manage Student Submissions", description: loadingPendingCounts ? <Loader2 className="h-5 w-5 animate-spin"/> : `Review applications. ${pendingSubmissionsCount} pending.`, link: "/teacher/leave-applications", buttonText: "Review Submissions", icon: ClipboardCheck, className: "bg-purple-600 hover:bg-purple-700" },
    { id: "studentChats", title: "Student Chats", description: "Communicate directly with students and parents.", link: "/teacher/chat", buttonText: "Open Chats", icon: MessageSquare, hasNotification: hasUnreadMessages, className: "bg-teal-600 hover:bg-teal-700" },
    { id: "studentConduct", title: "Student Conduct", description: "File or view student conduct reports and complaints.", link: "/teacher/conduct-record", buttonText: "Manage Complaints", icon: MessageSquareWarning, className: "bg-red-600 hover:bg-red-700" },
    { id: "progressReports", title: "Progress Reports", description: "Download templates and upload completed reports.", link: "/teacher/progress-reports", buttonText: "Manage Reports", icon: BarChart3, className: "bg-orange-500 hover:bg-orange-600" },
    { id: "dropoutBox", title: "Dropout Box", description: "View and manage students removed from active lists.", link: "/teacher/dropout-list", buttonText: "Manage Dropouts", icon: Archive, className: "bg-slate-600 hover:bg-slate-700" },
    { id: "downloadData", title: "Download Class Data", description: "Download an Excel sheet of student data for your class.", action: handleDownloadStudentData, buttonText: "Download Excel", loading: isDownloadingStudentData, disabled: !teacherUser?.grade || !teacherUser?.division, disabledText: "Update profile with grade/division to enable.", icon: Download, className: "bg-indigo-600 hover:bg-indigo-700" },
  ];

  return (
    <>
      <AlertDialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Today's Notifications / आज की सूचनाएं</AlertDialogTitle>
            <AlertDialogDescription>
                New items require your attention. Click to review.
                <br />
                नई वस्तुएं पर आपके ध्यान की आवश्यकता है। समीक्षा के लिए क्लिक करें।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-3 max-h-60 overflow-y-auto">
            {notificationMessages.length > 0 ? (
                notificationMessages.map((msg, index) => (
                    <Link key={index} href={msg.link} onClick={() => setIsNotificationDialogOpen(false)} className="block p-3 border rounded-md hover:bg-muted transition-colors">
                        <p className="font-semibold">{msg.english}</p>
                        <p className="text-sm text-muted-foreground">{msg.hindi}</p>
                    </Link>
                ))
            ) : <p className="text-center text-muted-foreground py-4">No new submissions today.</p>}
          </div>
          <AlertDialogFooter><AlertDialogAction onClick={() => setIsNotificationDialogOpen(false)}>OK</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        <WelcomeMessage />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Teacher's Corner</CardTitle></CardHeader>
            <CardContent>
              {loadingStudents ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-24 w-24 border-4 border-primary/20"><AvatarImage src={teacherUser?.photoURL || undefined} /><AvatarFallback className="text-3xl">{getInitials(teacherUser?.displayName)}</AvatarFallback></Avatar>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{teacherUser?.displayName}</p>
                    <p className="text-muted-foreground">Class Teacher: {teacherUser?.grade}-{teacherUser?.division}</p>
                    <p className="text-sm text-muted-foreground">{teacherUser?.educationQualification}</p>
                  </div>
                  <div className="flex justify-around w-full pt-4 border-t">
                      <div><p className="text-2xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">Total Students</p></div>
                      <div><p className="text-2xl font-bold">{maleStudents}</p><p className="text-xs text-muted-foreground">Boys</p></div>
                      <div><p className="text-2xl font-bold">{femaleStudents}</p><p className="text-xs text-muted-foreground">Girls</p></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Recent Homework Submissions</CardTitle></CardHeader>
            <CardContent>
              {loadingSubmissions ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : recentSubmissions.length === 0 ? <p className="text-sm text-muted-foreground">No recent submissions.</p> : (
                <ul className="space-y-3">
                  {recentSubmissions.map(sub => (
                    <li key={sub.id} className="text-sm"><span className="font-semibold">{sub.studentName}</span> submitted "{sub.homeworkTitle}".</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mainActionItems.map((item) => (
              <Card key={item.id} className="shadow-lg rounded-lg text-center flex flex-col transition-transform hover:-translate-y-1">
                  <CardHeader className="flex-grow">
                      <div className="flex justify-center mb-3"><item.icon className={`h-12 w-12 text-primary`} /></div>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                      <CardDescription className="text-sm min-h-[40px] mt-2">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className={cn("w-full mt-auto group", item.className)}>
                        {item.link ? <Link href={item.link}>{item.buttonText} <ArrowRight className="ml-2 h-4 w-4"/></Link> : 
                        <button onClick={item.action} disabled={item.loading || item.disabled}>
                            {item.loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {item.buttonText}
                        </button>}
                    </Button>
                  </CardContent>
              </Card>
          ))}
        </div>
      </div>
    </>
  );
}
