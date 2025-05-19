
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Download } from "lucide-react";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OtherStudentApplication, StudentProfile, OtherApplicationType } from "@/types";
import { useRouter } from "next/navigation";

const applicationSchema = z.object({
  studentName: z.string(),
  grade: z.string(),
  division: z.string(),
  reasonOrDetails: z.string().min(10, "Details must be at least 10 characters long.").max(1000, "Details must be less than 1000 characters."),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

interface OtherApplicationFormProps {
  formType: OtherApplicationType;
  formTitle: string;
}

const blankFormPdfUrls: Partial<Record<OtherApplicationType, string>> = {
    ProgressReportRequest: "/forms/progress_report_request_form.pdf",
    ReExamRequest: "/forms/re_exam_request_form.pdf",
    TCApplication: "/forms/transfer_certificate_application_form.pdf",
    DuplicateTCRequest: "/forms/duplicate_tc_request_form.pdf",
};


export function OtherApplicationForm({ formType, formTitle }: OtherApplicationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      studentName: "",
      grade: "",
      division: "",
      reasonOrDetails: "",
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

  const onSubmit: SubmitHandler<ApplicationFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const applicationData: Omit<OtherStudentApplication, "id" | "applicationTimestamp" | "status"> = {
      studentUid: user.uid,
      studentName: data.studentName,
      grade: data.grade,
      division: data.division,
      formType: formType,
      reasonOrDetails: data.reasonOrDetails,
      status: "Pending",
      applicationTimestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "otherStudentApplications"), applicationData);
      toast({
        title: "Application Submitted",
        description: `Your "${formTitle}" has been sent for approval.`,
      });
      reset({
        studentName: data.studentName,
        grade: data.grade,
        division: data.division,
        reasonOrDetails: ""
      });
      // Optional: Redirect back to the list page or dashboard
      router.push("/student/other-applications"); 
    } catch (error: any) {
      console.error(`Error submitting ${formTitle}:`, error);
      toast({
        title: "Submission Failed",
        description: error.message || `Could not submit your "${formTitle}". Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const blankPdfUrl = blankFormPdfUrls[formType];

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{formTitle}</CardTitle>
        <CardDescription>Please fill out the details below for your application.</CardDescription>
      </CardHeader>
      <CardContent>
        {blankPdfUrl && (
          <div className="mb-6">
            <Button asChild variant="outline">
              <a href={blankPdfUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download Blank Form (PDF)
              </a>
            </Button>
          </div>
        )}
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

          <div>
            <Label htmlFor="reasonOrDetails">Reason / Details *</Label>
            <Textarea id="reasonOrDetails" {...register("reasonOrDetails")} placeholder="Provide all necessary details for your request..." rows={5} />
            {errors.reasonOrDetails && <p className="text-sm text-destructive mt-1">{errors.reasonOrDetails.message}</p>}
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
