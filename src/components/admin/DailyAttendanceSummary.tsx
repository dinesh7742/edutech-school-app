
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import type { StudentProfile, DailyAttendanceLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, CalendarCheck2 } from "lucide-react";

interface ClassStats {
  grade: string;
  division: string;
  onRoll: { boys: number; girls: number; total: number };
  present: { boys: number; girls: number; total: number };
  absent: { boys: number; girls: number; total: number };
}

export function DailyAttendanceSummary() {
  const [summaryData, setSummaryData] = useState<ClassStats[]>([]);
  const [totals, setTotals] = useState({ present: 0, absent: 0, onRoll: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Get all student profiles
        const studentProfilesRef = collection(db, "studentProfiles");
        const studentProfilesSnapshot = await getDocs(studentProfilesRef);
        const allStudents = studentProfilesSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentProfile));

        // 2. Get today's attendance logs
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const attendanceQuery = query(collection(db, "dailyAttendance"), where("date", "==", todayStr));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const todaysLogs = attendanceSnapshot.docs.map(doc => doc.data() as DailyAttendanceLog);
        
        const attendanceMap = new Map<string, Record<string, 'Present' | 'Absent'>>();
        todaysLogs.forEach(log => {
            attendanceMap.set(`${log.grade}-${log.division}`, log.studentRecords);
        });

        // 3. Process data
        const classMap = new Map<string, { students: StudentProfile[] }>();
        allStudents.forEach(student => {
          const key = `${student.grade}-${student.division}`;
          if (!classMap.has(key)) {
            classMap.set(key, { students: [] });
          }
          classMap.get(key)!.students.push(student);
        });

        const stats: ClassStats[] = [];
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalOnRoll = allStudents.length;

        const sortedKeys = Array.from(classMap.keys()).sort();

        for (const key of sortedKeys) {
          const [grade, division] = key.split('-');
          const { students } = classMap.get(key)!;
          const todaysAttendance = attendanceMap.get(key) || {};

          const onRoll = {
            boys: students.filter(s => s.gender === "Male").length,
            girls: students.filter(s => s.gender !== "Male").length,
            total: students.length,
          };
          
          let presentBoys = 0;
          let presentGirls = 0;

          students.forEach(student => {
            if (todaysAttendance[student.uid] === "Present") {
                if(student.gender === "Male") presentBoys++;
                else presentGirls++;
            }
          });

          const present = {
            boys: presentBoys,
            girls: presentGirls,
            total: presentBoys + presentGirls,
          }
          
          const absent = {
              boys: onRoll.boys - present.boys,
              girls: onRoll.girls - present.girls,
              total: onRoll.total - present.total
          };

          totalPresent += present.total;
          totalAbsent += absent.total;

          stats.push({ grade, division, onRoll, present, absent });
        }

        setSummaryData(stats);
        setTotals({ present: totalPresent, absent: totalAbsent, onRoll: totalOnRoll });

      } catch (error) {
        console.error("Error fetching attendance summary data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const presentPercentage = totals.onRoll > 0 ? (totals.present / totals.onRoll) * 100 : 0;
  const absentPercentage = totals.onRoll > 0 ? (totals.absent / totals.onRoll) * 100 : 0;

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-100/50 dark:bg-blue-900/20">
        <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <CalendarCheck2 /> Daily Attendance Summary
              </CardTitle>
              <CardDescription>
                Overview of student attendance for today, {format(new Date(), "PPP")}
              </CardDescription>
            </div>
            <div className="text-right">
                <p className="font-semibold text-primary">Present: {presentPercentage.toFixed(1)}%</p>
                <Progress value={presentPercentage} className="w-32 h-2 mt-1" />
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead rowSpan={2} className="text-center border-r align-middle">Grade</TableHead>
                  <TableHead rowSpan={2} className="text-center border-r align-middle">Div</TableHead>
                  <TableHead colSpan={3} className="text-center border-r">On Roll</TableHead>
                  <TableHead colSpan={3} className="text-center border-r bg-green-100/60 dark:bg-green-900/30">Today's Present</TableHead>
                  <TableHead colSpan={3} className="text-center bg-red-100/60 dark:bg-red-900/30">Today's Absentees</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-center border-r">Boys</TableHead>
                  <TableHead className="text-center border-r">Girls</TableHead>
                  <TableHead className="text-center border-r font-bold">Total</TableHead>
                  <TableHead className="text-center border-r bg-green-100/60 dark:bg-green-900/30">Boys</TableHead>
                  <TableHead className="text-center border-r bg-green-100/60 dark:bg-green-900/30">Girls</TableHead>
                  <TableHead className="text-center border-r font-bold bg-green-100/60 dark:bg-green-900/30">Total</TableHead>
                  <TableHead className="text-center bg-red-100/60 dark:bg-red-900/30">Boys</TableHead>
                  <TableHead className="text-center bg-red-100/60 dark:bg-red-900/30">Girls</TableHead>
                  <TableHead className="text-center font-bold bg-red-100/60 dark:bg-red-900/30">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map(row => (
                  <TableRow key={`${row.grade}-${row.division}`}>
                    <TableCell className="text-center border-r">{row.grade}</TableCell>
                    <TableCell className="text-center border-r">{row.division}</TableCell>
                    <TableCell className="text-center border-r">{row.onRoll.boys}</TableCell>
                    <TableCell className="text-center border-r">{row.onRoll.girls}</TableCell>
                    <TableCell className="text-center border-r font-bold">{row.onRoll.total}</TableCell>
                    <TableCell className="text-center border-r">{row.present.boys}</TableCell>
                    <TableCell className="text-center border-r">{row.present.girls}</TableCell>
                    <TableCell className="text-center border-r font-bold">{row.present.total}</TableCell>
                    <TableCell className="text-center">{row.absent.boys}</TableCell>
                    <TableCell className="text-center">{row.absent.girls}</TableCell>
                    <TableCell className="text-center font-bold">{row.absent.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 bg-muted/50 border-t flex justify-around font-bold text-sm">
                <p>Total Today's Presentee = <span className="text-green-600">{totals.present}</span></p>
                <p>Total Today's Absentees = <span className="text-red-600">{totals.absent}</span></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
