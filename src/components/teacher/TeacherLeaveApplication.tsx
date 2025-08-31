
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Send } from "lucide-react";
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeaveApplication, TeacherLeaveBalance, LeaveType } from "@/types";
import { leaveTypes } from "@/types";
import { format, isBefore, getYear } from "date-fns";
import { cn } from "@/lib/utils";

const TOTAL_PRIVILEGED_LEAVES = 15;

const leaveApplicationSchema = z.object({
  leaveType: z.enum(leaveTypes, { required_error: "Leave type is required." }),
  leaveStartDate: z.date({ required_error: "Start date is required." }),
  leaveEndDate: z.date({ required_error: "End date is required." }),
  reason: z.string().min(10, "Reason must be at least 10 characters.").max(500),
}).refine(data => !isBefore(data.leaveEndDate, data.leaveStartDate), {
  message: "End date cannot be before start date.",
  path: ["leaveEndDate"],
});

type LeaveApplicationFormValues = z.infer<typeof leaveApplicationSchema>;

export function TeacherLeaveApplication() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<TeacherLeaveBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<LeaveApplicationFormValues>({
    resolver: zodResolver(leaveApplicationSchema),
  });

  const fetchLeaveBalance = useCallback(async () => {
    if (!teacherUser) return;
    setLoadingBalance(true);
    const currentYear = getYear(new Date());
    const balanceDocId = `${currentYear}_${teacherUser.uid}`;
    const balanceDocRef = doc(db, "teacherLeaveBalances", balanceDocId);

    try {
        const docSnap = await getDoc(balanceDocRef);
        if (docSnap.exists()) {
            setLeaveBalance(docSnap.data() as TeacherLeaveBalance);
        } else {
            // If no record exists, create a default one for the view
            setLeaveBalance({
                id: balanceDocId,
                teacherUid: teacherUser.uid,
                year: currentYear,
                privilegedLeave: { total: TOTAL_PRIVILEGED_LEAVES, used: 0 },
                casualLeave: { used: 0 },
                lastUpdated: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error fetching leave balance:", error);
        toast({ title: "Error", description: "Could not fetch leave balance.", variant: "destructive" });
    } finally {
        setLoadingBalance(false);
    }
  }, [teacherUser, toast]);

  useEffect(() => {
    fetchLeaveBalance();
  }, [fetchLeaveBalance]);

  const onSubmit: SubmitHandler<LeaveApplicationFormValues> = async (data) => {
    if (!teacherUser) return;
    setIsSubmitting(true);

    const applicationData: Omit<LeaveApplication, "id" | "applicationDate" | "status"> = {
      studentUid: teacherUser.uid,
      studentName: teacherUser.displayName || "N/A",
      grade: teacherUser.grade || "N/A",
      division: teacherUser.division || "N/A",
      leaveType: data.leaveType,
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
        description: "Your request has been sent for approval.",
      });
      reset();
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedStartDate = watch("leaveStartDate");

  return (
    <Card className="w-full shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle>Apply for Leave</CardTitle>
        <CardDescription>Submit your leave request here.</CardDescription>
      </CardHeader>
      <CardContent>
         <div className="mb-6 p-4 rounded-lg bg-muted border">
            <h4 className="font-semibold text-center mb-3">Leave Balance ({getYear(new Date())})</h4>
            {loadingBalance ? <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
                 <div className="flex justify-around text-center">
                    <div>
                        <p className="text-2xl font-bold">{leaveBalance?.privilegedLeave.used || 0} / {TOTAL_PRIVILEGED_LEAVES}</p>
                        <p className="text-xs text-muted-foreground">Privileged Leave (PL) Used</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold">{leaveBalance?.casualLeave.used || 0}</p>
                        <p className="text-xs text-muted-foreground">Casual Leave (CL) Used</p>
                    </div>
                </div>
            )}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Controller
                name="leaveType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="leaveType"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.leaveType && <p className="text-sm text-destructive mt-1">{errors.leaveType.message}</p>}
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
                <Textarea id="reason" {...register("reason")} placeholder="Please provide a reason for your leave..." rows={3} />
                {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
            </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Application
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
