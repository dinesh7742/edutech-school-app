
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarDays, Dot, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, eachDayOfInterval } from "date-fns";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  date: Date;
  status: AttendanceStatus;
}

interface HolidayOrSunday {
  date: Date;
  note: string;
}

const specialDays2025: { date: string; name: string }[] = [
  { date: '2025-01-26', name: 'Republic Day' },
  { date: '2025-08-15', name: 'Independence Day' },
  { date: '2025-10-02', name: 'Gandhi Jayanti' },
  { date: '2025-12-25', name: 'Christmas Day' },
];

const holidays = specialDays2025.map(day => parseISO(day.date));

export function StudentAttendanceCalendar() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [holidaysAndSundays, setHolidaysAndSundays] = useState<HolidayOrSunday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!user || !user.uid) {
      setIsLoading(false);
      setError("User details incomplete for fetching attendance.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const firstDayOfMonth = startOfMonth(month);
    const lastDayOfMonth = endOfMonth(month);

    // Fetch all attendance for the month to avoid complex queries
    const attendanceQuery = query(
      collection(db, "dailyAttendance"),
      where("date", ">=", format(firstDayOfMonth, "yyyy-MM-dd")),
      where("date", "<=", format(lastDayOfMonth, "yyyy-MM-dd"))
    );

    const fetchAttendance = async () => {
      try {
        const querySnapshot = await getDocs(attendanceQuery);
        const studentRecords: AttendanceRecord[] = [];
        const specialDays: HolidayOrSunday[] = [];

        querySnapshot.forEach((doc) => {
          const log = doc.data() as DailyAttendanceLog;
          
          if (log.grade === user.grade && log.division === user.division) {
              const logDate = parseISO(log.date);

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
      } catch (err: any) {
         console.error("Error fetching attendance data:", err);
         setError("Could not load attendance data. " + (err.message || ""));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttendance();
  }, [user, month]);

  const absentDays = useMemo(() =>
    attendanceRecords
      .filter(r => r.status === "Absent")
      .map(r => r.date),
    [attendanceRecords]
  );
  
  const presentDays = useMemo(() =>
    attendanceRecords
      .filter(r => r.status === "Present" && !absentDays.some(ad => ad.getTime() === r.date.getTime()))
      .map(r => r.date),
    [attendanceRecords, absentDays]
  );


  const modifiers = {
    present: presentDays,
    absent: absentDays,
    holiday: holidays,
    sunday: { dayOfWeek: [0] as number[] }
  };

  const modifierStyles = {
    present: {
      color: "hsl(var(--wb-present-text))",
      backgroundColor: "hsl(var(--wb-present-bg))",
    },
    absent: {
      color: "hsl(var(--wb-holiday-text))",
      backgroundColor: "hsl(var(--wb-holiday-bg))",
    },
    holiday: {
      color: "hsl(var(--wb-holiday-text))",
      backgroundColor: "hsl(var(--wb-holiday-bg))",
    },
    sunday: {
      color: "hsl(var(--wb-sunday-text))",
      backgroundColor: "hsl(var(--wb-sunday-bg))",
    },
  };

  return (
    <Card className="shadow-lg rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
      <CardHeader>
        <div className="inline-block border-2 border-primary rounded-lg px-4 py-2 mx-auto">
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3 justify-center">
                <CalendarDays className="h-6 w-6" />
                My Attendance Calendar
            </CardTitle>
        </div>
        <CardDescription className="text-primary/80 text-center">
            View your monthly attendance at a glance for {format(month, "MMMM yyyy")}.
        </CardDescription>
        <div className="pt-2 text-center">
            <Button onClick={() => setIsExpanded(!isExpanded)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                {isExpanded ? 'Hide Calendar' : 'Show Calendar'}
            </Button>
        </div>
      </CardHeader>
      <div className={cn("overflow-hidden transition-all duration-500 ease-in-out", isExpanded ? "max-h-[1000px] visible" : "max-h-0 invisible")}>
        <CardContent className="flex flex-col items-center pt-2 bg-white/50 m-2 rounded-lg">
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
           <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm w-full pt-4 border-t">
              <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[hsl(var(--wb-present-bg))]" />
                  <span>Present</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[hsl(var(--wb-holiday-bg))]" />
                  <span>Absent</span>
              </div>
               <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[hsl(var(--wb-sunday-bg))]" />
                  <span>Sunday / Holiday</span>
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
      </div>
    </Card>
  );
}
