
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Phone, MapPin, CalendarDays, User, Award, ShieldCheck, BookUser, Hash, Users, Edit, X, Briefcase, FileText, Loader2, UserCircle, ListChecks } from "lucide-react"; 
import type { StudentProfile, LeaveApplication, DailyAttendanceLog, AttendanceStatus, AppUser } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore"; 
import { MySelfForm } from "@/components/student/MySelfForm"; 
import { format, parseISO, startOfMonth, endOfMonth, getYear, getMonth, setYear, setMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface StudentProfileViewProps {
  studentId: string;
}

const MINIMUM_ATTENDANCE_THRESHOLD = 75;

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i, // 0-indexed for Date object
  label: format(new Date(0, i), "MMMM"),
}));

const currentFullYear = getYear(new Date());
const years = Array.from({ length: 5 }, (_, i) => currentFullYear - i); // Current year and last 4 years


interface AttendanceRecord {
  date: string;
  formattedDate: string;
  status: AttendanceStatus;
}


const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | null }) => {
  const displayValue = (value === undefined || value === null || value.trim() === "" || value.trim().toLowerCase() === "not provided") ? "Not Provided" : value;
  
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`text-foreground ${displayValue === "Not Provided" ? "italic" : ""}`}>{displayValue}</p>
      </div>
    </div>
  );
};

