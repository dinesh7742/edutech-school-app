
"use client";

import { useEffect, useState, memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarDays, Dot } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { DailyAttendanceLog } from "@/types";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, eachDayOfInterval } from "date-fns";

// In a real app, this would come from a shared helper or API
const specialDays2025: { date: string; name: string }[] = [
  { date: '2025-01-26', name: 'Republic Day' },
  { date: '2025-08-15', name: 'Independence Day' },
  { date: '2025-10-02', name: 'Gandhi Jayanti' },
  { date: '2025-12-25', name: 'Christmas Day' },
  // Add other national/major school holidays
];

const holidays = specialDays2025.map(day => ({...day, date: parseISO(day.date)}));

const DayContent = memo(({ date }: { date: Date }) => {
    const holiday = holidays.find(h => h.date.toDateString() === date.toDateString());
    const isSunday = date.getDay() === 0;

    return (
        <div className="relative flex flex-col items-center justify-center h-full w-full">
            {isSunday && !holiday && (
                 <svg
                    className="absolute top-0 right-0 w-full h-full text-[hsl(var(--wb-sunday-bg))]"
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
                <span className="absolute bottom-1 z-10 text-[8px] font-bold text-wb-sunday-text leading-none truncate px-1">
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
  const [holidayNotes, setHolidayNotes] = useState<{ date: Date; note: string }[]>([]);

  const currentMonthHolidays = useMemo(() => {
    const dynamicHolidays = holidayNotes.map(hn => ({
      date: hn.date,
      name: hn.note,
      description: `Holiday on ${format(hn.date, "PPP")}`,
    }));
    
    const staticHolidays = holidays.filter(h => 
      h.date.getFullYear() === month.getFullYear() && 
      h.date.getMonth() === month.getMonth()
    );

    const allDays: { date: Date; name: string }[] = [
      ...staticHolidays,
      ...dynamicHolidays,
    ];

    const sundays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
      .filter(d => d.getDay() === 0);
      
    sundays.forEach(sunday => {
      if (!allDays.some(hd => hd.date.toDateString() === sunday.toDateString())) {
        allDays.push({ date: sunday, name: "Sunday" });
      }
    });

    return allDays
      .filter((holiday, index, self) => 
         index === self.findIndex((t) => t.date.toDateString() === holiday.date.toDateString())
      )
      .sort((a, b) => a.date.getDate() - b.date.getDate());
  }, [month, holidayNotes]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const firstDayOfMonth = startOfMonth(month);
    const lastDayOfMonth = endOfMonth(month);

    const attendanceQuery = query(
        collection(db, "dailyAttendance"),
        where("date", ">=", format(firstDayOfMonth, "yyyy-MM-dd")),
        where("date", "<=", format(lastDayOfMonth, "yyyy-MM-dd"))
    );

    const unsubscribe = onSnapshot(attendanceQuery, (querySnapshot) => {
      const records: Date[] = [];
      const notes: { date: Date; note: string }[] = [];
      
      querySnapshot.forEach((doc) => {
        const log = doc.data() as DailyAttendanceLog;
        const logDate = parseISO(log.date);
        
        // This check is slightly redundant due to the query, but good for safety
        if (isWithinInterval(logDate, { start: firstDayOfMonth, end: lastDayOfMonth })) {
            records.push(logDate);
            if (log.note) {
              notes.push({ date: logDate, note: log.note });
            }
        }
      });
      
      setHolidayNotes(notes);
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
    <div className="w-full flex flex-col items-center">
      <Card className="w-full max-w-4xl shadow-2xl rounded-2xl bg-card/80 backdrop-blur-sm border-primary/20">
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
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-md w-full border-t pt-4">
              <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-[hsl(var(--wb-present-bg))]" />
                  <span>Present</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-[hsl(var(--wb-sunday-bg))]" />
                  <span>Sunday</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-[hsl(var(--wb-holiday-bg))]" />
                  <span>Holiday</span>
              </div>
          </div>
        </CardContent>
      </Card>
      
      {currentMonthHolidays.length > 0 && !isLoading && (
        <Card className="mt-6 w-full max-w-4xl shadow-xl rounded-2xl bg-card/80 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary text-center">Special Days in {format(month, 'MMMM')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                {currentMonthHolidays.map((holiday) => (
                  <div key={holiday.name + holiday.date.toISOString()} className="flex items-center">
                    <Dot className="h-5 w-5 text-muted-foreground mr-1 flex-shrink-0" />
                    <span className="font-medium">{format(holiday.date, 'do:')}</span>
                    <span className="text-muted-foreground ml-2 truncate">{holiday.name}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
