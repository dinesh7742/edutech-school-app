
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { DailyAttendanceLog, StudentProfile } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const MINIMUM_ATTENDANCE_THRESHOLD = 75;

export function StudentAttendanceSummary() {
  const { user } = useAuth();
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null | undefined>(undefined); // undefined means not fetched yet
  const [isLoadingProfilePhoto, setIsLoadingProfilePhoto] = useState(true);


  useEffect(() => {
    if (!user || !user.uid) {
      setIsLoadingProfilePhoto(false);
      return;
    }

    const fetchProfilePhoto = async () => {
      setIsLoadingProfilePhoto(true);
      try {
        const profileDocRef = doc(db, "studentProfiles", user.uid);
        const profileDocSnap = await getDoc(profileDocRef);
        if (profileDocSnap.exists()) {
          const profileData = profileDocSnap.data() as StudentProfile;
          setProfilePhotoUrl(profileData.photoUrl || null); // Use null if empty to differentiate from 'not fetched'
        } else {
          setProfilePhotoUrl(null); // Profile doesn't exist, use null
        }
      } catch (err) {
        console.error("Error fetching profile photo for summary:", err);
        setProfilePhotoUrl(null); // Error occurred, use null
      } finally {
        setIsLoadingProfilePhoto(false);
      }
    };

    fetchProfilePhoto();
  }, [user]);


  useEffect(() => {
    if (!user || !user.uid || !user.grade || !user.division) {
      setIsLoadingAttendance(false);
      setAttendanceError("User details incomplete for fetching attendance.");
      return;
    }
    console.log("[StudentAttendanceSummary] User for summary:", user);

    const fetchAttendanceData = async () => {
      setIsLoadingAttendance(true);
      setAttendanceError(null);
      try {
        const attendanceQuery = query(
          collection(db, "dailyAttendance"),
          where("grade", "==", user.grade),
          where("division", "==", user.division)
        );

        const querySnapshot = await getDocs(attendanceQuery);
        let presentDays = 0;
        let totalMarkedDays = 0;

        querySnapshot.forEach((doc) => {
          const log = doc.data() as DailyAttendanceLog;
          const studentStatus = log.studentRecords[user.uid!]; 
          if (studentStatus) { 
            totalMarkedDays++;
            if (studentStatus === "Present") {
              presentDays++;
            }
          }
        });
        
        console.log(`[StudentAttendanceSummary] Calculation: Present Days: ${presentDays}, Total Marked Days: ${totalMarkedDays} for student ${user.uid}`);
        console.log("[StudentAttendanceSummary] User object from useAuth:", user);


        if (totalMarkedDays > 0) {
          const percentage = Math.round((presentDays / totalMarkedDays) * 100);
          setAttendancePercentage(percentage);
        } else {
          setAttendancePercentage(null); 
        }
      } catch (err: any) {
        console.error("Error fetching attendance data for summary:", err);
        setAttendanceError("Could not load attendance summary. " + (err.message || ""));
        if (err.code === 'failed-precondition') {
          setAttendanceError("A Firestore index might be required for fetching attendance. Please check the console for a link to create it.");
        }
        setAttendancePercentage(null);
      } finally {
        setIsLoadingAttendance(false);
      }
    };

    fetchAttendanceData();
  }, [user]);

  const getInitials = (name?: string | null) => {
    if (!name) return "??";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!user) return null;

  const finalPhotoUrl = profilePhotoUrl !== undefined ? profilePhotoUrl : user.photoURL;


  return (
    <Card className="shadow-lg rounded-lg bg-card text-card-foreground my-6 overflow-hidden">
      <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
        {isLoadingProfilePhoto ? (
          <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full flex-shrink-0" />
        ) : (
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-primary shadow-md flex-shrink-0">
            <AvatarImage src={finalPhotoUrl || undefined} alt={user.displayName || "Student"} data-ai-hint="student portrait" />
            <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-grow text-center sm:text-left">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">
            Welcome, <span className="text-primary">{user.displayName || "Student"}</span>! Keep Going.
          </h2>
          
          {isLoadingAttendance && (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          )}

          {!isLoadingAttendance && attendanceError && (
             <p className="mt-3 text-sm text-destructive">{attendanceError}</p>
          )}

          {!isLoadingAttendance && !attendanceError && attendancePercentage !== null && (
            <div className="mt-3">
              <p className="text-md text-muted-foreground">
                Your current attendance is{" "}
                <span className={`font-bold ${attendancePercentage >= MINIMUM_ATTENDANCE_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                  {attendancePercentage.toFixed(2)}%
                </span>
                {attendancePercentage >= MINIMUM_ATTENDANCE_THRESHOLD 
                  ? `, which is above ${MINIMUM_ATTENDANCE_THRESHOLD.toFixed(2)}% of minimum attendance mark.`
                  : `, which is below ${MINIMUM_ATTENDANCE_THRESHOLD.toFixed(2)}% of minimum attendance mark. Please improve.`
                }
              </p>
              <Progress value={attendancePercentage} className="mt-2 h-3" />
            </div>
          )}
           {!isLoadingAttendance && !attendanceError && attendancePercentage === null && (
             <p className="mt-3 text-sm text-muted-foreground">Attendance data not yet available.</p>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