export function StudentProfileView({ studentId }: StudentProfileViewProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); 

  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [loadingLeaveApps, setLoadingLeaveApps] = useState(true);
  const [leaveAppsError, setLeaveAppsError] = useState<string | null>(null);

  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [loadingMonthlyAttendance, setLoadingMonthlyAttendance] = useState(true);
  const [monthlyAttendanceError, setMonthlyAttendanceError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentFullYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));

  const fetchProfileData = useCallback(async () => {
    if (!studentId) {
      setProfileError("No student ID provided.");
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const profileDocRef = doc(db, "studentProfiles", studentId);
      const profileDocSnap = await getDoc(profileDocRef);
      
      if (profileDocSnap.exists()) {
        const fetchedData = profileDocSnap.data();
        setProfile({ uid: profileDocSnap.id, ...fetchedData } as StudentProfile);
      } else {
        // Profile does not exist, fetch from users collection to pre-fill
        const userDocRef = doc(db, "users", studentId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as AppUser;
            const fallbackProfile: StudentProfile = {
                uid: studentId,
                email: userData.email || "",
                firstName: userData.displayName?.split(' ')[0] || "",
                lastName: userData.displayName?.split(' ').slice(1).join(' ') || "",
                grade: userData.grade || "",
                division: userData.division || "",
            };
            setProfile(fallbackProfile);
            // Automatically enter edit mode if the detailed profile is missing
            setIsEditing(true); 
        } else {
            setProfileError("Student record not found in users or profiles.");
            setProfile(null);
        }
      }
    } catch (err: any) {
      console.error("[StudentProfileView] Error fetching student profile for studentId " + studentId + ":", err);
      setProfileError("Failed to load student profile. Please try again later.");
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (profile && !isEditing) { // Only fetch attendance if not in edit mode
      const fetchMonthlyAttendance = async () => {
        setLoadingMonthlyAttendance(true);
        setMonthlyAttendanceError(null);
        setMonthlyAttendance([]);
        setAttendancePercentage(null);

        try {
          const firstDayOfMonth = startOfMonth(setYear(setMonth(new Date(), selectedMonth), selectedYear));
          const lastDayOfMonth = endOfMonth(firstDayOfMonth);

          const startDateString = format(firstDayOfMonth, "yyyy-MM-dd");
          const endDateString = format(lastDayOfMonth, "yyyy-MM-dd");

          const attendanceQuery = query(
            collection(db, "dailyAttendance"),
            where("grade", "==", profile.grade),
            where("division", "==", profile.division),
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
            const studentStatus = log.studentRecords[studentId];
            if (studentStatus) {
              totalMarkedDays++;
              if (studentStatus === "Present") presentDays++;
              records.push({
                date: log.date,
                formattedDate: format(new Date(log.date + "T00:00:00"), "PPP"),
                status: studentStatus,
              });
            }
          });
          
          setMonthlyAttendance(records);

          if (totalMarkedDays > 0) {
            setAttendancePercentage(Math.round((presentDays / totalMarkedDays) * 100));
          }

        } catch (err: any) {
          console.error("Error fetching monthly attendance data:", err);
          setMonthlyAttendanceError("Could not load attendance for this month. " + (err.message || ""));
        } finally {
          setLoadingMonthlyAttendance(false);
        }
      };

      fetchMonthlyAttendance();
    }
  }, [profile, studentId, selectedMonth, selectedYear, isEditing]);

  const fetchLeaveApplications = useCallback(async () => {
    if (!studentId) {
        setLeaveAppsError("Student ID missing for fetching leave applications.");
        setLoadingLeaveApps(false);
        return;
    }
    setLoadingLeaveApps(true);
    setLeaveAppsError(null);
    try {
        const leaveAppsCollectionRef = collection(db, "leaveApplications");
        const q = query(
            leaveAppsCollectionRef,
            where("studentUid", "==", studentId),
            orderBy("applicationDate", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedApps = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            applicationDate: doc.data().applicationDate as Timestamp, 
        })) as LeaveApplication[];
        setLeaveApplications(fetchedApps);
    } catch (err: any) {
        console.error("Error fetching leave applications for student " + studentId + ":", err);
        setLeaveAppsError("Failed to load leave application history. " + (err.message || ""));
         if (err.code === 'failed-precondition' && err.message.includes('index')) {
          setLeaveAppsError("A Firestore index might be required for fetching leave applications. Please check the console for a link to create it.");
        }
    } finally {
        setLoadingLeaveApps(false);
    }
  }, [studentId]);


  useEffect(() => {
    fetchProfileData();
    if (!isEditing) {
        fetchLeaveApplications();
    }
  }, [fetchProfileData, fetchLeaveApplications, isEditing]);

  const handleSaveSuccess = () => {
    setIsEditing(false);
    fetchProfileData(); 
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "??";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not Provided";
    try {
      const date = new Date(dateString + 'T00:00:00'); 
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const formatFirestoreTimestamp = (timestamp?: Timestamp | unknown): string => {
    if (timestamp instanceof Timestamp) {
      return format(timestamp.toDate(), "dd MMM yyyy");
    }
    return "N/A";
  };
  
  const statusBadgeVariant = (status: LeaveApplication['status']) => {
    switch (status) {
      case "Pending": return "default";
      case "Approved": return "accent";
      case "Rejected": return "destructive";
      default: return "outline";
    }
  };


  if (loadingProfile) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader className="items-center text-center pb-6">
           <Skeleton className="h-32 w-32 rounded-full" />
           <Skeleton className="h-8 w-1/2 mt-4" />
           <Skeleton className="h-4 w-1/4 mt-2" />
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }
  
  if (isEditing) {
    return (
      <>
        <MySelfForm 
          studentIdForEdit={studentId} 
          onSaveSuccess={handleSaveSuccess}
          isTeacherEditing={true}
        />
        <div className="max-w-3xl mx-auto mt-4 flex justify-end">
            <Button variant="outline" onClick={() => { setIsEditing(false); fetchProfileData(); }}>
                <X className="mr-2 h-4 w-4" /> Cancel Edit
            </Button>
        </div>
      </>
    );
  }

  if (profileError) { 
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl border-destructive">
        <CardHeader>
          <CardTitle className="text-center text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{profileError}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!profile) { 
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-center">Student Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">The requested student record could not be found.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="w-full max-w-3xl mx-auto shadow-xl overflow-hidden">
        <CardHeader className="items-center text-center pb-6 relative bg-card">
          <div className="absolute top-4 right-4"> 
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>
          <Avatar className="h-32 w-32 border-4 border-background shadow-md">
            <AvatarImage src={profile?.photoUrl || `https://placehold.co/128x128.png?text=${getInitials(profile?.firstName, profile?.lastName)}`} alt={`${profile?.firstName} ${profile?.lastName || ''}`} data-ai-hint="profile avatar"/>
            <AvatarFallback className="text-4xl">{getInitials(profile?.firstName, profile?.lastName)}</AvatarFallback>
          </Avatar>
          <CardTitle className="mt-4 text-3xl font-bold text-primary">
            {profile?.firstName} {profile?.middleName || ''} {profile?.lastName || ''}
          </CardTitle>
          <CardDescription className="text-md">
            Grade: {profile?.grade || "N/A"} {profile?.division || "N/A"}
          </CardDescription>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
              {profile?.email && <Badge variant="outline">{profile.email}</Badge>}
              {profile?.contactNumber && <Badge variant="outline">{profile.contactNumber}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pb-0">
          <DetailItem icon={User} label="Full Name" value={`${profile?.firstName || ""} ${profile?.middleName || ''} ${profile?.lastName || ''}`.trim()} />
          <DetailItem icon={User} label="Mother's Name" value={profile?.motherName || "Not Provided"} />
          <DetailItem icon={Briefcase} label="Father's Occupation" value={profile?.fatherOccupation || "Not Provided"} />
          <DetailItem icon={Briefcase} label="Mother's Occupation" value={profile?.motherOccupation || "Not Provided"} />
          <DetailItem icon={CalendarDays} label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
          <DetailItem icon={Users} label="Gender" value={profile?.gender || "Not Provided"} /> 
          <DetailItem icon={Mail} label="Email" value={profile?.email || "Not Provided"} />
          <DetailItem icon={Phone} label="Contact Number" value={profile?.contactNumber || "Not Provided"} />
          <DetailItem icon={Award} label="Grade & Division" value={profile ? `Grade ${profile.grade} - ${profile.division}` : "N/A"} />
          <DetailItem icon={CalendarDays} label="Religion" value={profile?.religion || "Not Provided"} />
          <DetailItem icon={UserCircle} label="Caste" value={profile?.caste || "Not Provided"} />
          <DetailItem icon={ShieldCheck} label="Aadhar Card Number" value={profile?.aadharCardNumber || "Not Provided"} />
          <DetailItem icon={BookUser} label="PEN Number" value={profile?.penNumber || "Not Provided"} />
          <DetailItem icon={Hash} label="G.R. Number" value={profile?.grNumber || "Not Provided"} />
          <DetailItem icon={MapPin} label="Full Address" value={profile?.fullAddress || "Not Provided"} />
        </CardContent>

        <CardFooter className="flex-col items-start p-6 mt-4 border-t">
          <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Leave Application History
          </h3>
          {loadingLeaveApps ? (
            <div className="flex items-center justify-center w-full py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading leave history...</p>
            </div>
          ) : leaveAppsError ? (
            <p className="text-destructive">{leaveAppsError}</p>
          ) : leaveApplications.length === 0 ? (
            <p className="text-muted-foreground">No leave applications found for this student.</p>
          ) : (
            <div className="w-full overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applied On</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Teacher Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{formatFirestoreTimestamp(app.applicationDate)}</TableCell>
                      <TableCell>{formatDate(app.leaveStartDate)}</TableCell>
                      <TableCell>{formatDate(app.leaveEndDate)}</TableCell>
                      <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.reason}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(app.status)}>{app.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.teacherComments || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardFooter>
      </Card>
      
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <ListChecks className="h-6 w-6" /> Monthly Attendance History
          </CardTitle>
          <CardDescription>Review the student's attendance record for any given month.</CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center">
            <div>
              <Label htmlFor="year-select" className="mb-1 block text-sm font-medium">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger id="year-select" className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="month-select" className="mb-1 block text-sm font-medium">Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger id="month-select" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMonthlyAttendance ? (
            <div className="flex justify-center items-center min-h-[150px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3">Loading attendance...</p>
            </div>
          ) : monthlyAttendanceError ? (
            <p className="text-destructive text-center">{monthlyAttendanceError}</p>
          ) : (
            <>
              {attendancePercentage !== null ? (
                <div className="space-y-2 mb-4">
                  <p className="text-lg font-medium">
                    Attendance for {format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}:{" "}
                    <span className={`font-bold ${attendancePercentage >= MINIMUM_ATTENDANCE_THRESHOLD ? 'text-green-600' : 'text-red-600'}`}>
                      {attendancePercentage.toFixed(2)}%
                    </span>
                  </p>
                  <Progress value={attendancePercentage} className="h-3" />
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No attendance marked for this student in {format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}.</p>
              )}

              {monthlyAttendance.length > 0 && (
                <div className="overflow-x-auto rounded-md border max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyAttendance.map((record) => (
                        <TableRow key={record.date}>
                          <TableCell>{record.formattedDate}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.status === "Present" ? "bg-green-100 text-green-700" : record.status === "Absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {record.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
