
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
    const isSunday = date.getDay() === 0;

    return (
        <div className="relative flex flex-col items-center justify-center h-full w-full">
            {isSunday && !holiday && (
                 <svg
                    className="absolute top-0 right-0 w-full h-full text-destructive/30"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path d="M100 0 L0 100 L100 100 Z" fill="currentColor" />
                 </svg>
            )}
            {holiday && (
                 <svg
                    className="absolute top-0 right-0 w-full h-full text-[hsl(var(--wb-holiday-bg))]"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path d="M100 0 L0 100 L100 100 Z" fill="currentColor" />
                 </svg>
            )}
            <span className="relative z-10">{format(date, 'd')}</span>
            {holiday && (
                <span className="absolute bottom-1 z-10 text-[8px] font-bold text-wb-holiday-text leading-none truncate px-1">
                    {holiday.name}
                </span>
            )}
             {isSunday && !holiday && (
                <span className="absolute bottom-1 z-10 text-[8px] font-bold text-destructive-foreground leading-none truncate px-1">
                    Sunday
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
    // holiday and sunday styling is now handled by DayContent
    holiday: {},
    sunday: {},
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
                table: { width: '100%', maxWidth: '100%', borderCollapse: 'collapse'},
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
                    paddingBottom: 'calc(100% / 7 - 1rem)',
                    overflow: 'hidden',
                    border: '1px solid hsl(var(--border))'
                },
                day: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    height: 'auto',
                    width: 'auto',
                    borderRadius: '0', // No radius for the day itself
                    fontSize: '1.5rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                day_outside: {
                  color: "hsl(var(--muted-foreground))",
                  opacity: 0.5,
                }
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
                <div className="h-4 w-4 rounded-full bg-destructive/30" />
                <span>Sunday</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

