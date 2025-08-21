
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDay, addMonths, subMonths, parseISO, isWithinInterval, eachDayOfInterval, isAfter } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  date: Date;
  status: AttendanceStatus;
  note?: string;
}

const DayOfWeek = ({ day }: { day: string }) => (
  <div className="text-center font-medium text-muted-foreground">{day}</div>
);

const DayCell = ({ day, status }: { day: number; status: 'Present' | 'Absent' | 'holiday' | 'future' | 'empty' }) => {
  const baseClasses = "flex items-center justify-center h-10 w-10 rounded-full text-sm";
  const statusClasses = {
    'Present': 'bg-green-500 text-white',
    'Absent': 'bg-red-500 text-white',
    'holiday': 'bg-red-500 text-white',
    'future': 'text-foreground',
    'empty': '',
  };
  return (
    <div className={cn(baseClasses, statusClasses[status])}>
      {day > 0 && day}
    </div>
  );
};

const StatCard = ({ label, value, colorClass }: { label: string; value: number | string; colorClass: string }) => (
  <div className="flex-1 text-center">
    <p className={cn("text-sm font-semibold", colorClass)}>{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export function StudentAttendanceDetails() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.grade || !user.division) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);

    const attendanceQuery = query(
      collection(db, "dailyAttendance"),
      where("grade", "==", user.grade),
      where("division", "==", user.division),
      where("date", ">=", format(firstDay, 'yyyy-MM-dd')),
      where("date", "<=", format(lastDay, 'yyyy-MM-dd'))
    );
    
    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const newRecords = new Map<string, AttendanceRecord>();
      snapshot.forEach(doc => {
        const data = doc.data() as DailyAttendanceLog;
        const studentStatus = data.studentRecords[user.uid!];
        if (studentStatus) {
            newRecords.set(data.date, {
                date: parseISO(data.date),
                status: studentStatus,
                note: data.note
            });
        } else if (data.note && (data.note.toLowerCase().includes('holiday') || data.note.toLowerCase().includes('sunday'))) {
            newRecords.set(data.date, {
                date: parseISO(data.date),
                status: 'Absent', // Treat as absent for coloring
                note: data.note
            });
        }
      });
      setRecords(newRecords);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching attendance: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentDate]);

  const daysInMonth = getDaysInMonth(currentDate);
  const startDayOfWeek = getDay(startOfMonth(currentDate)); // Sunday is 0, Monday is 1
  const firstDayIndex = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Adjust to have Monday as the first day (index 0)

  const presentDays = Array.from(records.values()).filter(r => r.status === 'Present').length;
  const holidays = Array.from(records.values()).filter(r => r.note?.toLowerCase().includes('holiday') || r.date.getDay() === 0).length;
  const workingDays = daysInMonth - holidays;
  const absentDays = workingDays > 0 ? workingDays - presentDays : 0;
  
  return (
    <Card className="w-full max-w-md shadow-2xl rounded-2xl overflow-hidden bg-background">
      <div className="bg-cyan-500 text-white p-4 text-center relative">
        <h2 className="text-xl font-bold">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-background" style={{ borderTopLeftRadius: '100%', borderTopRightRadius: '100%' }}></div>
      </div>

      <div className="p-4">
        {loading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <DayOfWeek key={i} day={d} />)}
            {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dateKey = format(date, 'yyyy-MM-dd');
              const record = records.get(dateKey);
              
              let status: 'Present' | 'Absent' | 'holiday' | 'future' | 'empty' = 'future';
              
              if (record) {
                if (record.note?.toLowerCase().includes('holiday') || date.getDay() === 0) {
                  status = 'holiday';
                } else if (record.status) {
                  status = record.status as 'Present' | 'Absent';
                }
              } else if (isAfter(date, new Date())) {
                 status = 'future';
              } else if (date.getDay() === 0) { // Mark sundays even if no record
                 status = 'holiday';
              }


              return <DayCell key={day} day={day} status={status} />;
            })}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <Card className="p-4 bg-muted/50">
          <div className="flex justify-around">
            <StatCard label="HOLIDAY" value={holidays} colorClass="text-gray-500" />
            <div className="border-l mx-2"></div>
            <StatCard label="WORKING DAY" value={workingDays} colorClass="text-orange-500" />
          </div>
        </Card>
        <Card className="p-4 bg-muted/50">
          <div className="flex justify-around">
            <StatCard label="PRESENT" value={presentDays} colorClass="text-green-500" />
            <div className="border-l mx-2"></div>
            <StatCard label="ABSENT" value={absentDays} colorClass="text-red-500" />
          </div>
        </Card>
      </div>

      <div className="p-4 flex justify-between">
        <Button onClick={() => setCurrentDate(c => subMonths(c, 1))} className="bg-red-500 hover:bg-red-600 rounded-full px-6 text-white">
             Previous
        </Button>
        <Button onClick={() => setCurrentDate(c => addMonths(c, 1))} className="bg-cyan-600 hover:bg-cyan-700 rounded-full px-6 text-white">
            Next Month
        </Button>
      </div>
    </Card>
  );
}
