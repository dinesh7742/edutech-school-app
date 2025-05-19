
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, ListChecks } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format, startOfMonth, endOfMonth, getYear, getMonth, setYear, setMonth, subYears } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AttendanceRecord {
  date: string;
  formattedDate: string;
  status: AttendanceStatus;
}

const MINIMUM_ATTENDANCE_THRESHOLD = 75;

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i, // 0-indexed for Date object
  label: format(new Date(0, i), "MMMM"),
}));

const currentFullYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => currentFullYear - i); // Current year and last 4 years

export function StudentAttendanceDetails() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<number>(currentFullYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date())); // 0-indexed

  useEffect(() => {
    if (!user || !user.uid || !user.grade || !user.division) {
      setIsLoading(false);
      setError("User details incomplete for fetching attendance.");
      setAttendanceRecords([]);
      setAttendancePercentage(null);
      return;
    }

    const fetchAttendanceData = async () => {
      setIsLoading(true);
      setError(null);
      setAttendanceRecords([]);
      setAttendancePercentage(null);

      try {
        const firstDayOfMonth = startOfMonth(setYear(setMonth(new Date(), selectedMonth), selectedYear));
        const lastDayOfMonth = endOfMonth(firstDayOfMonth);

        const startDateString = format(firstDayOfMonth, "yyyy-MM-dd");
        const endDateString = format(lastDayOfMonth, "yyyy-MM-dd");

        console.log(`Fetching attendance for ${user.grade}-${user.division} from ${startDateString} to ${endDateString}`);

        const attendanceQuery = query(
          collection(db, "dailyAttendance"),
          where("grade", "==", user.grade),
          where("division", "==", user.division),
          where("date", ">=", startDateString),
          where("date", "<=", endDateString),
          orderBy("date", "desc")
        );

        const querySnapshot = await getDocs(attendanceQuery);
        let presentDays = 0;
        let totalMarkedDays = 0;
        const records: AttendanceRecord[] = [];

        querySnapshot.forEach((doc) => {
          const log = doc.data() as DailyAttendanceLog;
          const studentStatus = log.studentRecords[user.uid!];
          if (studentStatus) {
            totalMarkedDays++;
            if (studentStatus === "Present") {
              presentDays++;
            }
            records.push({
              date: log.date,
              formattedDate: format(new Date(log.date + "T00:00:00"), "PPP"),
              status: studentStatus,
            });
          }
        });
        
        console.log(`Fetched ${records.length} records. Present: ${presentDays}, Total Marked: ${totalMarkedDays}`);
        setAttendanceRecords(records);

        if (totalMarkedDays > 0) {
          setAttendancePercentage(Math.round((presentDays / totalMarkedDays) * 100));
        } else {
          setAttendancePercentage(null);
        }
      } catch (err: any) {
        console.error("Error fetching attendance data:", err);
        setError("Could not load attendance data. " + (err.message || ""));
         if (err.code === 'failed-precondition' && err.message.includes('index')) {
          setError("A Firestore index might be required for querying attendance by date range within grade and division. Please check the console for a link to create it.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user, selectedMonth, selectedYear]);

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
          <ListChecks className="h-8 w-8" /> My Attendance Details
        </CardTitle>
        <CardDescription>
          Grade: {user?.grade}{user?.division}
        </CardDescription>
        <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center">
          <div>
            <Label htmlFor="year-select" className="mb-1 block text-sm font-medium">Year</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger id="year-select" className="w-full sm:w-[120px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="month-select" className="mb-1 block text-sm font-medium">Month</Label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger id="month-select" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Loading attendance...</p>
          </div>
        ) : error ? (
          <Card className="shadow-lg border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {attendancePercentage !== null ? (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Attendance for {format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}: {" "}
                  <span className={`font-bold ${attendancePercentage >= MINIMUM_ATTENDANCE_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                    {attendancePercentage.toFixed(2)}%
                  </span>
                </p>
                <Progress value={attendancePercentage} className="h-3" />
                {attendancePercentage < MINIMUM_ATTENDANCE_THRESHOLD && (
                  <p className="text-sm text-destructive">
                    Your attendance for this month is below the {MINIMUM_ATTENDANCE_THRESHOLD}% minimum.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No attendance marked for your class in {format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}.</p>
            )}

            {attendanceRecords.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.date}>
                        <TableCell>{record.formattedDate}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === "Present"
                                ? "bg-green-100 text-green-700"
                                : record.status === "Absent"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {record.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              !isLoading && attendancePercentage === null && (
                 <p className="text-muted-foreground text-center py-6">No attendance records found for your class in {format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}.</p>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
