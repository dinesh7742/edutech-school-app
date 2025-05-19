
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const MINIMUM_ATTENDANCE_THRESHOLD = 75;

export function StudentAttendanceSummary() {
  const { user } = useAuth();
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.uid || !user.grade || !user.division) {
      setIsLoading(false);
      setError("User details incomplete for fetching attendance.");
      return;
    }
    console.log("[StudentAttendanceSummary] User for summary:", user);

    const fetchAttendanceData = async () => {
      setIsLoading(true);
      setError(null);
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
          const studentStatus = log.studentRecords[user.uid!]; // Student's status for THIS specific day
          if (studentStatus) { // Check if the student was marked on this day
            totalMarkedDays++;
            if (studentStatus === "Present") {
              presentDays++;
            }
          }
        });
        
        console.log(`[StudentAttendanceSummary] Calculation: Present Days: ${presentDays}, Total Marked Days: ${totalMarkedDays} for student ${user.uid}`);

        if (totalMarkedDays > 0) {
          const percentage = Math.round((presentDays / totalMarkedDays) * 100);
          setAttendancePercentage(percentage);
        } else {
          setAttendancePercentage(null); 
        }
      } catch (err: any) {
        console.error("Error fetching attendance data for summary:", err);
        setError("Could not load attendance summary. " + (err.message || ""));
        if (err.code === 'failed-precondition') {
          setError("A Firestore index might be required for fetching attendance. Please check the console for a link to create it.");
        }
        setAttendancePercentage(null);
      } finally {
        setIsLoading(false);
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


  return (
    <Card className="shadow-lg rounded-lg bg-card text-card-foreground my-6 overflow-hidden">
      <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-primary shadow-md flex-shrink-0">
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "Student"} data-ai-hint="student portrait" />
          <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-grow text-center sm:text-left">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">
            Welcome, <span className="text-primary">{user.displayName || "Student"}</span>! Keep Going.
          </h2>
          
          {isLoading && (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          )}

          {!isLoading && error && (
             <p className="mt-3 text-sm text-destructive">{error}</p>
          )}

          {!isLoading && !error && attendancePercentage !== null && (
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
           {!isLoading && !error && attendancePercentage === null && (
             <p className="mt-3 text-sm text-muted-foreground">Attendance data not yet available.</p>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
