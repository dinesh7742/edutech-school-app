
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, CheckCircle, Loader2, Users, XCircle, Search, MessageSquare, Send } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { StudentProfile, DailyAttendanceLog, AttendanceStatus } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

type FormValues = {
  [studentUid: string]: AttendanceStatus;
};

interface AbsentStudentInfo {
  uid: string;
  name: string;
  contactNumber?: string;
}

export function MarkAttendanceForm() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [absentStudentsForSms, setAbsentStudentsForSms] = useState<AbsentStudentInfo[]>([]);

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {},
  });

  const fetchStudents = useCallback(async () => {
    if (!teacherUser?.grade || !teacherUser?.division) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const profilesCollectionRef = collection(db, "studentProfiles");
      const q = query(
        profilesCollectionRef,
        where("grade", "==", teacherUser.grade),
        where("division", "==", teacherUser.division),
        // Consider ordering if needed, e.g., by firstName
      );
      const querySnapshot = await getDocs(q);
      const fetchedStudents = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentProfile));
      setStudents(fetchedStudents);
      setFilteredStudents(fetchedStudents);

      const initialFormValues: FormValues = {};
      fetchedStudents.forEach(student => {
        initialFormValues[student.uid] = "Present";
      });
      reset(initialFormValues);

    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({ title: "Error", description: "Could not fetch student list. " + error.message, variant: "destructive" });
    } finally {
      setLoadingStudents(false);
    }
  }, [teacherUser, toast, reset]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = students.filter(student => {
      const fullName = `${student.firstName?.toLowerCase() || ''} ${student.lastName?.toLowerCase() || ''}`;
      return fullName.includes(lowercasedFilter);
    });
    setFilteredStudents(filteredData);
  }, [searchTerm, students]);


  const fetchAttendanceForDate = useCallback(async (date: Date) => {
    setAbsentStudentsForSms([]); // Clear SMS list when date changes
    if (!teacherUser?.grade || !teacherUser?.division) return;
    setLoadingAttendance(true);
    const formattedDate = format(date, "yyyy-MM-dd");
    const attendanceDocId = `${formattedDate}_${teacherUser.grade}_${teacherUser.division}`;
    
    try {
      const attendanceDocRef = doc(db, "dailyAttendance", attendanceDocId);
      const attendanceDocSnap = await getDoc(attendanceDocRef);

      const newFormValues: FormValues = {};
      students.forEach(student => {
         newFormValues[student.uid] = "Present";
      });

      if (attendanceDocSnap.exists()) {
        const data = attendanceDocSnap.data() as DailyAttendanceLog;
        for (const studentUid in data.studentRecords) {
          if (Object.prototype.hasOwnProperty.call(data.studentRecords, studentUid)) {
             if (newFormValues.hasOwnProperty(studentUid)) {
                newFormValues[studentUid] = data.studentRecords[studentUid];
             }
          }
        }
        toast({ title: "Info", description: `Loaded existing attendance for ${formattedDate}.` });
      } else {
         toast({ title: "Info", description: `No prior attendance found for ${formattedDate}. Defaulting all to Present.` });
      }
      reset(newFormValues);
    } catch (error: any) {
      console.error("Error fetching attendance:", error);
      toast({ title: "Error", description: "Could not fetch existing attendance. " + error.message, variant: "destructive" });
      const defaultValues: FormValues = {};
      students.forEach(student => { defaultValues[student.uid] = "Present"; });
      reset(defaultValues);
    } finally {
      setLoadingAttendance(false);
    }
  }, [teacherUser, toast, reset, students]);


  useEffect(() => {
    if (selectedDate && students.length > 0) {
      fetchAttendanceForDate(selectedDate);
    } else if (students.length > 0) {
      const initialFormValues: FormValues = {};
      students.forEach(student => {
        initialFormValues[student.uid] = "Present";
      });
      reset(initialFormValues);
    }
  }, [selectedDate, students, fetchAttendanceForDate, reset]);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!selectedDate || !teacherUser?.grade || !teacherUser?.division || !teacherUser.uid || !teacherUser.displayName) {
      toast({ title: "Error", description: "Missing required information (date, teacher details).", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    setAbsentStudentsForSms([]); // Reset on new submission
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const attendanceDocId = `${formattedDate}_${teacherUser.grade}_${teacherUser.division}`;
    
    const attendanceData: DailyAttendanceLog = {
      date: formattedDate,
      grade: teacherUser.grade,
      division: teacherUser.division,
      studentRecords: data,
      markedByTeacherId: teacherUser.uid,
      markedByTeacherName: teacherUser.displayName,
      lastUpdatedAt: serverTimestamp(),
    };

    try {
      const attendanceDocRef = doc(db, "dailyAttendance", attendanceDocId);
      await setDoc(attendanceDocRef, attendanceData, { merge: true });
      toast({ title: "Success", description: `Attendance for ${formattedDate} saved successfully.` });

      // --- Prepare list for WhatsApp buttons ---
      const studentMap = new Map(students.map(s => [s.uid, s]));
      const absentees: AbsentStudentInfo[] = [];

      for (const studentUid in data) {
        if (data[studentUid] === "Absent") {
          const student = studentMap.get(studentUid);
          if (student) {
            absentees.push({
                uid: student.uid,
                name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
                contactNumber: student.contactNumber,
            });
          }
        }
      }
      setAbsentStudentsForSms(absentees);
      if (absentees.length > 0) {
        toast({
          title: "Action Required",
          description: "Please send WhatsApp notifications to the parents of absent students below.",
          duration: 7000,
        });
      }
      // --- End WhatsApp preparation ---

    } catch (error: any) {
      console.error("Error saving attendance:", error);
      toast({ title: "Error", description: "Could not save attendance. " + error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const generateWhatsAppLink = (contactNumber: string, studentName: string) => {
    if (!selectedDate || !teacherUser) return "#";

    // Clean the number: remove '+' and spaces
    let cleanNumber = contactNumber.replace(/\+/g, '').replace(/\s/g, '');
    // Ensure it starts with 91 if it's a 10-digit Indian number
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }

    const formattedDate = format(selectedDate, "PPP");
    const teacherName = teacherUser.displayName || "The Class Teacher";
    const grade = teacherUser.grade || "N/A";
    const division = teacherUser.division || "N/A";
    
    const message = `Dear Parent, this is to inform you that your child, ${studentName} of Grade ${grade}-${division}, was absent from school today, ${formattedDate}.\n\nRegards,\n${teacherName}\nPM SHRI MPS Varsha Nagar.`;
    
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Mark Attendance</CardTitle>
        <CardDescription>
          Select a date and mark attendance for Grade {teacherUser?.grade}{teacherUser?.division}.
          Default status is 'Present'.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
              <Label htmlFor="attendanceDate">Attendance Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="attendanceDate"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-grow">
              <Label htmlFor="searchStudent">Search Student</Label>
               <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchStudent"
                  placeholder="Type student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>


          {loadingStudents || loadingAttendance ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <span>{loadingStudents ? "Loading students..." : "Loading attendance..."}</span>
            </div>
          ) : students.length === 0 ? (
             <p className="text-muted-foreground text-center py-4">
                No students found for Grade {teacherUser?.grade}{teacherUser?.division}. Please ensure student profiles exist for this class.
             </p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <Card key={student.uid} className="p-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`attendance-${student.uid}`} className="text-base font-medium">
                        {student.firstName} {student.lastName || ""}
                      </Label>
                      <Controller
                        name={`${student.uid}`}
                        control={control}
                        defaultValue="Present"
                        render={({ field }) => (
                          <RadioGroup
                            onValueChange={(value) => {
                                field.onChange(value);
                                setAbsentStudentsForSms([]); // Reset SMS list on change
                            }}
                            value={field.value}
                            className="flex space-x-4"
                            id={`attendance-${student.uid}`}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Present" id={`${student.uid}-present`} />
                              <Label htmlFor={`${student.uid}-present`} className="text-green-600 font-medium flex items-center">
                                <CheckCircle className="mr-1 h-5 w-5"/> Present
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Absent" id={`${student.uid}-absent`} />
                              <Label htmlFor={`${student.uid}-absent`} className="text-red-600 font-medium flex items-center">
                                <XCircle className="mr-1 h-5 w-5"/> Absent
                              </Label>
                            </div>
                          </RadioGroup>
                        )}
                      />
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No student found matching "{searchTerm}".</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || loadingStudents || loadingAttendance || students.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Attendance & Prepare Notifications
          </Button>
        </form>

        {absentStudentsForSms.length > 0 && (
            <div className="mt-8 pt-6 border-t">
                <h3 className="text-xl font-semibold text-destructive flex items-center gap-2">
                    <MessageSquare className="h-6 w-6"/>
                    Absentee Notifications
                </h3>
                <p className="text-muted-foreground mt-1">Click to send a pre-filled WhatsApp message to the parent of each absent student.</p>
                <div className="mt-4 space-y-3">
                    {absentStudentsForSms.map(student => (
                        <div key={student.uid} className="p-3 border rounded-md flex justify-between items-center">
                            <span className="font-medium">{student.name}</span>
                            {student.contactNumber ? (
                                <Button asChild size="sm">
                                    <a href={generateWhatsAppLink(student.contactNumber, student.name)} target="_blank" rel="noopener noreferrer">
                                        <Send className="mr-2 h-4 w-4" />
                                        Send WhatsApp
                                    </a>
                                </Button>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">No contact number</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
}

    

    
