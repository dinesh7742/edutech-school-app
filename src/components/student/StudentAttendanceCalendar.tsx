
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarDays } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";

interface AttendanceRecord {
  date: Date;
  status: AttendanceStatus;
}

// In a real app, this would come from a shared helper or API
const specialDays2025: { date: string; name: string }[] = [
  { date: '2025-01-26', name: 'Republic Day' },
  { date: '2025-08-15', name: 'Independence Day' },
  { date: '2025-10-02', name: 'Gandhi Jayanti' },
  { date: '2025-12-25', name: 'Christmas Day' },
  // Add other national/major school holidays
];

const holidays = specialDays2025.map(day => parseISO(day.date));

export function StudentAttendanceCalendar() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    if (!user || !user.uid || !user.grade || !user.division) {
      setIsLoading(false);
      setError("User details incomplete for fetching attendance.");
      return;
    }

    const fetchAttendanceData = async () => {
      setIsLoading(true);
      setError(null);
      setAttendanceRecords([]);

      try {
        const firstDayOfMonth = startOfMonth(month);
        const lastDayOfMonth = endOfMonth(month);

        // Simplified query to avoid composite index
        const attendanceQuery = query(
          collection(db, "dailyAttendance"),
          where("grade", "==", user.grade),
          where("division", "==", user.division)
        );

        const querySnapshot = await getDocs(attendanceQuery);
        const records: AttendanceRecord[] = [];

        querySnapshot.forEach((doc) => {
          const log = doc.data() as DailyAttendanceLog;
          const logDate = parseISO(log.date);

          // Filter by date on the client side
          if (isWithinInterval(logDate, { start: firstDayOfMonth, end: lastDayOfMonth })) {
            const studentStatus = log.studentRecords[user.uid!];
            if (studentStatus) {
              records.push({
                date: logDate,
                status: studentStatus,
              });
            }
          }
        });
        
        setAttendanceRecords(records);
      } catch (err: any) {
        console.error("Error fetching attendance data:", err);
        setError("Could not load attendance data. " + (err.message || ""));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user, month]);

  const presentDays = attendanceRecords
    .filter(r => r.status === "Present")
    .map(r => r.date);

  const absentDays = attendanceRecords
    .filter(r => r.status !== "Present")
    .map(r => r.date);

  const modifiers = {
    present: presentDays,
    absent: absentDays,
    holiday: holidays,
    sunday: { dayOfWeek: [0] }
  };

  const modifierStyles = {
    present: {
      color: "white",
      backgroundColor: "hsl(var(--accent))",
    },
    absent: {
      color: "white",
      backgroundColor: "hsl(var(--destructive))",
    },
    holiday: {
      color: "white",
      backgroundColor: "hsl(var(--destructive))",
    },
    sunday: {
      color: "hsl(var(--destructive-foreground))",
      backgroundColor: "hsl(var(--destructive) / 0.5)",
    },
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            My Attendance Calendar
        </CardTitle>
        <CardDescription>
            View your monthly attendance at a glance.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : error ? (
           <p className="text-center text-destructive py-10">{error}</p>
        ) : (
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            modifiers={modifiers}
            modifiersStyles={modifierStyles}
            className="p-0"
            styles={{
              day: {
                borderRadius: '9999px',
                width: '2.5rem',
                height: '2.5rem'
              },
            }}
          />
        )}
         <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent" />
                <span>Present</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span>Absent / Holiday</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
