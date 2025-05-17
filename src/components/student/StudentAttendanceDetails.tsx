
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, CalendarCheck, ListChecks } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format } from "date-fns";

interface AttendanceRecord {
  date: string;
  formattedDate: string;
  status: AttendanceStatus;
}

const MINIMUM_ATTENDANCE_THRESHOLD = 75;

export function StudentAttendanceDetails() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.uid || !user.grade || !user.division) {
      setIsLoading(false);
      setError("User details incomplete for fetching attendance.");
      return;
    }

    const fetchAttendanceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const attendanceQuery = query(
          collection(db, "dailyAttendance"),
          where("grade", "==", user.grade),
          where("division", "==", user.division),
          orderBy("date", "desc") // Fetch newest first
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
              formattedDate: format(new Date(log.date + "T00:00:00"), "PPP"), // Ensure local timezone parsing
              status: studentStatus,
            });
          }
        });

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
          setError("A Firestore index might be required. Please check the console for a link to create it for 'dailyAttendance' collection, ordering by 'date' within 'grade' and 'division' filters.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading attendance details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
          <ListChecks className="h-8 w-8" /> My Attendance Details
        </CardTitle>
        <CardDescription>
          Grade: {user?.grade} {user?.division}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {attendancePercentage !== null ? (
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Overall Attendance: {" "}
              <span className={`font-bold ${attendancePercentage >= MINIMUM_ATTENDANCE_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                {attendancePercentage.toFixed(2)}%
              </span>
            </p>
            <Progress value={attendancePercentage} className="h-3" />
            {attendancePercentage < MINIMUM_ATTENDANCE_THRESHOLD && (
              <p className="text-sm text-destructive">
                Your attendance is below the {MINIMUM_ATTENDANCE_THRESHOLD}% minimum. Please improve.
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center">No attendance marked for your class yet.</p>
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
                            : "bg-yellow-100 text-yellow-700" // For Late/Excused if added later
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
            <p className="text-muted-foreground text-center py-6">No attendance records found for your class.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}
