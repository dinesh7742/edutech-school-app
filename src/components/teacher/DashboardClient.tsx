
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Users, BarChart3, Settings, Loader2, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";
import type { StudentProfile } from "@/types";

// Mock data for dashboard overview - pending and events will remain mock for now
const mockTeacherStats = {
  pendingAssignments: 5,
  upcomingEvents: 2,
};

export function TeacherDashboardClient() {
  const { user: teacherUser } = useAuth();
  const [totalStudentsInClass, setTotalStudentsInClass] = useState<number | null>(null);
  const [maleStudents, setMaleStudents] = useState<number>(0);
  const [femaleStudents, setFemaleStudents] = useState<number>(0);
  const [loadingStudentCount, setLoadingStudentCount] = useState(true);
  const [studentCountError, setStudentCountError] = useState<string | null>(null);

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
            const firestoreConsoleLink = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/indexes`;
            setStudentCountError(
              `Failed to fetch student count. Firestore index required for 'grade' & 'division' on 'studentProfiles'. Check console or visit: ${firestoreConsoleLink}`
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

  return (
    <div className="space-y-8">
      <WelcomeMessage />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Students in Your Class ({teacherUser?.grade}{teacherUser?.division})
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStudentCount ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" /> 
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
            <Edit3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeacherStats.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">Homework/Assignments</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeacherStats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">School events this month</p>
          </CardContent>
        </Card>
         <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Settings</CardTitle>
            <Settings className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
             <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/teacher/profile">Profile Settings</Link>
             </Button>
             <p className="text-xs text-muted-foreground mt-1">Manage your account</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
