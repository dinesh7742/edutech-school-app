
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, runTransaction, getDoc } from "firebase/firestore";
import type { TeacherLeaveApplication, AppUser, TeacherLeaveType, TeacherLeaveBalance } from "@/types";
import { teacherLeaveTypes } from "@/types";
import { format, isBefore, differenceInCalendarDays, parseISO, getYear } from "date-fns";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const applyLeaveSchema = z.object({
  teacherId: z.string().min(1, "Please select a teacher."),
  leaveType: z.enum(teacherLeaveTypes, { required_error: "Please select a leave type." }),
  fromDate: z.date({ required_error: "Start date is required." }),
  toDate: z.date({ required_error: "End date is required." }),
  reason: z.string().min(10, "Reason must be at least 10 characters.").max(500),
  adminComments: z.string().optional(),
}).refine(data => !isBefore(data.toDate, data.fromDate), {
  message: "End date cannot be before start date.",
  path: ["toDate"],
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

  const form = useForm<ApplyLeaveFormValues>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "teacher"));
        const querySnapshot = await getDocs(q);
        const fetchedTeachers = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
        setTeachers(fetchedTeachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        toast({ title: "Error", description: "Could not load teacher list.", variant: "destructive" });
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, [toast]);

  const onSubmit: SubmitHandler<ApplyLeaveFormValues> = async (data) => {
    if (!adminUser) {
      toast({ title: "Error", description: "You must be logged in as an admin.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const selectedTeacher = teachers.find(t => t.uid === data.teacherId);
    if (!selectedTeacher) {
      toast({ title: "Error", description: "Selected teacher not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const applicationData: Omit<TeacherLeaveApplication, "id"> = {
      teacherId: data.teacherId,
      teacherName: selectedTeacher.displayName || "N/A",
      leaveType: data.leaveType,
      fromDate: format(data.fromDate, "yyyy-MM-dd"),
      toDate: format(data.toDate, "yyyy-MM-dd"),
      reason: data.reason,
      status: "Approved", // Admin-applied leaves are auto-approved
      appliedBy: "Admin",
      appliedByUid: adminUser.uid,
      timestamp: serverTimestamp(),
      reviewTimestamp: serverTimestamp(),
      reviewedByUid: adminUser.uid,
      adminComments: data.adminComments || "Applied by Admin",
    };

    try {
        await runTransaction(db, async (transaction) => {
            const newLeaveRef = doc(collection(db, "teacherLeaves"));
            transaction.set(newLeaveRef, applicationData);

            if (applicationData.leaveType === "CL") {
                const leaveDuration = differenceInCalendarDays(data.toDate, data.fromDate) + 1;
                const leaveYear = getYear(data.fromDate);
                const balanceDocId = `${data.teacherId}_${leaveYear}`;
                const balanceDocRef = doc(db, "teacherLeaveBalances", balanceDocId);

                const balanceDoc = await transaction.get(balanceDocRef);
                if (balanceDoc.exists()) {
                    const currentBalance = balanceDoc.data() as TeacherLeaveBalance;
                    transaction.update(balanceDocRef, { usedCL: currentBalance.usedCL + leaveDuration });
                } else {
                    const newBalance: TeacherLeaveBalance = { uid: data.teacherId, year: leaveYear, totalCL: 15, usedCL: leaveDuration };
                    transaction.set(balanceDocRef, newBalance);
                }
            }
        });
      
      toast({ title: "Leave Applied Successfully", description: `Leave has been recorded for ${selectedTeacher.displayName}.`});
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error applying leave on behalf:", error);
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div>
            <Label htmlFor="teacherId">Select Teacher *</Label>
            <Controller
                name="teacherId"
                control={form.control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingTeachers}>
                        <SelectTrigger><SelectValue placeholder={loadingTeachers ? "Loading..." : "Select a teacher"} /></SelectTrigger>
                        <SelectContent>
                            {teachers.map(teacher => <SelectItem key={teacher.uid} value={teacher.uid}>{teacher.displayName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            />
            {form.formState.errors.teacherId && <p className="text-sm text-destructive mt-1">{form.formState.errors.teacherId.message}</p>}
        </div>

        <div>
            <Label htmlFor="leaveType">Leave Type *</Label>
            <Controller
              name="leaveType"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a leave type" /></SelectTrigger>
                  <SelectContent>
                    {teacherLeaveTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.leaveType && <p className="text-sm text-destructive mt-1">{form.formState.errors.leaveType.message}</p>}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fromDate">From Date *</Label>
          <Controller
            name="fromDate"
            control={form.control}
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
          {form.formState.errors.fromDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.fromDate.message}</p>}
        </div>
        <div>
          <Label htmlFor="toDate">To Date *</Label>
          <Controller
            name="toDate"
            control={form.control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => form.getValues("fromDate") ? isBefore(date, form.getValues("fromDate")) : false} initialFocus /></PopoverContent>
              </Popover>
            )}
          />
          {form.formState.errors.toDate && <p className="text-sm text-destructive mt-1">{form.formState.errors.toDate.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="reason">Reason *</Label>
        <Textarea id="reason" {...form.register("reason")} placeholder="Reason for leave..." />
        {form.formState.errors.reason && <p className="text-sm text-destructive mt-1">{form.formState.errors.reason.message}</p>}
      </div>
      <div>
        <Label htmlFor="adminComments">Admin Comments (Optional)</Label>
        <Textarea id="adminComments" {...form.register("adminComments")} placeholder="Add any comments here..." />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting || loadingTeachers}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Apply Leave
      </Button>
    </form>
  );
}
