
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Send, Clock, Download } from "lucide-react"; // Added Download icon
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LateArrivalApplication, StudentProfile, LateArrivalRequestType } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const lateArrivalSchema = z.object({
  studentName: z.string(),
  grade: z.string(),
  division: z.string(),
  requestDate: z.date({ required_error: "Date of incident is required." }),
  type: z.enum(["Late Arrival", "Early Departure"], { required_error: "Request type is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM (24-hour)."),
  reason: z.string().min(10, "Reason must be at least 10 characters long.").max(500, "Reason must be less than 500 characters."),
});

type LateArrivalFormValues = z.infer<typeof lateArrivalSchema>;

export function LateArrivalForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors }, reset } = useForm<LateArrivalFormValues>({
    resolver: zodResolver(lateArrivalSchema),
    defaultValues: {
      studentName: "",
      grade: "",
      division: "",
      type: "Late Arrival",
      time: "00:00",
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
          setValue("studentName", user.displayName || "N/A");
          setValue("grade", user.grade || "N/A");
          setValue("division", user.division || "N/A");
        }
      }
    };
    fetchStudentProfile();
  }, [user, setValue]);

  const onSubmit: SubmitHandler<LateArrivalFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const applicationData: Omit<LateArrivalApplication, "id" | "applicationTimestamp" | "status"> = {
      studentUid: user.uid,
      studentName: data.studentName,
      grade: data.grade,
      division: data.division,
      requestDate: format(data.requestDate, "yyyy-MM-dd"),
      type: data.type as LateArrivalRequestType,
      time: data.time,
      reason: data.reason,
      status: "Pending",
      applicationTimestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "lateArrivalRequests"), applicationData);
      toast({
        title: "Request Submitted",
        description: "Your late arrival/early departure request has been sent for approval.",
      });
      reset({ 
        studentName: data.studentName, 
        grade: data.grade,
        division: data.division,
        requestDate: undefined,
        type: "Late Arrival",
        time: "00:00",
        reason: ""
      });
    } catch (error: any) {
      console.error("Error submitting late arrival/early departure request:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>Request Form</CardTitle>
        <CardDescription>Please fill out the details for your late arrival or early departure. You can also download a blank PDF form for offline submission if needed.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
            <Button asChild variant="outline">
              <a href="/forms/late_arrival_early_departure_form.pdf" download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download Blank Form (PDF)
              </a>
            </Button>
        </div>

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
              <Label htmlFor="requestDate">Date of Incident *</Label>
              <Controller
                name="requestDate"
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
              {errors.requestDate && <p className="text-sm text-destructive mt-1">{errors.requestDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="type">Request Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4 pt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Late Arrival" id="lateArrival" />
                      <Label htmlFor="lateArrival">Late Arrival</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Early Departure" id="earlyDeparture" />
                      <Label htmlFor="earlyDeparture">Early Departure</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
            </div>
          </div>
          
          <div>
            <Label htmlFor="time">Time (HH:MM, 24-hour format) *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="time" type="time" {...register("time")} className="pl-10" />
            </div>
            {errors.time && <p className="text-sm text-destructive mt-1">{errors.time.message}</p>}
          </div>

          <div>
            <Label htmlFor="reason">Reason (Min 10 characters) *</Label>
            <Textarea id="reason" {...register("reason")} placeholder="Explain the reason..." rows={4} />
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

    