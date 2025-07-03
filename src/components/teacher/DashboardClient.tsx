
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, UserCheck, UserX, FileSpreadsheet, UserCog, CalendarCheck, FileText, ClipboardList, BookOpen, Image as ImageIconLucide, Video, CheckSquare, ClipboardCheck, MailOpen, AlertTriangle, FileSignature } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, Timestamp, getCountFromServer, doc, getDoc } from "firebase/firestore";
import type { StudentProfile, HomeworkSubmission } from "@/types";
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

      // Map data for Excel
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
        description: "Student data Excel sheet is being downloaded.",
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
    const fetchStudentData = async () => {
      if (teacherUser && teacherUser.grade && teacherUser.division) {
        setLoadingStudentCount(true);
        setStudentCountError(null);
        try {
          const profilesCollectionRef = collection(db, "studentProfiles");
          const q = query(
            profilesCollectionRef,
            where("grade", "==", teacherUser.grade),
            where("division", "==", teacherUser.division)
          );
          
          const querySnapshot = await getDocs(q);
          const students = querySnapshot.docs.map(doc => doc.data() as StudentProfile);
          
          setTotalStudentsInClass(students.length);
          
          let males = 0;
          let females = 0;
          students.forEach(student => {
            if (student.gender === "Male") {
              males++;
            } else if (student.gender === "Female") {
              females++;
            }
          });
          setMaleStudents(males);
          setFemaleStudents(females);

        } catch (err: any) {
          console.error("Error fetching student data for teacher's class:", err);
          if (err.code === 'failed-precondition') {
             setStudentCountError(
              `Firestore index required for 'grade' & 'division' on 'studentProfiles'. Please create this index.`
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
      id: "studentCount",
      title: `Students in ${teacherUser?.grade || 'N/A'}${teacherUser?.division || ''}`,
      icon: Users,
      dataAiHint: "group users",
      content: loadingStudentCount ? (
        <div className="flex items-center justify-center space-x-2 h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : studentCountError ? (
         <p className="text-xs text-destructive text-center">{studentCountError}</p>
      ) : (
        <>
          <div className="text-3xl font-bold text-primary">{totalStudentsInClass ?? 0}</div>
          <p className="text-xs text-muted-foreground">Total students.</p>
          <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center justify-center text-muted-foreground">
                  <UserCheck className="mr-1 h-4 w-4 text-blue-500 flex-shrink-0"/> Boys: {maleStudents}
              </div>
              <div className="flex items-center justify-center text-muted-foreground">
                  <UserX className="mr-1 h-4 w-4 text-pink-500 flex-shrink-0"/> Girls: {femaleStudents}
              </div>
          </div>
        </>
      )
    },
    {
      id: "recentSubmissions",
      title: "Recent Homework Submissions",
      icon: CheckSquare, 
      dataAiHint: "homework check",
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
        <ul className="space-y-2 text-xs text-left">
          {recentSubmissions.map(sub => (
            <li key={sub.id} className="p-2 border rounded-md bg-background shadow-sm">
              <p className="font-semibold truncate text-sm">{sub.homeworkTitle}</p>
              <p>Student: {sub.studentName}</p>
              <p>Completed: {sub.completedAt ? format(sub.completedAt.toDate(), "PP pp") : "N/A"}</p>
            </li>
          ))}
        </ul>
      )
    },
     {
      id: "profileSettings",
      title: "Profile Settings",
      icon: UserCog,
      description: "Update your account and display information.",
      dataAiHint: "user settings",
      content: (
        <>
           <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <Link href="/teacher/profile">Manage Profile</Link>
           </Button>
           <p className="text-xs text-muted-foreground mt-1">Update your account</p>
        </>
      )
    },
  ];

  const mainActionItems = [
     {
      title: "Manage Content",
      icon: ClipboardList, 
      description: (
        <ul className="space-y-1 text-left text-xs sm:text-sm text-muted-foreground px-2 sm:px-4">
          <li className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Notices</li>
          <li className="flex items-center"><ClipboardList className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Homework</li>
          <li className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Circulars</li>
          <li className="flex items-center"><BookOpen className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Textbooks</li>
          <li className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Gallery Photos</li>
          <li className="flex items-center"><Video className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Live Classes</li>
        </ul>
      ),
      link: "/teacher/post-content",
      buttonText: "Post Content",
      dataAiHint: "cloud upload"
    },
    {
      title: "Student Data",
      icon: Users,
      description: "View and manage student profiles for your assigned classes and the entire school.",
      link: "/teacher/student-data",
      buttonText: "View Student List",
      dataAiHint: "group users"
    },
    {
      title: "Mark Attendance",
      icon: CalendarCheck,
      description: getAttendanceCardDescription(), // Dynamically get description
      link: "/teacher/mark-attendance",
      buttonText: "Mark Attendance",
      dataAiHint: "calendar check attendance"
    },
     { 
      title: "Manage Student Submissions",
      icon: ClipboardCheck,
      description: (
        loadingPendingCounts ? (
          <div className="flex items-center justify-center space-x-2 h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading pending counts...</span>
          </div>
        ) : totalPendingSubmissions > 0 ? (
          <ul className="space-y-1 text-left text-sm text-muted-foreground px-2 sm:px-4">
            {pendingLeaveCount > 0 && <li className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1"><MailOpen className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Pending Leave: <Badge variant="destructive" className="ml-auto sm:ml-2">{pendingLeaveCount}</Badge></li>}
            {pendingLateArrivalCount > 0 && <li className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1"><AlertTriangle className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Pending Late Arrival: <Badge variant="destructive" className="ml-auto sm:ml-2">{pendingLateArrivalCount}</Badge></li>}
            {pendingOtherAppsCount > 0 && <li className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1"><FileSignature className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> Pending Other Requests: <Badge variant="destructive" className="ml-auto sm:ml-2">{pendingOtherAppsCount}</Badge></li>}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center">No new submissions to review.</p>
        )
      ),
      link: "/teacher/manage-submissions",
      buttonText: "Review Submissions",
      dataAiHint: "clipboard check task"
    },
     {
      title: "Download Class Data",
      icon: FileSpreadsheet,
      description: "Download an Excel sheet of student data for your assigned class.",
      action: handleDownloadStudentData,
      buttonText: "Download Excel",
      loading: isDownloadingStudentData,
      disabled: !teacherUser?.grade || !teacherUser?.division,
      disabledText: "Update profile with grade/division to enable.",
      dataAiHint: "spreadsheet file"
    }
  ];


  return (
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStatsItems.map((item) => (
          <Card key={item.id} className="shadow-lg rounded-lg flex flex-col text-center transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
            <CardHeader className="pb-2 pt-4 items-center">
                 <div className="flex justify-center mb-4">
                    <item.icon className="h-16 w-16 text-primary" data-ai-hint={item.dataAiHint}/>
                </div>
                <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">{item.title}</CardTitle>
                {item.description && <CardDescription className="text-sm min-h-[2.5rem] px-2">{item.description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
             <div className="flex-grow flex flex-col justify-center items-center w-full"> {item.content} </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {mainActionItems.map((item) => (
            <Card key={item.title} className="shadow-lg rounded-lg text-center flex flex-col transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-2">
                <CardHeader className="pb-2 pt-4 items-center">
                    <div className="flex justify-center mb-4">
                        <item.icon className="h-16 w-16 text-primary" data-ai-hint={item.dataAiHint}/>
                    </div>
                    <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">
                        {item.title}
                        {item.title === "Manage Student Submissions" && totalPendingSubmissions > 0 && (
                           <Badge variant="destructive" className="animate-pulse ml-2">New!</Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-3 px-4">
                    <CardDescription className="text-sm min-h-[4rem] px-2 flex-grow flex flex-col items-center justify-center w-full">
                         {typeof item.description === 'string' ? <p>{item.description}</p> : item.description}
                    </CardDescription>
                    {item.link ? (
                        <Button asChild className="w-full mt-auto">
                            <Link href={item.link}>{item.buttonText}</Link>
                        </Button>
                    ) : item.action ? (
                        <Button onClick={item.action} className="w-full mt-auto" disabled={item.loading || item.disabled}>
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
