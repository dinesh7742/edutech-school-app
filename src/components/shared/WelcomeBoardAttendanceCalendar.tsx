
"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarDays } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { DailyAttendanceLog } from "@/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { specialDays2025, type SpecialDay } from "./TodaySpecial";

const holidays = specialDays2025.map(day => ({...day, date: parseISO(day.date)}));

const DayContent = memo(({ date }: { date: Date }) => {
    const holiday = holidays.find(h => h.date.toDateString() === date.toDateString());
    return (
        <div className="relative flex flex-col items-center justify-center h-full">
            <span>{format(date, 'd')}</span>
            {holiday && (
                <span className="absolute bottom-0.5 text-[8px] font-bold text-wb-holiday-text leading-none truncate">
                    {holiday.name}
                </span>
            )}
        </div>
    );
});
DayContent.displayName = 'DayContent';

export function WelcomeBoardAttendanceCalendar() {
  const [presentDays, setPresentDays] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const attendanceQuery = query(collection(db, "dailyAttendance"));

    const unsubscribe = onSnapshot(attendanceQuery, (querySnapshot) => {
      const records: Date[] = [];
      const firstDayOfMonth = startOfMonth(month);
      const lastDayOfMonth = endOfMonth(month);

      querySnapshot.forEach((doc) => {
        const log = doc.data() as DailyAttendanceLog;
        const logDate = parseISO(log.date);
        
        if (isWithinInterval(logDate, { start: firstDayOfMonth, end: lastDayOfMonth })) {
            records.push(logDate);
        }
      });
      
      setPresentDays(records);
      setIsLoading(false);
    }, (err: any) => {
      console.error("Error fetching attendance data:", err);
      setError("Could not load attendance data. " + (err.message || ""));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [month]);

  const modifiers = {
    present: presentDays,
    holiday: holidays.map(h => h.date),
    sunday: { dayOfWeek: [0] as number[] }
  };

  const modifierStyles = {
    present: {
      color: "hsl(var(--wb-present-text))",
      backgroundColor: "hsl(var(--wb-present-bg))",
    },
    holiday: {
        color: "hsl(var(--wb-holiday-text))",
        backgroundColor: "hsl(var(--wb-holiday-bg))",
    },
    sunday: {
      color: "hsl(var(--destructive-foreground))",
      backgroundColor: "hsl(var(--destructive) / 0.7)",
    },
  };

  return (
    <Card className="w-full h-full shadow-2xl rounded-2xl bg-card/80 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="text-4xl font-bold text-primary flex items-center gap-3 justify-center">
            <CalendarDays className="h-10 w-10" />
            Class Attendance
        </CardTitle>
        <CardDescription className="text-center text-lg">
            {format(month, "MMMM yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-2 sm:p-4 md:p-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
            className="p-0 w-full"
            components={{ DayContent }}
            styles={{
                root: { width: '100%' },
                months: { width: '100%' },
                month: { width: '100%', spaceY: '1rem' },
                table: { width: '100%', maxWidth: '100%', borderCollapse: 'separate', borderSpacing: '0.5rem' },
                head_row: {
                    display: 'flex',
                    width: '100%',
                },
                head_cell: { 
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'hsl(var(--muted-foreground))'
                },
                row: {
                    display: 'flex',
                    width: '100%',
                },
                cell: {
                    flex: 1,
                    position: 'relative',
                    height: 'auto',
                    paddingBottom: 'calc(100% / 7 - 1rem)', // creates square cells
                    overflow: 'hidden',
                },
                day: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    height: 'auto',
                    width: 'auto',
                    borderRadius: '0.75rem',
                    fontSize: '1.5rem',
                    fontWeight: '500'
                },
                 day_selected: {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                },
                day_today: {
                  fontWeight: 'bold',
                  color: 'hsl(var(--primary))',
                  border: '2px solid hsl(var(--primary))'
                },
            }}
          />
        )}
         <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-md">
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-[hsl(var(--wb-present-bg))]" />
                <span>Present</span>
            </div>
             <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-[hsl(var(--wb-holiday-bg))]" />
                <span>Holiday</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-[hsl(var(--destructive)/0.7)]" />
                <span>Sunday</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
