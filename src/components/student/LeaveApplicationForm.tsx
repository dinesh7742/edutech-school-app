
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Send } from "lucide-react";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeaveApplication, StudentProfile } from "@/types";
import { format, isBefore, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const leaveApplicationSchema = z.object({
  studentName: z.string(),
  grade: z.string(),
  division: z.string(),
  leaveStartDate: z.date({ required_error: "Leave start date is required." }),
  leaveEndDate: z.date({ required_error: "Leave end date is required." }),
  reason: z.string().min(10, "Reason must be at least 10 characters long.").max(500, "Reason must be less than 500 characters."),
}).refine(data => !isBefore(data.leaveEndDate, data.leaveStartDate), {
  message: "End date cannot be before start date.",
  path: ["leaveEndDate"], // Path to the field to which the error will be attached
});

type LeaveApplicationFormValues = z.infer<typeof leaveApplicationSchema>;

export function LeaveApplicationForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors }, reset } = useForm<LeaveApplicationFormValues>({
    resolver: zodResolver(leaveApplicationSchema),
    defaultValues: {
      studentName: "",
      grade: "",
      division: "",
      reason: "",
    }
  });

  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (user?.uid) {
        const profileDocRef = doc(db, "studentProfiles", user.uid);
        const profileDoc = await getDoc(profileDocRef);
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as StudentProfile;
          setStudentProfile(profileData);
          setValue("studentName", `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || user.displayName || "N/A");
          setValue("grade", profileData.grade || user.grade || "N/A");
          setValue("division", profileData.division || user.division || "N/A");
        } else {
           // Fallback to user context if profile doesn't exist
          setValue("studentName", user.displayName || "N/A");
          setValue("grade", user.grade || "N/A");
          setValue("division", user.division || "N/A");
        }
      }
    };
    fetchStudentProfile();
  }, [user, setValue]);


  const onSubmit: SubmitHandler<LeaveApplicationFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to apply for leave.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const applicationData: Omit<LeaveApplication, "id" | "applicationDate" | "status"> = {
      studentUid: user.uid,
      studentName: data.studentName,
      grade: data.grade,
      division: data.division,
      leaveStartDate: format(data.leaveStartDate, "yyyy-MM-dd"),
      leaveEndDate: format(data.leaveEndDate, "yyyy-MM-dd"),
      reason: data.reason,
      status: "Pending",
      applicationDate: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "leaveApplications"), applicationData);
      toast({
        title: "Leave Application Submitted",
        description: "Your leave request has been sent for approval.",
      });
      reset({ // Reset form fields after submission
        studentName: data.studentName, // Keep pre-filled data
        grade: data.grade,
        division: data.division,
        leaveStartDate: undefined,
        leaveEndDate: undefined,
        reason: ""
      });
    } catch (error: any) {
      console.error("Error submitting leave application:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your leave application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const watchedStartDate = watch("leaveStartDate");

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>Leave Application Form</CardTitle>
        <CardDescription>Please fill out the details below to apply for leave.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="studentName">Student Name</Label>
              <Input id="studentName" {...register("studentName")} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Input id="grade" {...register("grade")} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="division">Division</Label>
              <Input id="division" {...register("division")} readOnly className="bg-muted/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leaveStartDate">Leave Start Date *</Label>
              <Controller
                name="leaveStartDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.leaveStartDate && <p className="text-sm text-destructive mt-1">{errors.leaveStartDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="leaveEndDate">Leave End Date *</Label>
               <Controller
                name="leaveEndDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar 
                        mode="single" 
                        selected={field.value} 
                        onSelect={field.onChange} 
                        initialFocus 
                        disabled={(date) => watchedStartDate ? isBefore(date, watchedStartDate) : false}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.leaveEndDate && <p className="text-sm text-destructive mt-1">{errors.leaveEndDate.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Leave (Min 10 characters) *</Label>
            <Textarea id="reason" {...register("reason")} placeholder="Explain the reason for your leave request..." rows={4} />
            {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send for Approval
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
