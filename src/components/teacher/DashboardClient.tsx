
"use client";

import { useState, useEffect } from "react";
import { WelcomeMessage } from "@/components/shared/WelcomeMessage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Users, BarChart3, Settings, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs,getCountFromServer } from "firebase/firestore";
import type { StudentProfile } from "@/types";

// Mock data for dashboard overview - pending and events will remain mock for now
const mockTeacherStats = {
  // totalStudents will be replaced by fetched data
  pendingAssignments: 5,
  upcomingEvents: 2,
};

export function TeacherDashboardClient() {
  const { user: teacherUser } = useAuth();
  const [totalStudentsInClass, setTotalStudentsInClass] = useState<number | null>(null);
  const [loadingStudentCount, setLoadingStudentCount] = useState(true);
  const [studentCountError, setStudentCountError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentCount = async () => {
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
          
          // Use getCountFromServer for optimized counting if only count is needed
          const snapshot = await getCountFromServer(q);
          setTotalStudentsInClass(snapshot.data().count);
          console.log(`[TeacherDashboardClient] Fetched student count for Grade ${teacherUser.grade} Div ${teacherUser.division}: ${snapshot.data().count}`);

        } catch (err: any) {
          console.error("Error fetching student count for teacher's class:", err);
          // Check for missing index error
          if (err.code === 'failed-precondition') {
            let firestoreConsoleLink = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/indexes`;
            // Attempt to construct a more specific link if possible, though Firestore error messages are best
            const collectionPath = `studentProfiles`;
            const field1 = `grade`;
            const field2 = `division`;
            // This is a generic pattern, the actual link from Firestore error is more reliable
            const createIndexLink = `https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/indexes?create_composite=ClRwcm9qZWN0cy9${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_ENCODED_PART || 'YOUR_PROJECT_ID_ENCODED_PART'}/databases/(default)/collectionGroups/${collectionPath}/indexes/EgkK${Buffer.from(field1).toString('base64')}${Buffer.from(field2).toString('base64')}Gg4KCmNvdW50cnlfY29kZRABGgwKCF9fbmFtZV9fEAE`;
            
            setStudentCountError(
              `Failed to fetch student count. This query likely requires a Firestore index. Please check the browser console for a direct link to create it, or create an index on 'studentProfiles' for 'grade' (Ascending) AND 'division' (Ascending). Visit Firestore console: ${firestoreConsoleLink}`
            );
          } else {
            setStudentCountError("Failed to fetch student count. Please try again later.");
          }
          setTotalStudentsInClass(0); // Default to 0 on error
        } finally {
          setLoadingStudentCount(false);
        }
      } else {
        // Teacher details not yet loaded or missing grade/division
        setLoadingStudentCount(false);
        setTotalStudentsInClass(0);
        if (teacherUser && (!teacherUser.grade || !teacherUser.division)) {
            setStudentCountError("Your teacher profile is missing grade/division. Please update it.");
        }
      }
    };

    fetchStudentCount();
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
              <div className="text-2xl font-bold">{totalStudentsInClass ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total students in Grade {teacherUser?.grade} Div {teacherUser?.division}.
            </p>
             {/* Placeholder for Boy/Girl count - to be implemented after gender field is added */}
            <p className="text-xs text-muted-foreground mt-1">
              (Boy/Girl count will be available after 'gender' field is added to student profiles.)
            </p>
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
             <Button variant="outline" size="sm" className="w-full">Profile Settings</Button>
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

    