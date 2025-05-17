
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Users, BarChart3, Settings, Loader2, UserCheck, UserX, Download } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { StudentProfile } from "@/types";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

// Mock data for dashboard overview - pending and events will remain mock for now
const mockTeacherStats = {
  pendingAssignments: 5,
  upcomingEvents: 2,
};

export function TeacherDashboardClient() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [totalStudentsInClass, setTotalStudentsInClass] = useState<number | null>(null);
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  const [loadingStudentCount, setLoadingStudentCount] = useState(true);
  const [studentCountError, setStudentCountError] = useState<string | null>(null);
  const [isDownloadingStudentData, setIsDownloadingStudentData] = useState(false);

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

          console.log(`[TeacherDashboardClient] Fetched ${students.length} students for Grade ${teacherUser.grade} Div ${teacherUser.division}. Males: ${males}, Females: ${females}`);

        } catch (err: any) {
          console.error("Error fetching student data for teacher's class:", err);
          if (err.code === 'failed-precondition') {
             setStudentCountError(
              `Failed to fetch student count. Firestore index required for 'grade' & 'division' on 'studentProfiles'. Please create this index in the Firebase console.`
            );
          } else {
            setStudentCountError("Failed to fetch student data. Please try again later.");
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
            setStudentCountError("Your teacher profile is missing grade/division. Please update it.");
        }
      }
    };

    fetchStudentData();
  }, [teacherUser]);

  const handleDownloadStudentData = async () => {
    setIsDownloadingStudentData(true);
    toast({ title: "Preparing Download", description: "Fetching student data..." });
    try {
      const studentProfilesCollectionRef = collection(db, "studentProfiles");
      // For "all student data", we fetch without grade/division filters
      // If you want to download only the teacher's class, apply where clauses like above.
      const q = query(studentProfilesCollectionRef, where("grade", "==", teacherUser?.grade), where("division", "==", teacherUser?.division)); // Downloading only teacher's class for now
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({ title: "No Data", description: "No student data found to download for your class.", variant: "destructive" });
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
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(studentsData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Data");
      
      // Define the filename
      const filename = `StudentData_Grade${teacherUser?.grade}${teacherUser?.division}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({ title: "Download Started", description: `File ${filename} should be downloading.` });

    } catch (error: any) {
      console.error("Error downloading student data:", error);
      toast({ title: "Download Failed", description: error.message || "Could not download student data.", variant: "destructive" });
       if (error.code === 'failed-precondition') {
          toast({ title: "Index Required", description: "A Firestore index is needed to fetch student data for download. Please create it in the Firebase console.", variant: "destructive", duration: 10000 });
        }
    } finally {
      setIsDownloadingStudentData(false);
    }
  };


  return (
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Students in Your Class ({teacherUser?.grade}{teacherUser?.division})
            </CardTitle>
            <Users className="h-5 w-5 text-foreground" /> {/* Icon color changed to foreground */}
          </CardHeader>
          <CardContent>
            {loadingStudentCount ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-foreground" /> {/* Icon color changed to foreground */}
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : studentCountError ? (
               <p className="text-xs text-destructive">{studentCountError}</p>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalStudentsInClass ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total students in Grade {teacherUser?.grade} Div {teacherUser?.division}.
                </p>
                <div className="mt-2 space-y-1">
                    <div className="flex items-center text-xs">
                        <UserCheck className="h-4 w-4 mr-1 text-blue-500"/> Boys: {maleStudents}
                    </div>
                    <div className="flex items-center text-xs">
                        <UserX className="h-4 w-4 mr-1 text-pink-500"/> Girls: {femaleStudents}
                    </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Edit3 className="h-5 w-5 text-foreground" /> {/* Icon color changed to foreground */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeacherStats.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">Homework/Assignments</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <BarChart3 className="h-5 w-5 text-foreground" /> {/* Icon color changed to foreground */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeacherStats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">School events this month</p>
          </CardContent>
        </Card>
         <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Settings</CardTitle>
            <Settings className="h-5 w-5 text-foreground" /> {/* Icon color changed to foreground */}
          </CardHeader>
          <CardContent>
             <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/teacher/profile">Profile Settings</Link>
             </Button>
             <p className="text-xs text-muted-foreground mt-1">Manage your account</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Manage Content</CardTitle>
            <CardDescription>Post notices, homework, circulars, textbooks, and gallery photos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/teacher/post-content">
              <Button className="w-full">
                <Edit3 className="mr-2 h-5 w-5" /> Go to Content Posting
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Student Data</CardTitle>
            <CardDescription>View and manage student profiles for your classes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/teacher/student-data">
              <Button className="w-full">
                <Users className="mr-2 h-5 w-5" /> View Student List
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Download Student Data</CardTitle>
            <CardDescription>Download an Excel sheet of student data for your class.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleDownloadStudentData} disabled={isDownloadingStudentData || !teacherUser?.grade || !teacherUser?.division}>
              {isDownloadingStudentData ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Download className="mr-2 h-5 w-5" />
              )}
              Download Excel
            </Button>
             {(!teacherUser?.grade || !teacherUser?.division) && <p className="text-xs text-destructive mt-1">Update your profile with grade/division to enable download.</p>}
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent activity to display. This section will show recent posts or student submissions.</p>
        </CardContent>
      </Card>

    </div>
  );
}
