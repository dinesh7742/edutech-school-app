
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarDays, Dot } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, eachDayOfInterval } from "date-fns";

interface AttendanceRecord {
  date: Date;
  status: AttendanceStatus;
}

interface HolidayOrSunday {
  date: Date;
  note: string;
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
  const [holidaysAndSundays, setHolidaysAndSundays] = useState<HolidayOrSunday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    if (!user || !user.uid || !user.grade || !user.division) {
      setIsLoading(false);
      setError("User details incomplete for fetching attendance.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const attendanceQuery = query(
      collection(db, "dailyAttendance"),
      where("grade", "==", user.grade),
      where("division", "==", user.division)
    );

    const unsubscribe = onSnapshot(attendanceQuery, (querySnapshot) => {
      const studentRecords: AttendanceRecord[] = [];
      const specialDays: HolidayOrSunday[] = [];
      const firstDayOfMonth = startOfMonth(month);
      const lastDayOfMonth = endOfMonth(month);

      querySnapshot.forEach((doc) => {
        const log = doc.data() as DailyAttendanceLog;
        const logDate = parseISO(log.date);

        if (isWithinInterval(logDate, { start: firstDayOfMonth, end: lastDayOfMonth })) {
          const studentStatus = log.studentRecords[user.uid!];
          if (studentStatus) {
            studentRecords.push({
              date: logDate,
              status: studentStatus,
            });
          }
          if (log.note) {
              specialDays.push({ date: logDate, note: log.note });
          }
        }
      });
      
      const allMonthDays = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
      allMonthDays.forEach(day => {
          if (day.getDay() === 0 && !specialDays.some(sd => sd.date.getTime() === day.getTime())) {
              specialDays.push({ date: day, note: "Sunday" });
          }
      });

      specialDays.sort((a,b) => a.date.getTime() - b.date.getTime());

      setHolidaysAndSundays(specialDays);
      setAttendanceRecords(studentRecords);
      setIsLoading(false);
    }, (err: any) => {
      console.error("Error fetching attendance data:", err);
      setError("Could not load attendance data. " + (err.message || ""));
      setIsLoading(false);
    });

    // Cleanup the listener on component unmount or when dependencies change
    return () => unsubscribe();
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
    sunday: { dayOfWeek: [0] as number[] }
  };

  const modifierStyles = {
    present: {
      color: "hsl(var(--primary-foreground))",
      backgroundColor: "hsl(var(--accent))",
    },
    absent: {
      color: "hsl(var(--destructive-foreground))",
      backgroundColor: "hsl(var(--destructive))",
    },
    holiday: {
      color: "hsl(var(--destructive-foreground))",
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
            View your monthly attendance at a glance for {format(month, "MMMM yyyy")}.
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
        {holidaysAndSundays.length > 0 && (
          <div className="w-full mt-6 pt-4 border-t">
            <h4 className="text-md font-semibold text-center text-primary mb-2">Holidays & Sundays for {format(month, "MMMM yyyy")}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
              {holidaysAndSundays.map(({ date, note }) => (
                <div key={date.toString()} className="flex items-center">
                  <Dot className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="font-medium">{format(date, "do MMM")}:</span>
                  <span className="text-muted-foreground ml-2">{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
