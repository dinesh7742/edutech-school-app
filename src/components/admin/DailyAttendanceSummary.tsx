
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth, setYear, setMonth } from "date-fns";
import type { StudentProfile, DailyAttendanceLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, CalendarCheck2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "../ui/label";


interface ClassStats {
  grade: string;
  division: string;
  onRoll: { boys: number; girls: number; total: number };
  present: { boys: number; girls: number; total: number };
  absent: { boys: number; girls: number; total: number };
}

interface MonthlyChartData {
    name: string; // e.g., "Day 1"
    present: number;
    absent: number;
}

const currentFullYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => currentFullYear - i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), "MMMM"),
}));

export function DailyAttendanceSummary() {
  const [summaryData, setSummaryData] = useState<ClassStats[]>([]);
  const [totals, setTotals] = useState({ present: 0, absent: 0, onRoll: 0 });
  const [loading, setLoading] = useState(true);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartData[]>([]);

  const [selectedYear, setSelectedYear] = useState<number>(currentFullYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const studentProfilesRef = collection(db, "studentProfiles");
        const studentProfilesSnapshot = await getDocs(studentProfilesRef);
        const allStudents = studentProfilesSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentProfile));
        const totalOnRoll = allStudents.length;

        const firstDayOfMonth = startOfMonth(setYear(setMonth(new Date(), selectedMonth), selectedYear));
        const lastDayOfMonth = endOfMonth(firstDayOfMonth);
        
        const attendanceQuery = query(collection(db, "dailyAttendance"), 
          where("date", ">=", format(firstDayOfMonth, "yyyy-MM-dd")),
          where("date", "<=", format(lastDayOfMonth, "yyyy-MM-dd"))
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        // Processing for Monthly Chart
        const dailyTotals = new Map<string, { present: number; absent: number }>();
        const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
        
        daysInMonth.forEach(day => {
          if (day.getDay() !== 0) { // Exclude Sundays
             dailyTotals.set(format(day, 'yyyy-MM-dd'), { present: 0, absent: 0 });
          }
        });

        attendanceSnapshot.forEach(doc => {
            const log = doc.data() as DailyAttendanceLog;
            const dayKey = log.date;
            let presentCount = 0;
            let absentCount = 0;
            Object.values(log.studentRecords).forEach(status => {
                if (status === 'Present') presentCount++;
                else absentCount++;
            });
            if(dailyTotals.has(dayKey)) {
              dailyTotals.set(dayKey, { present: presentCount, absent: totalOnRoll - presentCount });
            }
        });
        
        const chartData: MonthlyChartData[] = [];
        dailyTotals.forEach((value, key) => {
            chartData.push({ name: format(new Date(key + 'T00:00:00'), 'd'), present: value.present, absent: value.absent });
        });
        chartData.sort((a, b) => parseInt(a.name) - parseInt(b.name));
        setMonthlyChartData(chartData);


        // Processing for Today's Summary Table
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const todaysLogs = attendanceSnapshot.docs
            .map(doc => doc.data() as DailyAttendanceLog)
            .filter(log => log.date === todayStr);

        const attendanceMap = new Map<string, Record<string, 'Present' | 'Absent'>>();
        todaysLogs.forEach(log => {
            attendanceMap.set(`${log.grade}-${log.division}`, log.studentRecords);
        });

        const classMap = new Map<string, { students: StudentProfile[] }>();
        allStudents.forEach(student => {
          const key = `${student.grade}-${student.division}`;
          if (!classMap.has(key)) classMap.set(key, { students: [] });
          classMap.get(key)!.students.push(student);
        });

        const stats: ClassStats[] = [];
        let totalPresent = 0;
        let totalAbsent = 0;
        
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
          
          let presentBoys = 0, presentGirls = 0;
          students.forEach(student => {
            if (todaysAttendance[student.uid] === "Present") {
                if(student.gender === "Male") presentBoys++;
                else presentGirls++;
            }
          });

          const present = { boys: presentBoys, girls: presentGirls, total: presentBoys + presentGirls };
          const absent = { boys: onRoll.boys - present.boys, girls: onRoll.girls - present.girls, total: onRoll.total - present.total };
          
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
  }, [selectedMonth, selectedYear]);

  const presentPercentage = totals.onRoll > 0 ? (totals.present / totals.onRoll) * 100 : 0;
  const absentPercentage = totals.onRoll > 0 ? (totals.absent / totals.onRoll) * 100 : 0;

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-blue-100/50 dark:bg-blue-900/20">
        <div className="flex justify-between items-center flex-wrap gap-4">
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
      <CardContent className="p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
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
          <div className="pt-6 border-t">
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
                <h4 className="text-lg font-semibold text-primary">Monthly Attendance Graph</h4>
                <div className="flex gap-2">
                     <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#22c55e" name="Present" />
                    <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                </BarChart>
            </ResponsiveContainer>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
