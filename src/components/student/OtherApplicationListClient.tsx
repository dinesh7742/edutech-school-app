
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, FileText, LifeBuoy, Activity, Award, Shield } from "lucide-react"; // Removed Download icon
import type { OtherApplicationType } from "@/types";

interface ApplicationListItem {
  id: string;
  formType: OtherApplicationType | "MedicalLeave" | "ParentConsent"; // Include PDF-only types
  title: string;
  description: string;
  actionType: "online" | "pdf_only_placeholder"; // Renamed for clarity, or could be just 'online'
  pdfUrl?: string; // Kept for internal reference if needed, but button removed
  onlineUrl?: string; // For online submissions
  icon: React.ElementType;
  dataAiHint: string;
}

const applicationForms: ApplicationListItem[] = [
  {
    id: "medical-leave",
    formType: "MedicalLeave",
    title: "Medical Leave Application",
    description: "This form is typically submitted directly to the school office with a doctor's certificate.",
    actionType: "pdf_only_placeholder", // No online submission or direct download button from here
    pdfUrl: "/forms/medical_leave_form.pdf", 
    icon: LifeBuoy,
    dataAiHint: "medical cross health",
  },
  {
    id: "progress-report",
    formType: "ProgressReportRequest",
    title: "Progress Report Request",
    description: "Request a duplicate or special issuance of your progress report.",
    actionType: "online",
    onlineUrl: "/student/other-applications/submit?formType=ProgressReportRequest",
    icon: Activity,
    dataAiHint: "report chart progress",
  },
  {
    id: "re-exam",
    formType: "ReExamRequest",
    title: "Re-exam / Re-test Request",
    description: "Apply to appear for a re-exam or re-test, subject to school policy.",
    actionType: "online",
    onlineUrl: "/student/other-applications/submit?formType=ReExamRequest",
    icon: FileText,
    dataAiHint: "exam paper test",
  },
  {
    id: "parent-consent",
    formType: "ParentConsent",
    title: "Parent Consent for School Trips",
    description: "This form is typically provided by the school for specific events and submitted directly.",
    actionType: "pdf_only_placeholder", // No online submission or direct download button from here
    pdfUrl: "/forms/parent_consent_trip_form.pdf", 
    icon: Shield,
    dataAiHint: "family consent form",
  },
  {
    id: "tc-application",
    formType: "TCApplication",
    title: "Transfer Certificate (TC) Application",
    description: "Apply for a Transfer Certificate if you are shifting to another school.",
    actionType: "online",
    onlineUrl: "/student/other-applications/submit?formType=TCApplication",
    icon: Award,
    dataAiHint: "certificate document transfer",
  },
  {
    id: "duplicate-tc",
    formType: "DuplicateTCRequest",
    title: "Duplicate TC Request",
    description: "Request a duplicate Transfer Certificate if the original is lost or damaged.",
    actionType: "online",
    onlineUrl: "/student/other-applications/submit?formType=DuplicateTCRequest",
    icon: Award,
    dataAiHint: "certificate document duplicate",
  },
];

export function OtherApplicationListClient() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {applicationForms.map((form) => (
        <Card key={form.id} className="shadow-lg flex flex-col">
          <CardHeader>
            <div className="flex items-start gap-3 mb-2">
              <form.icon className="h-8 w-8 text-primary flex-shrink-0 mt-1" data-ai-hint={form.dataAiHint} />
              <CardTitle className="text-xl">{form.title}</CardTitle>
            </div>
            <CardDescription>{form.description}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-2">
            {form.actionType === "online" && form.onlineUrl && (
              <Button asChild className="w-full">
                <Link href={form.onlineUrl}>
                  <Edit className="mr-2 h-4 w-4" /> Apply Online
                </Link>
              </Button>
            )}
            {form.actionType === "pdf_only_placeholder" && (
               <p className="text-sm text-muted-foreground text-center py-2">Please contact the school office for this form.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
