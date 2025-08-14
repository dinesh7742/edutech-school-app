
"use client";

import { useState, useEffect, useMemo } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, 
    ClipboardList, 
    BookOpen, 
    Video, 
    ClipboardCheck, 
    MailOpen, 
    AlertTriangle, 
    FileSignature, 
    Users, 
    Download, 
    ListChecks, 
    ArrowRight, 
    BarChart3, 
    MessageSquareWarning, 
    MessageSquare, 
    Archive, 
    Upload,
    GraduationCap,
    Phone,
    FileText,
    Image as ImageIconLucide
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
  const [studentCountError, setStudentCountError] = useState<string | null>(null);

  const [isDownloadingStudentData, setIsDownloadingStudentData] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingLateArrivalCount, setPendingLateArrivalCount] = useState(0);
  const [pendingOtherAppsCount, setPendingOtherAppsCount] = useState(0);
  const [loadingPendingCounts, setLoadingPendingCounts] = useState(true);

  const [todaysAttendanceMarked, setTodaysAttendanceMarked] = useState<boolean | null>(null);
  const [loadingTodaysAttendanceStatus, setLoadingTodaysAttendanceStatus] = useState(true);
  
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // State for the notification dialog
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
        description: "Your profile is missing assigned grade/division. Please update your profile.",
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
        description: "Student data Excel sheet is being prepared for download.",
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

    const runAllFetches = async () => {
        if (teacherUser.grade && teacherUser.division) {
            setLoadingStudents(true);
            setStudentCountError(null);
            try {
                const profilesCollectionRef = collection(db, "studentProfiles");
                const q = query(
                    profilesCollectionRef,
                    where("grade", "==", teacherUser.grade),
                    where("division", "==", teacherUser.division),
                    orderBy("firstName")
                );
                const querySnapshot = await getDocs(q);
                setStudentsInClass(querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentProfile)));
            } catch (err: any) {
                console.error("Error fetching students for teacher's class:", err);
                setStudentCountError("Failed to fetch student data.");
            } finally {
                setLoadingStudents(false);
            }
        } else {
             setLoadingStudents(false);
             setStudentCountError("Your profile is missing grade/division.");
        }

        setLoadingPendingCounts(true);
        try {
            const leaveQuery = query(collection(db, "leaveApplications"), where("status", "==", "Pending"));
            const lateArrivalQuery = query(collection(db, "lateArrivalRequests"), where("status", "==", "Pending"));
            const otherAppsQuery = query(collection(db, "otherStudentApplications"), where("status", "==", "Pending"));
            const [leaveSnapshot, lateArrivalSnapshot, otherAppsSnapshot] = await Promise.all([
                getCountFromServer(leaveQuery), getCountFromServer(lateArrivalQuery), getCountFromServer(otherAppsQuery),
            ]);
            setPendingLeaveCount(leaveSnapshot.data().count);
            setPendingLateArrivalCount(lateArrivalSnapshot.data().count);
            setPendingOtherAppsCount(otherAppsSnapshot.data().count);
        } catch (err) {
            console.error("Error fetching pending submission counts:", err);
        } finally {
            setLoadingPendingCounts(false);
        }

        if (teacherUser.grade && teacherUser.division) {
            setLoadingSubmissions(true);
            try {
                const submissionsRef = collection(db, "homeworkSubmissions");
                const q = query(
                    submissionsRef,
                    where("grade", "==", teacherUser.grade),
                    where("division", "==", teacherUser.division)
                );
                const querySnapshot = await getDocs(q);
                const fetchedSubmissions = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as HomeworkSubmission))
                fetchedSubmissions.sort((a,b) => (b.completedAt as Timestamp).toMillis() - (a.completedAt as Timestamp).toMillis());
                setRecentSubmissions(fetchedSubmissions.slice(0, 5));
            } catch (err) {
                console.error("Error fetching recent homework submissions:", err);
            } finally {
                setLoadingSubmissions(false);
            }
        }

        if (teacherUser.grade && teacherUser.division) {
            setLoadingTodaysAttendanceStatus(true);
            try {
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const attendanceDocId = `${todayStr}_${teacherUser.grade}_${teacherUser.division}`;
                const docSnap = await getDoc(doc(db, "dailyAttendance", attendanceDocId));
                setTodaysAttendanceMarked(docSnap.exists());
            } catch (error) {
                console.error("Error checking today's attendance:", error);
                setTodaysAttendanceMarked(null);
            } finally {
                setLoadingTodaysAttendanceStatus(false);
            }
        }

        const newMessages: NotificationMessage[] = [];
        const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
        
        const checkNewCollection = async (collectionName: string, link: string, engMsg: string, hindiMsg: string, dateField = "applicationTimestamp") => {
            const q = query(collection(db, collectionName), where("status", "==", "Pending"), where(dateField, ">=", twentyFourHoursAgo));
            const snapshot = await getCountFromServer(q);
            if (snapshot.data().count > 0) {
                newMessages.push({ link, english: `${engMsg} (${snapshot.data().count} new)`, hindi: `${hindiMsg} (${snapshot.data().count} नई)` });
            }
        };

        try {
            await checkNewCollection("leaveApplications", "/teacher/leave-applications", "New Leave Applications received.", "नए अवकाश आवेदन प्राप्त हुए हैं।");
            await checkNewCollection("lateArrivalRequests", "/teacher/leave-applications", "New Late Arrival requests received.", "देर से आने के नए अनुरोध प्राप्त हुए हैं।");
            await checkNewCollection("otherStudentApplications", "/teacher/leave-applications", "New Other Applications received.", "अन्य नए आवेदन प्राप्त हुए हैं।");
        } catch (error) {
            console.warn("Could not check for new application submissions:", error);
        }

        setNotificationMessages(newMessages);
        if (!hasOpenedDialog && newMessages.length > 0) {
            setIsNotificationDialogOpen(true);
            hasOpenedDialog = true;
        }
    };

    runAllFetches();

    const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", teacherUser.uid));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
        let unreadFound = false;
        snapshot.forEach(chatDoc => {
            const messages = (chatDoc.data().messages || []) as ChatMessage[];
            if (messages.some(msg => msg.senderId !== teacherUser.uid && !msg.readBy?.includes(teacherUser.uid!))) {
                unreadFound = true;
            }
        });
        setHasUnreadMessages(unreadFound);
    });

    return () => unsubscribe();
  }, [teacherUser, toast]);

  const getAttendanceCardDescription = () => {
    if (loadingTodaysAttendanceStatus) return "Checking today's attendance status...";
    if (todaysAttendanceMarked) return "Attendance for today has already been marked. You can still modify it.";
    if (todaysAttendanceMarked === false) return <span className="font-semibold text-destructive">Attendance for today needs to be marked!</span>;
    if (teacherUser && (!teacherUser.grade || !teacherUser.division)) return "Please update your profile with assigned grade and division to mark attendance.";
    return "Mark daily attendance for students in your assigned class.";
  };
  
  const totalPendingSubmissions = pendingLeaveCount + pendingLateArrivalCount + pendingOtherAppsCount;
  
  const quickStatsItems = [
    {
      id: "teacherInfoAndStudentCount",
      title: `Teacher's Corner & Class ${teacherUser?.grade || 'N/A'}-${teacherUser?.division || ''}`,
      content: loadingStudents ? (
        <div className="flex items-center justify-center space-x-2 h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : studentCountError ? (
         <p className="text-xs text-destructive text-center">{studentCountError}</p>
      ) : (
        <div className="w-full h-full flex flex-col p-4 rounded-lg bg-white text-black shadow-lg border border-gray-200">
            <div className="text-center border-b-2 border-primary pb-2">
                <h3 className="text-xl font-bold text-primary">TEACHER IDENTITY CARD</h3>
                <p className="text-xs text-muted-foreground">PM SHRI MPS VARSHA NAGAR</p>
            </div>
            <div className="flex-grow flex flex-col md:flex-row items-center gap-6 mt-4">
                <Avatar className="h-32 w-32 rounded-md border-4 border-primary/20 shadow-md">
                    <AvatarImage src={teacherUser?.photoURL || undefined} alt={teacherUser?.displayName || 'Teacher'} className="rounded-md" />
                    <AvatarFallback className="text-4xl rounded-md bg-muted">{getInitials(teacherUser?.displayName)}</AvatarFallback>
                </Avatar>
                <div className="text-left space-y-2 flex-grow">
                    <p className="text-2xl font-bold text-foreground">{teacherUser?.displayName}</p>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <span>{teacherUser?.educationQualification || 'Qualification not set'}</span>
                    </div>
                     <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>Teaches: {teacherUser?.subjectTaught || 'Not specified'}</span>
                    </div>
                     <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span>{teacherUser?.whatsAppNumber || 'Contact not set'}</span>
                    </div>
                </div>
            </div>
            
            <div className="w-full mt-4 pt-4 border-t-2 border-dashed">
                 <p className="text-center text-sm text-muted-foreground font-semibold">CLASS IN-CHARGE: Grade {teacherUser?.grade || 'N/A'}-{teacherUser?.division || 'N/A'}</p>
                 <div className="mt-2 flex w-full justify-around items-center">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{totalStudents}</p>
                        <p className="text-xs font-medium text-muted-foreground">Total Students</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-500">{maleStudents}</p>
                        <p className="text-xs font-medium text-muted-foreground">Boys</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-pink-500">{femaleStudents}</p>
                        <p className="text-xs font-medium text-muted-foreground">Girls</p>
                    </div>
                 </div>
            </div>
        </div>
      )
    },
    {
      id: "recentSubmissions",
      title: "Recent Homework Submissions",
      content: loadingSubmissions ? (
         <div className="flex items-center justify-center space-x-2 h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : recentSubmissions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center h-full flex items-center justify-center">No recent submissions for your class.</p>
      ) : (
        <div className="w-full h-full max-h-[400px] overflow-y-auto p-2">
            <ul className="space-y-2 text-xs text-left">
              {recentSubmissions.map((sub) => (
                <li key={sub.id} className="p-2 border rounded-md shadow-sm bg-background">
                  <p className="font-semibold truncate text-sm text-foreground">{sub.homeworkTitle}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">{sub.studentName}</span> submitted.</p>
                  <p className="text-muted-foreground">Completed: {sub.completedAt ? format((sub.completedAt as Timestamp).toDate(), "PP pp") : "N/A"}</p>
                </li>
              ))}
            </ul>
        </div>
      )
    },
  ];

  const mainActionItems = [
     {
      id: "postContent",
      className: "bg-pink-500 hover:bg-pink-600",
      title: "Manage Content",
      description: (
        <div className="grid grid-cols-2 gap-2 w-full text-sm p-1">
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm"><FileText className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Notices</span></div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm"><ClipboardList className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Homework</span></div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm"><FileText className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Circulars</span></div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm"><BookOpen className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Textbooks</span></div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm"><ImageIconLucide className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Gallery</span></div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm"><Video className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Live Classes</span></div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm"><Upload className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Progress Cards</span></div>
        </div>
      ),
      link: "/teacher/post-content",
      buttonText: "Post Content",
      icon: ClipboardList,
    },
    {
      id: "studentData",
      className: "bg-green-600 hover:bg-green-700",
      title: "Student Data",
      description: "View and manage student profiles for your assigned classes and the entire school.",
      link: "/teacher/student-data",
      buttonText: "View Student List",
      icon: Users,
    },
    {
      id: "markAttendance",
      className: "bg-blue-600 hover:bg-blue-700",
      title: "Mark Attendance",
      description: getAttendanceCardDescription(),
      link: "/teacher/mark-attendance",
      buttonText: "Mark Attendance",
      icon: ListChecks,
    },
     {
      id: "manageSubmissions",
      className: "bg-purple-600 hover:bg-purple-700",
      title: "Manage Student Submissions",
      description: (
        loadingPendingCounts ? (
          <div className="flex items-center justify-center space-x-2 h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /><span className="text-sm text-muted-foreground">Loading...</span></div>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full text-sm p-1">
            <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-background shadow-sm">
              <div className="flex items-center gap-2"><MailOpen className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Leave</span></div>
              {pendingLeaveCount > 0 && <Badge variant="destructive">{pendingLeaveCount}</Badge>}
            </div>
            <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-background shadow-sm">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Late</span></div>
              {pendingLateArrivalCount > 0 && <Badge variant="destructive">{pendingLateArrivalCount}</Badge>}
            </div>
             <div className="col-span-2 flex items-center justify-between gap-2 p-2 border rounded-md bg-background shadow-sm">
                <div className="flex items-center gap-2"><FileSignature className="h-4 w-4 text-primary flex-shrink-0" /><span className="font-semibold">Other</span></div>
                {pendingOtherAppsCount > 0 && <Badge variant="destructive">{pendingOtherAppsCount}</Badge>}
            </div>
          </div>
        )
      ),
      link: "/teacher/leave-applications",
      buttonText: "Review Submissions",
      icon: ClipboardCheck,
    },
     {
      id: "studentChats",
      className: "bg-teal-600 hover:bg-teal-700",
      title: "Student Chats",
      description: "Communicate directly with students and parents in your class.",
      link: "/teacher/chat",
      buttonText: "Open Chats",
      icon: MessageSquare,
      hasNotification: hasUnreadMessages,
    },
    {
      id: "studentConduct",
      className: "bg-red-600 hover:bg-red-700",
      title: "Student Conduct",
      description: "File or view student conduct reports and complaints for parent notification.",
      link: "/teacher/conduct-record",
      buttonText: "Manage Complaints",
      icon: MessageSquareWarning,
    },
    {
      id: "progressReports",
      className: "bg-orange-500 hover:bg-orange-600",
      title: "Progress Reports",
      description: "Download templates and upload completed progress reports for your class.",
      link: "/teacher/progress-reports",
      buttonText: "Manage Reports",
      icon: BarChart3,
    },
     {
      id: "dropoutBox",
      className: "bg-slate-600 hover:bg-slate-700",
      title: "Dropout Box",
      description: "View and manage students who have been removed from the active list.",
      link: "/teacher/dropout-list",
      buttonText: "Manage Dropouts",
      icon: Archive,
    },
     {
      id: "downloadData",
      className: "bg-indigo-600 hover:bg-indigo-700",
      title: "Download Class Data",
      description: "Download an Excel sheet of student data for your assigned class.",
      action: handleDownloadStudentData,
      buttonText: "Download Excel",
      loading: isDownloadingStudentData,
      disabled: !teacherUser?.grade || !teacherUser?.division,
      disabledText: "Update profile with grade/division to enable.",
      icon: Download,
    },
  ];


  return (
    <>
      <AlertDialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Today's Notifications / आज की सूचनाएं</AlertDialogTitle>
            <AlertDialogDescription>
                Here are your new items requiring attention. Click to review.
                <br />
                यहां आपके ध्यान देने योग्य नई वस्तुएं हैं। समीक्षा के लिए क्लिक करें।
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
            ) : (
                <p className="text-center text-muted-foreground py-4">
                    No new submissions or messages today. / आज कोई नया सबमिशन या संदेश नहीं है।
                </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsNotificationDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickStatsItems.map((item) => (
          <Card key={item.id} className="shadow-lg rounded-lg flex flex-col text-center transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
            <CardHeader className="p-4 bg-primary text-primary-foreground">
                <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between p-2 space-y-3">
             <div className="flex-grow flex flex-col justify-center items-center w-full min-h-[400px]"> {item.content} </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {mainActionItems.map((item) => (
            <Card key={item.id} className="shadow-lg rounded-lg text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                <CardHeader className="p-4 bg-primary text-primary-foreground">
                    <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                        {item.title}
                        {item.id === "manageSubmissions" && totalPendingSubmissions > 0 && (
                           <Badge variant="destructive" className="animate-pulse ml-2">New!</Badge>
                        )}
                        {item.id === "studentChats" && item.hasNotification && (
                           <Badge variant="destructive" className="animate-pulse ml-2">New!</Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow items-center justify-between p-4 space-y-3">
                    <div className="flex justify-center my-4">
                        <item.icon className={`h-16 w-16 text-primary`} />
                    </div>
                    <div className="text-sm min-h-[4rem] px-2 flex-grow flex flex-col items-center justify-center w-full">
                         {typeof item.description === 'string' ? <CardDescription>{item.description}</CardDescription> : item.description}
                    </div>
                    {item.link ? (
                        <Button asChild className={cn("w-full mt-auto group font-bold text-white", item.className)}>
                            <Link href={item.link}>
                              {item.buttonText}
                              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    ) : item.action ? (
                        <Button 
                            onClick={item.action} 
                            className={cn("w-full mt-auto group font-bold text-white", item.className)} 
                            disabled={item.loading || item.disabled}
                        >
                            {item.loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {item.buttonText}
                        </Button>
                    ) : null}
                    {item.disabled && item.disabledText && <p className="text-xs text-destructive mt-1">{item.disabledText}</p>}
                </CardContent>
            </Card>
         ))}
      </div>
    </div>
    </>
  );
}
