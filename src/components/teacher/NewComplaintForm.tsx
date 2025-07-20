
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import type { StudentProfile, Complaint, ComplaintType } from "@/types";
import { complaintTypes } from "@/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Send, MessageSquareWarning } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const subjects = ["First Language", "Second Language", "Third Language", "Math", "EVS", "Art", "Work Exp", "P.E.", "Other"];

const complaintSchema = z.object({
  studentUid: z.string().min(1, "Please select a student."),
  incidentDate: z.date({ required_error: "Date of incident is required." }),
  subject: z.string().min(1, "Please select a subject."),
  complaintTypes: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one complaint type.",
  }),
  otherComplaintType: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000),
  actionTaken: z.string().min(10, "Action taken must be at least 10 characters.").max(500),
}).refine(data => {
    if (data.complaintTypes.includes("Other") && !data.otherComplaintType) {
        return false;
    }
    return true;
}, {
    message: "Please specify the 'Other' complaint type.",
    path: ["otherComplaintType"],
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

export function NewComplaintForm() {
  const { user: teacherUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      complaintTypes: [],
    }
  });

  const watchedComplaintTypes = watch("complaintTypes");

  useEffect(() => {
    if (!teacherUser?.grade || !teacherUser?.division) {
      setLoadingStudents(false);
      return;
    }
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const profilesRef = collection(db, "studentProfiles");
        const q = query(
          profilesRef,
          where("grade", "==", teacherUser.grade),
          where("division", "==", teacherUser.division),
          orderBy("firstName")
        );
        const querySnapshot = await getDocs(q);
        const fetchedStudents = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentProfile));
        setStudents(fetchedStudents);
      } catch (err) {
        console.error("Error fetching students for complaint form:", err);
        toast({ title: "Error", description: "Could not load student list.", variant: "destructive" });
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [teacherUser, toast]);

  const onSubmit: SubmitHandler<ComplaintFormValues> = async (data) => {
    if (!teacherUser) return;
    setIsSubmitting(true);
    
    const selectedStudent = students.find(s => s.uid === data.studentUid);
    if (!selectedStudent) {
        toast({ title: "Error", description: "Selected student not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const complaintData: Omit<Complaint, "id"> = {
        studentUid: data.studentUid,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName || ''}`.trim(),
        grade: selectedStudent.grade,
        division: selectedStudent.division,
        incidentDate: format(data.incidentDate, "yyyy-MM-dd"),
        teacherUid: teacherUser.uid,
        teacherName: teacherUser.displayName || "N/A",
        subject: data.subject,
        complaintTypes: data.complaintTypes as ComplaintType[],
        otherComplaintType: data.complaintTypes.includes("Other") ? data.otherComplaintType : undefined,
        description: data.description,
        actionTaken: data.actionTaken,
        status: "Pending Acknowledgment",
        createdAt: serverTimestamp(),
    };

    try {
        await addDoc(collection(db, "complaints"), complaintData);
        toast({
            title: "Complaint Filed Successfully",
            description: `A record has been created for ${selectedStudent.firstName}.`,
        });
        // Here you would trigger the SMS/Email notification to the parent
        console.log(`SIMULATING NOTIFICATION: Send SMS/Email to parent of ${selectedStudent.firstName} about a new conduct record.`);
        router.push("/teacher/conduct-record");
    } catch (err: any) {
        console.error("Error filing complaint:", err);
        toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
            <MessageSquareWarning className="h-8 w-8" />
            New Student Complaint Form
        </CardTitle>
        <CardDescription>
            File a new conduct record for a student in your class ({teacherUser?.grade}{teacherUser?.division}). This will notify the parent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="studentUid">Select Student *</Label>
              <Controller
                name="studentUid"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingStudents}>
                    <SelectTrigger id="studentUid">
                      <SelectValue placeholder={loadingStudents ? "Loading students..." : "Select a student"} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.uid} value={student.uid}>
                          {student.firstName} {student.lastName || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.studentUid && <p className="text-sm text-destructive mt-1">{errors.studentUid.message}</p>}
            </div>
            <div>
              <Label htmlFor="incidentDate">Date of Incident *</Label>
              <Controller
                name="incidentDate"
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
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date > new Date()} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.incidentDate && <p className="text-sm text-destructive mt-1">{errors.incidentDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="teacherName">Teacher Name</Label>
                <Input id="teacherName" value={teacherUser?.displayName || "N/A"} readOnly disabled className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>}
            </div>
          </div>

          <div>
            <Label>Type of Complaint *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 p-4 border rounded-md">
              {complaintTypes.filter(type => type !== 'Other').map((type) => (
                <div key={type} className="flex items-center space-x-2">
                   <Controller
                      name="complaintTypes"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id={type}
                          checked={field.value?.includes(type)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), type])
                              : field.onChange(field.value?.filter(value => value !== type));
                          }}
                        />
                      )}
                    />
                  <Label htmlFor={type} className="font-normal">{type}</Label>
                </div>
              ))}
               <div className="flex items-center space-x-2">
                   <Controller
                      name="complaintTypes"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="Other"
                          checked={field.value?.includes("Other")}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), "Other"])
                              : field.onChange(field.value?.filter(value => value !== "Other"));
                          }}
                        />
                      )}
                    />
                  <Label htmlFor="Other" className="font-normal">Other</Label>
                </div>
            </div>
            {errors.complaintTypes && <p className="text-sm text-destructive mt-1">{errors.complaintTypes.message}</p>}
          </div>

          {watchedComplaintTypes?.includes("Other") && (
            <div>
              <Label htmlFor="otherComplaintType">Please Specify "Other" Complaint *</Label>
              <Input id="otherComplaintType" {...register("otherComplaintType")} />
              {errors.otherComplaintType && <p className="text-sm text-destructive mt-1">{errors.otherComplaintType.message}</p>}
            </div>
          )}

          <div>
            <Label htmlFor="description">Description of Incident *</Label>
            <Textarea id="description" {...register("description")} rows={4} placeholder="Describe the incident in detail..." />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="actionTaken">Action Taken *</Label>
            <Textarea id="actionTaken" {...register("actionTaken")} rows={3} placeholder="Describe the action taken by you..." />
            {errors.actionTaken && <p className="text-sm text-destructive mt-1">{errors.actionTaken.message}</p>}
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting || loadingStudents}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            File Complaint & Notify Parent
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
