
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import type { TeacherLeaveApplication, TeacherLeaveType, TeacherLeaveBalance } from "@/types";
import { teacherLeaveTypes } from "@/types";
import { format, isBefore, getYear } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, Send, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

const leaveSchema = z.object({
  leaveType: z.enum(teacherLeaveTypes, { required_error: "Please select a leave type." }),
  fromDate: z.date({ required_error: "Start date is required." }),
  toDate: z.date({ required_error: "End date is required." }),
  reason: z.string().min(10, "Reason must be at least 10 characters.").max(500),
}).refine(data => !isBefore(data.toDate, data.fromDate), {
  message: "End date cannot be before start date.",
  path: ["toDate"],
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

export function TeacherLeaveForm() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<TeacherLeaveBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (!teacherUser) return;
    setLoadingBalance(true);
    const currentYear = getYear(new Date());
    const balanceDocId = `${teacherUser.uid}_${currentYear}`;
    const balanceDocRef = doc(db, "teacherLeaveBalances", balanceDocId);

    const fetchOrCreateBalance = async () => {
      try {
        const docSnap = await getDoc(balanceDocRef);
        if (docSnap.exists()) {
          setLeaveBalance(docSnap.data() as TeacherLeaveBalance);
        } else {
          const newBalance: TeacherLeaveBalance = {
            uid: teacherUser.uid,
            year: currentYear,
            totalCL: 15,
            usedCL: 0,
          };
          await setDoc(balanceDocRef, newBalance);
          setLeaveBalance(newBalance);
        }
      } catch (error) {
        console.error("Error fetching or creating leave balance:", error);
        toast({ title: "Error", description: "Could not load leave balance.", variant: "destructive" });
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchOrCreateBalance();
  }, [teacherUser, toast]);

  const onSubmit: SubmitHandler<LeaveFormValues> = async (data) => {
    if (!teacherUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const applicationData: Omit<TeacherLeaveApplication, "id"> = {
      teacherId: teacherUser.uid,
      teacherName: teacherUser.displayName || "Teacher",
      leaveType: data.leaveType,
      fromDate: format(data.fromDate, "yyyy-MM-dd"),
      toDate: format(data.toDate, "yyyy-MM-dd"),
      reason: data.reason,
      status: "Pending",
      appliedBy: "Teacher",
      appliedByUid: teacherUser.uid,
      timestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "teacherLeaves"), applicationData);
      toast({
        title: "Leave Application Submitted",
        description: "Your request has been sent to the admin for approval.",
      });
      form.reset();
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingCL = leaveBalance ? leaveBalance.totalCL - leaveBalance.usedCL : 0;

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
          <Hourglass /> Leave Application
        </CardTitle>
        <CardDescription>Submit your leave request for admin approval.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 rounded-lg bg-muted border border-muted-foreground/20 text-center">
            <p className="text-sm font-semibold text-muted-foreground">Casual Leave (CL) Balance</p>
            {loadingBalance ? <Loader2 className="h-5 w-5 animate-spin mx-auto mt-1" /> : (
                <p className="text-2xl font-bold text-primary">{remainingCL} / {leaveBalance?.totalCL || 15}</p>
            )}
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <Textarea id="reason" {...form.register("reason")} placeholder="Please state the reason for your leave..." />
            {form.formState.errors.reason && <p className="text-sm text-destructive mt-1">{form.formState.errors.reason.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
