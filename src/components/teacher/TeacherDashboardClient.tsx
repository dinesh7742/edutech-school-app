
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, 
    UserCheck, 
    UserX, 
    FileText, 
    ClipboardList, 
    BookOpen, 
    Image as ImageIconLucide, 
    Video, 
    ClipboardCheck, 
    MailOpen, 
    AlertTriangle, 
    FileSignature, 
    Users, 
    Settings, 
    Download, 
    ListChecks, 
    ArrowRight, 
    BarChart3, 
    MessageSquareWarning, 
    MessageSquare, 
    Archive, 
    Upload,
    GraduationCap
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, Timestamp, getCountFromServer, doc, getDoc, onSnapshot } from "firebase/firestore";
import type { StudentProfile, HomeworkSubmission, ChatMessage, AppUser } from "@/types";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function TeacherDashboardClient() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [totalStudentsInClass, setTotalStudentsInClass] = useState<number | null>(null);
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  const [loadingStudentCount, setLoadingStudentCount] = useState(true);
  const [studentCountError, setStudentCountError] = useState<string | null>(null);
  const [isDownloadingStudentData, setIsDownloadingStudentData] = useState(false);

  const [recentSubmissions, setRecentSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingLateArrivalCount, setPendingLateArrivalCount] = useState(0);
  const [pendingOtherAppsCount, setPendingOtherAppsCount] = useState(0);
  const [loadingPendingCounts, setLoadingPendingCounts] = useState(true);

  const [todaysAttendanceMarked, setTodaysAttendanceMarked] = useState<boolean | null>(null);
  const [loadingTodaysAttendanceStatus, setLoadingTodaysAttendanceStatus] = useState(true);
  
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
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
      const profilesCollectionRef = collection(db, "studentProfiles");
      const q = query(
        profilesCollectionRef,
        where("grade", "==", teacherUser.grade),
        where("division", "==", teacherUser.division),
        orderBy("firstName")
      );
      const querySnapshot = await getDocs(q);
      const studentsToDownload = querySnapshot.docs.map(doc => doc.data() as StudentProfile);

      if (studentsToDownload.length === 0) {
        toast({
          title: "No Data",
          description: "No students found for your assigned class to download.",
        });
        setIsDownloadingStudentData(false);
        return;
      }

      const dataForExcel = studentsToDownload.map(student => ({
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

    const fetchStudentData = async () => {
      if (teacherUser.grade && teacherUser.division) {
        setLoadingStudentCount(true);
        setStudentCountError(null);
        try {
          // Query the 'users' collection which is the source of truth for registered students
          const usersCollectionRef = collection(db, "users");
          const q = query(
            usersCollectionRef,
            where("role", "==", "student"),
            where("grade", "==", teacherUser.grade),
            where("division", "==", teacherUser.division)
          );
          
          const querySnapshot = await getDocs(q);
          const studentUids = querySnapshot.docs.map(doc => doc.id);
          setTotalStudentsInClass(studentUids.length);

          // For gender count, we still need to check the profiles
          let males = 0;
          let females = 0;
          if (studentUids.length > 0) {
            const profilesCollectionRef = collection(db, "studentProfiles");
            const profilesQuery = query(profilesCollectionRef, where("uid", "in", studentUids));
            const profilesSnapshot = await getDocs(profilesQuery);
            profilesSnapshot.forEach(doc => {
                const studentProfile = doc.data() as StudentProfile;
                if (studentProfile.gender === "Male") {
                    males++;
                } else if (studentProfile.gender === "Female") {
                    females++;
                }
            });
          }
          setMaleStudents(males);
          setFemaleStudents(females);

        } catch (err: any) {
          console.error("Error fetching student count for teacher's class:", err);
          if (err.code === 'failed-precondition') {
             setStudentCountError(
              `Firestore index required for users collection. Please create this index.`
            );
          } else {
            setStudentCountError("Failed to fetch student data.");
          }
          setTotalStudentsInClass(0); 
          setMaleStudents(0);
          setFemaleStudents(0);
        } finally {
          setLoadingStudentCount(false);
        }
      } else {
        setLoadingStudentCount(false);
        setTotalStudentsInClass(0);
        setMaleStudents(0);
        setFemaleStudents(0);
        if (teacherUser && (!teacherUser.grade || !teacherUser.division)) {
            setStudentCountError("Your profile is missing grade/division.");
        }
      }
    };

    const fetchRecentSubmissions = async () => {
      if (teacherUser && teacherUser.grade && teacherUser.division) {
        setLoadingSubmissions(true);
        setSubmissionsError(null);
        try {
          const submissionsRef = collection(db, "homeworkSubmissions");
          const q = query(
            submissionsRef,
            where("grade", "==", teacherUser.grade),
            where("division", "==", teacherUser.division),
            orderBy("completedAt", "desc"),
            limit(5) 
          );
          const querySnapshot = await getDocs(q);
          const fetchedSubmissions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              completedAt: data.completedAt as Timestamp, 
            } as HomeworkSubmission;
          });
          setRecentSubmissions(fetchedSubmissions);
        } catch (err: any) {
          console.error("Error fetching recent homework submissions:", err);
          if (err.code === 'failed-precondition') {
            setSubmissionsError(
              `Firestore index required for homework submissions. Please check console for a link to create it.`
            );
          } else {
            setSubmissionsError("Failed to fetch recent submissions.");
          }
        } finally {
          setLoadingSubmissions(false);
        }
      } else {
        setLoadingSubmissions(false);
         if (teacherUser && (!teacherUser.grade || !teacherUser.division)) {
            setSubmissionsError("Your profile is missing grade/division.");
        }
      }
    };

    const fetchPendingCounts = async () => {
      if (!teacherUser) return;
      setLoadingPendingCounts(true);
      try {
        const leaveQuery = query(collection(db, "leaveApplications"), where("status", "==", "Pending"));
        const lateArrivalQuery = query(collection(db, "lateArrivalRequests"), where("status", "==", "Pending"));
        const otherAppsQuery = query(collection(db, "otherStudentApplications"), where("status", "==", "Pending"));

        const [leaveSnapshot, lateArrivalSnapshot, otherAppsSnapshot] = await Promise.all([
          getCountFromServer(leaveQuery),
          getCountFromServer(lateArrivalQuery),
          getCountFromServer(otherAppsQuery),
        ]);

        setPendingLeaveCount(leaveSnapshot.data().count);
        setPendingLateArrivalCount(lateArrivalSnapshot.data().count);
        setPendingOtherAppsCount(otherAppsSnapshot.data().count);

      } catch (err: any) {
        console.error("Error fetching pending submission counts:", err);
        toast({ title: "Error", description: "Could not fetch pending submission counts.", variant: "destructive" });
      } finally {
        setLoadingPendingCounts(false);
      }
    };

    const checkTodaysAttendance = async () => {
      if (teacherUser && teacherUser.grade && teacherUser.division) {
        setLoadingTodaysAttendanceStatus(true);
        try {
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const attendanceDocId = `${todayStr}_${teacherUser.grade}_${teacherUser.division}`;
          const attendanceDocRef = doc(db, "dailyAttendance", attendanceDocId);
          const docSnap = await getDoc(attendanceDocRef);
          setTodaysAttendanceMarked(docSnap.exists());
        } catch (error) {
          console.error("Error checking today's attendance:", error);
          setTodaysAttendanceMarked(null); // Indicate error or unknown state
        } finally {
          setLoadingTodaysAttendanceStatus(false);
        }
      } else {
        setLoadingTodaysAttendanceStatus(false);
        setTodaysAttendanceMarked(null);
      }
    };

    fetchStudentData();
    fetchRecentSubmissions();
    fetchPendingCounts();
    checkTodaysAttendance();

    // Set up listener for unread messages
    const chatsRef = collection(db, "chats");
    const chatsQuery = query(chatsRef, where("participants", "array-contains", teacherUser.uid));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
        let unreadFound = false;
        snapshot.forEach((chatDoc) => {
            const messages = (chatDoc.data().messages || []) as ChatMessage[];
            for (const msg of messages) {
                if (msg.senderId !== teacherUser.uid && !msg.readBy?.includes(teacherUser.uid)) {
                    unreadFound = true;
                    break;
                }
            }
            if (unreadFound) return;
        });
        setHasUnreadMessages(unreadFound);
    });

    return () => unsubscribe();
  }, [teacherUser, toast]);

  const getAttendanceCardDescription = () => {
    if (loadingTodaysAttendanceStatus) {
      return "Checking today's attendance status...";
    }
    if (todaysAttendanceMarked === true) {
      return "Attendance for today has already been marked. You can still modify it.";
    }
    if (todaysAttendanceMarked === false) {
      return <span className="font-semibold text-destructive">Attendance for today needs to be marked!</span>;
    }
    // Fallback if teacher grade/division is missing or another issue
    if (teacherUser && (!teacherUser.grade || !teacherUser.division)) {
        return "Please update your profile with assigned grade and division to mark attendance.";
    }
    return "Mark daily attendance for students in your assigned class.";
  };
  
  const totalPendingSubmissions = pendingLeaveCount + pendingLateArrivalCount + pendingOtherAppsCount;
  
  const quickStatsItems = [
    {
      id: "teacherInfoAndStudentCount",
      title: `Teacher's Corner & Class ${teacherUser?.grade || 'N/A'}-${teacherUser?.division || ''}`,
      icon: Users,
      content: loadingStudentCount ? (
        <div className="flex items-center justify-center space-x-2 h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : studentCountError ? (
         <p className="text-xs text-destructive text-center">{studentCountError}</p>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-between p-4 rounded-lg">
            {/* Teacher Info Section */}
            <div className="flex items-center w-full gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary">
                    <AvatarImage src={teacherUser?.photoURL || undefined} alt={teacherUser?.displayName || 'Teacher'} />
                    <AvatarFallback className="text-2xl bg-muted">{getInitials(teacherUser?.displayName)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                    <p className="text-lg font-bold text-foreground">{teacherUser?.displayName}</p>
                    <div className="flex items-center text-sm text-muted-foreground gap-1.5 mt-1">
                        <GraduationCap className="h-4 w-4" />
                        <span>{teacherUser?.educationQualification || 'Qualification not set'}</span>
                    </div>
                </div>
            </div>

            {/* Student Count Section */}
            <div className="w-full mt-4 pt-4 border-t">
                 <p className="text-sm text-muted-foreground font-semibold">Total Students</p>
                 <div className="text-5xl font-extrabold text-primary my-1">{totalStudentsInClass ?? 0}</div>
                 <div className="mt-2 flex w-full justify-around items-center">
                    <div className="flex flex-col items-center gap-1 text-foreground">
                        <UserCheck className="h-7 w-7 text-blue-500"/>
                        <span className="font-bold text-lg">{maleStudents}</span>
                        <span className="text-xs font-medium text-muted-foreground">Boys</span>
                    </div>
                    <div className="h-12 w-px bg-border/50"></div>
                    <div className="flex flex-col items-center gap-1 text-foreground">
                        <UserX className="h-7 w-7 text-pink-500"/>
                        <span className="font-bold text-lg">{femaleStudents}</span>
                        <span className="text-xs font-medium text-muted-foreground">Girls</span>
                    </div>
                 </div>
            </div>
        </div>
      )
    },
    {
      id: "recentSubmissions",
      title: "Recent Homework Submissions",
      icon: ClipboardCheck,
      content: loadingSubmissions ? (
         <div className="flex items-center justify-center space-x-2 h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : submissionsError ? (
        <p className="text-xs text-destructive text-center">{submissionsError}</p>
      ) : recentSubmissions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center h-full flex items-center justify-center">No recent submissions for your class.</p>
      ) : (
        <div className="w-full h-full max-h-[300px] overflow-y-auto p-2">
            <ul className="space-y-2 text-xs text-left">
              {recentSubmissions.map((sub) => (
                <li key={sub.id} className="p-2 border rounded-md shadow-sm bg-background">
                  <p className="font-semibold truncate text-sm text-foreground">{sub.homeworkTitle}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">{sub.studentName}</span> submitted.</p>
                  <p className="text-muted-foreground">Completed: {sub.completedAt ? format(sub.completedAt.toDate(), "PP pp") : "N/A"}</p>
                </li>
              ))}
            </ul>
        </div>
      )
    },
  ];

  const mainActionItems = [
     {
      title: "Manage Content",
      description: (
        <div className="grid grid-cols-2 gap-2 w-full text-sm p-1">
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Notices</span>
          </div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
            <ClipboardList className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Homework</span>
          </div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Circulars</span>
          </div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Textbooks</span>
          </div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
            <ImageIconLucide className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Gallery</span>
          </div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
            <Video className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Live Classes</span>
          </div>
          <div className="flex items-center gap-2 p-2 border rounded-md bg-background shadow-sm">
            <Upload className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold">Progress Cards</span>
          </div>
        </div>
      ),
      link: "/teacher/post-content",
      buttonText: "Post Content",
      icon: ClipboardList,
    },
    {
      title: "Student Data",
      description: "View and manage student profiles for your assigned classes and the entire school.",
      link: "/teacher/student-data",
      buttonText: "View Student List",
      icon: Users,
    },
    {
      title: "Mark Attendance",
      description: getAttendanceCardDescription(), // Dynamically get description
      link: "/teacher/mark-attendance",
      buttonText: "Mark Attendance",
      icon: ListChecks,
    },
     { 
      title: "Manage Student Submissions",
      description: (
        loadingPendingCounts ? (
          <div className="flex items-center justify-center space-x-2 h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full text-sm p-1">
            <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-background shadow-sm">
              <div className="flex items-center gap-2">
                <MailOpen className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold">Leave</span>
              </div>
              {pendingLeaveCount > 0 && <Badge variant="destructive">{pendingLeaveCount}</Badge>}
            </div>
            <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-background shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold">Late</span>
              </div>
              {pendingLateArrivalCount > 0 && <Badge variant="destructive">{pendingLateArrivalCount}</Badge>}
            </div>
             <div className="col-span-2 flex items-center justify-between gap-2 p-2 border rounded-md bg-background shadow-sm">
                <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-semibold">Other</span>
                </div>
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
      title: "Student Chats",
      description: "Communicate directly with students and parents in your class.",
      link: "/teacher/chat",
      buttonText: "Open Chats",
      icon: MessageSquare,
      hasNotification: hasUnreadMessages,
    },
    {
      title: "Student Conduct",
      description: "File or view student conduct reports and complaints for parent notification.",
      link: "/teacher/conduct-record",
      buttonText: "Manage Complaints",
      icon: MessageSquareWarning,
    },
    {
      title: "Progress Reports",
      description: "Download templates and upload completed progress reports for your class.",
      link: "/teacher/progress-reports",
      buttonText: "Manage Reports",
      icon: BarChart3,
    },
     {
      title: "Dropout Box",
      description: "View and manage students who have been removed from the active list.",
      link: "/teacher/dropout-list",
      buttonText: "Manage Dropouts",
      icon: Archive,
    },
     {
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
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickStatsItems.map((item) => (
          <Card key={item.id} className="shadow-lg rounded-lg flex flex-col text-center transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
            <div className="p-4 bg-primary text-primary-foreground">
                <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">{item.title}</CardTitle>
            </div>
            <CardContent className="flex flex-col flex-grow items-center justify-between p-2 space-y-3">
             <div className="flex-grow flex flex-col justify-center items-center w-full min-h-[300px]"> {item.content} </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {mainActionItems.map((item, index) => (
            <Card key={item.title} className="shadow-lg rounded-lg text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                <div className="p-4 bg-primary text-primary-foreground">
                    <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                        {item.title}
                        {item.title === "Manage Student Submissions" && totalPendingSubmissions > 0 && (
                           <Badge variant="destructive" className="animate-pulse ml-2">New!</Badge>
                        )}
                        {item.title === "Student Chats" && item.hasNotification && (
                           <Badge variant="destructive" className="animate-pulse ml-2">New!</Badge>
                        )}
                    </CardTitle>
                </div>
                <CardContent className="flex flex-col flex-grow items-center justify-between p-4 space-y-3">
                    <div className="flex justify-center my-4">
                        <item.icon className={`h-16 w-16 text-primary`} />
                    </div>
                    <div className="text-sm min-h-[4rem] px-2 flex-grow flex flex-col items-center justify-center w-full">
                         {typeof item.description === 'string' ? <CardDescription>{item.description}</CardDescription> : item.description}
                    </div>
                    {item.link ? (
                        <Button asChild className="w-full mt-auto group text-primary" variant="outline">
                            <Link href={item.link}>
                              {item.buttonText}
                              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    ) : item.action ? (
                        <Button onClick={item.action} className="w-full mt-auto group text-primary" variant="outline" disabled={item.loading || item.disabled}>
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
  );
}
