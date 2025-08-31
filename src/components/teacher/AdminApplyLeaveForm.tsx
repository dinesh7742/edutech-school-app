
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Send } from "lucide-react";
import { collection, addDoc, serverTimestamp, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeaveApplication, LeaveType, AppUser } from "@/types";
import { leaveTypes } from "@/types";
import { format, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

const applyLeaveSchema = z.object({
  teacherUid: z.string().min(1, "Please select a teacher."),
  leaveType: z.enum(leaveTypes, { required_error: "Leave type is required." }),
  leaveStartDate: z.date({ required_error: "Start date is required." }),
  leaveEndDate: z.date({ required_error: "End date is required." }),
  reason: z.string().min(10, "Reason must be at least 10 characters.").max(500),
}).refine(data => !isBefore(data.leaveEndDate, data.leaveStartDate), {
  message: "End date cannot be before start date.",
  path: ["leaveEndDate"],
});

type ApplyLeaveFormValues = z.infer<typeof applyLeaveSchema>;

interface AdminApplyLeaveFormProps {
  onSuccess: () => void;
}

export function AdminApplyLeaveForm({ onSuccess }: AdminApplyLeaveFormProps) {
  const { user: adminUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ApplyLeaveFormValues>({
    resolver: zodResolver(applyLeaveSchema),
  });
  
  useEffect(() => {
    const fetchTeachers = async () => {
        setLoadingTeachers(true);
        try {
            const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
            const querySnapshot = await getDocs(teachersQuery);
            const teacherList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
            setTeachers(teacherList);
        } catch (error) {
            console.error("Error fetching teachers: ", error);
            toast({ title: "Error", description: "Could not fetch teacher list.", variant: "destructive" });
        } finally {
            setLoadingTeachers(false);
        }
    };
    fetchTeachers();
  }, [toast]);

  const onSubmit: SubmitHandler<ApplyLeaveFormValues> = async (data) => {
    if (!adminUser) return;
    setIsSubmitting(true);

    const selectedTeacher = teachers.find(t => t.uid === data.teacherUid);
    if (!selectedTeacher) {
        toast({ title: "Error", description: "Selected teacher not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const applicationData: Omit<LeaveApplication, "id" | "applicationDate" | "status"> = {
      studentUid: data.teacherUid,
      studentName: selectedTeacher.displayName || "N/A",
      grade: selectedTeacher.grade || "N/A",
      division: selectedTeacher.division || "N/A",
      leaveType: data.leaveType,
      leaveStartDate: format(data.leaveStartDate, "yyyy-MM-dd"),
      leaveEndDate: format(data.leaveEndDate, "yyyy-MM-dd"),
      reason: data.reason,
      status: "Approved", // Admin-applied leaves are auto-approved
      applicationDate: serverTimestamp(),
      reviewedByTeacherId: adminUser.uid,
      reviewedByTeacherName: adminUser.displayName,
      reviewTimestamp: serverTimestamp(),
      teacherComments: "Applied by Admin.",
    };

    try {
      await addDoc(collection(db, "leaveApplications"), applicationData);
      toast({
        title: "Leave Applied Successfully",
        description: `Leave has been recorded for ${selectedTeacher.displayName}.`,
      });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedStartDate = watch("leaveStartDate");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="teacherUid">Select Teacher *</Label>
          <Controller
            name="teacherUid"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingTeachers}>
                <SelectTrigger id="teacherUid">
                  <SelectValue placeholder={loadingTeachers ? "Loading teachers..." : "Select a teacher"} />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.uid} value={teacher.uid}>
                      {teacher.displayName} ({teacher.grade}-{teacher.division})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.teacherUid && <p className="text-sm text-destructive mt-1">{errors.teacherUid.message}</p>}
        </div>
        <div>
          <Label htmlFor="leaveType">Leave Type *</Label>
          <Controller
            name="leaveType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.leaveType && <p className="text-sm text-destructive mt-1">{errors.leaveType.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="leaveStartDate">Start Date *</Label>
          <Controller
            name="leaveStartDate"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
              </Popover>
            )}
          />
          {errors.leaveStartDate && <p className="text-sm text-destructive mt-1">{errors.leaveStartDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="leaveEndDate">End Date *</Label>
          <Controller
            name="leaveEndDate"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => watchedStartDate ? isBefore(date, watchedStartDate) : false} />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.leaveEndDate && <p className="text-sm text-destructive mt-1">{errors.leaveEndDate.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="reason">Reason *</Label>
        <Textarea id="reason" {...register("reason")} placeholder="Reason for applying leave on behalf of the teacher..." rows={3} />
        {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting || loadingTeachers}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Submit Leave
      </Button>
    </form>
  );
}
