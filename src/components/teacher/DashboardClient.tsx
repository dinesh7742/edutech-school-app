
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Users, BarChart3, Settings, Loader2, UserCheck, UserX, Download, UploadCloud, FileSpreadsheet, UserCog, CalendarCheck, FileText, ClipboardList, BookOpen, Image as ImageIconLucide, Video, Tv2, CheckSquare, MailOpen, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
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
            limit(5) // Show latest 5 submissions
          );
          const querySnapshot = await getDocs(q);
          const fetchedSubmissions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              completedAt: data.completedAt as Timestamp, // Ensure type
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

    fetchStudentData();
    fetchRecentSubmissions();
  }, [teacherUser]);

  const handleDownloadStudentData = async () => {
    setIsDownloadingStudentData(true);
    toast({ title: "Preparing Download", description: "Fetching student data..." });
    if (!teacherUser?.grade || !teacherUser?.division) {
      toast({ title: "Missing Info", description: "Your profile must have grade and division to download class data.", variant: "destructive"});
      setIsDownloadingStudentData(false);
      return;
    }
    try {
      const studentProfilesCollectionRef = collection(db, "studentProfiles");
      const q = query(studentProfilesCollectionRef, where("grade", "==", teacherUser.grade), where("division", "==", teacherUser.division));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({ title: "No Data", description: "No student data found for your class.", variant: "destructive" });
        setIsDownloadingStudentData(false);
        return;
      }

      const studentsData = querySnapshot.docs.map(doc => {
        const data = doc.data() as StudentProfile;
        return {
          UID: data.uid,
          "First Name": data.firstName,
          "Middle Name": data.middleName || "",
          "Last Name": data.lastName,
          "Mother's Name": data.motherName || "",
          Gender: data.gender || "",
          Grade: data.grade,
          Division: data.division,
          Email: data.email || "",
          "Contact Number": data.contactNumber || "",
          "Aadhar Card Number": data.aadharCardNumber || "",
          "PEN Number": data.penNumber || "",
          "GR Number": data.grNumber || "",
          Religion: data.religion || "",
          Caste: data.caste || "",
          "Full Address": data.fullAddress || "",
          "Photo URL": data.photoUrl || "",
          "Date of Birth": data.dateOfBirth || ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(studentsData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Data");
      
      const filename = `StudentData_Grade${teacherUser?.grade}${teacherUser?.division}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({ title: "Download Started", description: `File ${filename} should be downloading.` });

    } catch (error: any) {
      console.error("Error downloading student data:", error);
      toast({ title: "Download Failed", description: error.message || "Could not download student data.", variant: "destructive" });
       if (error.code === 'failed-precondition') {
          toast({ title: "Index Required", description: "A Firestore index is needed for grade & division on studentProfiles. Please create it.", variant: "destructive", duration: 10000 });
        }
    } finally {
      setIsDownloadingStudentData(false);
    }
  };

  const quickStatsItems = [
    {
      id: "studentCount",
      title: `Students in ${teacherUser?.grade || 'N/A'}${teacherUser?.division || ''}`,
      icon: Users,
      dataAiHint: "group users",
      content: loadingStudentCount ? (
        <div className="flex items-center justify-center space-x-2 h-full">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : studentCountError ? (
         <p className="text-xs text-destructive text-center">{studentCountError}</p>
      ) : (
        <>
          <div className="text-3xl font-bold">{totalStudentsInClass ?? 0}</div>
          <p className="text-xs text-muted-foreground">Total students.</p>
          <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center justify-center text-muted-foreground">
                  <UserCheck className="h-4 w-4 mr-1 text-blue-500"/> Boys: {maleStudents}
              </div>
              <div className="flex items-center justify-center text-muted-foreground">
                  <UserX className="h-4 w-4 mr-1 text-pink-500"/> Girls: {femaleStudents}
              </div>
          </div>
        </>
      )
    },
    {
      id: "recentSubmissions",
      title: "Recent Homework Submissions",
      icon: CheckSquare, // Changed icon
      dataAiHint: "homework check",
      content: loadingSubmissions ? (
         <div className="flex items-center justify-center space-x-2 h-full">
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
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
      id: "upcomingEvents", // Kept for structure, can be implemented later
      title: "Upcoming Events",
      icon: BarChart3,
      dataAiHint: "calendar event",
      description: "School events and important dates this month.",
      content: (
        <>
          <div className="text-3xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">School events this month</p>
          <p className="text-xs text-muted-foreground mt-2">(Feature to be implemented)</p>
        </>
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
      icon: UploadCloud,
      description: (
        <ul className="space-y-1 text-left text-xs sm:text-sm text-muted-foreground px-2 sm:px-4">
          <li className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" /> Notices</li>
          <li className="flex items-center"><ClipboardList className="mr-2 h-4 w-4 text-primary" /> Homework</li>
          <li className="flex items-center"><FileText className="mr-2 h-4 w-4 text-primary" /> Circulars</li>
          <li className="flex items-center"><BookOpen className="mr-2 h-4 w-4 text-primary" /> Textbooks</li>
          <li className="flex items-center"><ImageIconLucide className="mr-2 h-4 w-4 text-primary" /> Gallery Photos</li>
          <li className="flex items-center"><Video className="mr-2 h-4 w-4 text-primary" /> Live Classes</li>
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
      description: "Mark daily attendance for students in your assigned class.",
      link: "/teacher/mark-attendance",
      buttonText: "Mark Attendance",
      dataAiHint: "calendar check attendance"
    },
    {
      title: "Leave Applications",
      icon: MailOpen,
      description: "Review and process student leave applications.",
      link: "/teacher/leave-applications",
      buttonText: "Manage Leave",
      dataAiHint: "mail open letter"
    },
    {
      title: "Late Arrival Requests",
      icon: AlertTriangle,
      description: "Review late arrival / early departure requests.",
      link: "/teacher/late-arrival-requests",
      buttonText: "Manage Requests",
      dataAiHint: "alert triangle time"
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
          <Card key={item.id} className="shadow-lg rounded-lg flex flex-col text-center">
            <CardHeader className="pb-2">
                 <div className="flex items-center justify-center mb-3">
                    <item.icon className="h-16 w-16 text-foreground" data-ai-hint={item.dataAiHint}/>
                </div>
                <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">{item.title}</CardTitle>
                {item.description && <CardDescription className="text-sm h-10 line-clamp-2">{item.description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-4">
             <div className="flex-grow flex flex-col justify-center items-center"> {item.content} </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {mainActionItems.map((item) => (
            <Card key={item.title} className="shadow-lg rounded-lg text-center flex flex-col">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-center mb-3">
                        <item.icon className="h-16 w-16 text-foreground" data-ai-hint={item.dataAiHint}/>
                    </div>
                    <CardTitle className="text-xl font-semibold flex items-center justify-center gap-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow items-center justify-between pt-2 pb-6 space-y-4">
                    <div className="text-sm text-muted-foreground px-4 flex-grow flex items-center justify-center">
                        {item.description}
                    </div>
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
