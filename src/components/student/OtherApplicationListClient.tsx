
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Edit, FileText, LifeBuoy, Activity, Award, Shield } from "lucide-react"; // Added more icons
import type { OtherApplicationType } from "@/types";

interface ApplicationListItem {
  id: string;
  formType: OtherApplicationType | "MedicalLeave" | "ParentConsent"; // Include PDF-only types
  title: string;
  description: string;
  actionType: "online" | "pdf";
  pdfUrl?: string; // For PDF downloads
  onlineUrl?: string; // For online submissions
  icon: React.ElementType;
  dataAiHint: string;
}

const applicationForms: ApplicationListItem[] = [
  {
    id: "medical-leave",
    formType: "MedicalLeave",
    title: "Medical Leave Application",
    description: "Download the form to apply for medical leave. Requires doctor's certificate.",
    actionType: "pdf",
    pdfUrl: "/forms/medical_leave_form.pdf", // You need to create this PDF
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
    pdfUrl: "/forms/progress_report_request_form.pdf", // Blank form download
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
    pdfUrl: "/forms/re_exam_request_form.pdf", // Blank form download
    icon: FileText,
    dataAiHint: "exam paper test",
  },
  {
    id: "parent-consent",
    formType: "ParentConsent",
    title: "Parent Consent for School Trips",
    description: "Download the parental consent form for school excursions or field visits.",
    actionType: "pdf",
    pdfUrl: "/forms/parent_consent_trip_form.pdf", // You need to create this PDF
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
    pdfUrl: "/forms/transfer_certificate_application_form.pdf", // Blank form download
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
    pdfUrl: "/forms/duplicate_tc_request_form.pdf", // Blank form download
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
            {form.pdfUrl && (
              <Button asChild variant="outline" className="w-full">
                <a href={form.pdfUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download Blank PDF
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
