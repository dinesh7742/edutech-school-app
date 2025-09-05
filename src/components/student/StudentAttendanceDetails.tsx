
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ListChecks, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MINIMUM_ATTENDANCE_THRESHOLD = 75;

interface AttendanceStats {
  present: number;
  absent: number;
  totalMarked: number;
  percentage: number | null;
}

export function StudentAttendanceDetails() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats>({ present: 0, absent: 0, totalMarked: 0, percentage: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMonth = new Date();

  useEffect(() => {
    if (!user || !user.grade || !user.division) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const firstDay = startOfMonth(currentMonth);
    const lastDay = endOfMonth(currentMonth);
    
    const attendanceQuery = query(
      collection(db, "dailyAttendance"),
      where("grade", "==", user.grade),
      where("division", "==", user.division)
    );
    
    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      let presentDays = 0;
      let totalMarkedDays = 0;

      snapshot.forEach(doc => {
        const data = doc.data() as DailyAttendanceLog;
        const logDate = parseISO(data.date);

        if (isWithinInterval(logDate, { start: firstDay, end: lastDay })) {
            const studentStatus = data.studentRecords[user.uid!];
            if (studentStatus) {
                totalMarkedDays++;
                if (studentStatus === 'Present') {
                    presentDays++;
                }
            }
        }
      });
      
      const absentDays = totalMarkedDays - presentDays;
      const percentage = totalMarkedDays > 0 ? Math.round((presentDays / totalMarkedDays) * 100) : null;
      
      setStats({ present: presentDays, absent: absentDays, totalMarked: totalMarkedDays, percentage });
      setLoading(false);
    }, (err) => {
      console.error("Error fetching attendance: ", err);
      setError("Could not load attendance summary.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentMonth]);

  return (
    <div className="shadow-lg rounded-2xl overflow-hidden bg-gradient-to-tr from-background to-muted/30 border-primary/10 w-full">
      <div className="p-4">
          <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-6 w-6 text-primary"/>
              Attendance Summary - {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
      </div>
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {loading ? (
          <div className="flex justify-center items-center w-full h-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
           <p className="text-destructive text-center w-full">{error}</p>
        ) : (
          <>
            <div className="w-full sm:w-auto flex-grow space-y-3">
              <div className="flex justify-around items-center text-center">
                  <div className="px-2">
                      <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                      <p className="text-xs font-medium text-muted-foreground">PRESENT</p>
                  </div>
                   <div className="px-2">
                      <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                      <p className="text-xs font-medium text-muted-foreground">ABSENT</p>
                  </div>
                   <div className="px-2">
                      <p className="text-2xl font-bold text-primary">{stats.totalMarked}</p>
                      <p className="text-xs font-medium text-muted-foreground">TOTAL DAYS</p>
                  </div>
              </div>
              {stats.percentage !== null && (
                <div>
                   <Progress value={stats.percentage} className="h-3" />
                   <p className="text-sm font-bold text-center mt-1.5"
                      style={{ color: stats.percentage >= MINIMUM_ATTENDANCE_THRESHOLD ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
                        {stats.percentage.toFixed(1)}% Attendance
                   </p>
                </div>
              )}
            </div>
            <div className="w-full sm:w-auto">
               <Button asChild className="w-full sm:w-auto">
                    <Link href="/student/attendance">
                        View Full Calendar <ArrowRight className="ml-2 h-4 w-4"/>
                    </Link>
                </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
