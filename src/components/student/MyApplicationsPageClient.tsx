
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, AlertTriangle, Edit, FileText, Award, Shield, Download, FileArchive, FileBadge } from "lucide-react"; // Added FileBadge
import type { OtherApplicationType } from "@/types";

interface ApplicationItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  actionType: "online" | "pdfPageLink";
  link: string;
  buttonText: string;
  dataAiHint: string;
}

const onlineApplications: ApplicationItem[] = [
  {
    id: "leave-application",
    title: "Leave Application",
    description: "Submit an online application for planned leave from school.",
    icon: CalendarPlus,
    actionType: "online",
    link: "/student/apply-leave",
    buttonText: "Apply for Leave",
    dataAiHint: "calendar plus event",
  },
  {
    id: "late-arrival",
    title: "Late Arrival / Early Departure",
    description: "Request permission for arriving late or leaving school early.",
    icon: AlertTriangle,
    actionType: "online",
    link: "/student/late-arrival",
    buttonText: "Submit Request",
    dataAiHint: "alert triangle time",
  },
  {
    id: "progress-report",
    title: "Progress Report Request",
    description: "Request a duplicate or special issuance of your progress report.",
    icon: FileText, 
    actionType: "online",
    link: "/student/other-applications/submit?formType=ProgressReportRequest",
    buttonText: "Apply Online",
    dataAiHint: "report chart progress",
  },
  {
    id: "re-exam",
    title: "Re-exam / Re-test Request",
    description: "Apply to appear for a re-exam or re-test, subject to school policy.",
    icon: Edit, 
    actionType: "online",
    link: "/student/other-applications/submit?formType=ReExamRequest",
    buttonText: "Apply Online",
    dataAiHint: "exam paper test",
  },
  {
    id: "bonafide-certificate",
    title: "Bonafide Certificate Request",
    description: "Apply for a Bonafide Certificate for official purposes.",
    icon: FileBadge, // Using FileBadge icon
    actionType: "online",
    link: "/student/other-applications/submit?formType=BonafideCertificateRequest",
    buttonText: "Apply Online",
    dataAiHint: "certificate document official",
  },
  {
    id: "tc-application",
    title: "Transfer Certificate (TC) Application",
    description: "Apply for a Transfer Certificate if you are shifting to another school.",
    icon: Award,
    actionType: "online",
    link: "/student/other-applications/submit?formType=TCApplication",
    buttonText: "Apply Online",
    dataAiHint: "certificate document transfer",
  },
  {
    id: "duplicate-tc",
    title: "Duplicate TC Request",
    description: "Request a duplicate Transfer Certificate if the original is lost or damaged.",
    icon: Award, 
    actionType: "online",
    link: "/student/other-applications/submit?formType=DuplicateTCRequest",
    buttonText: "Apply Online",
    dataAiHint: "certificate document duplicate",
  },
];

const pdfFormsLink: ApplicationItem = {
    id: "downloadable-forms",
    title: "Downloadable Blank PDF Forms",
    description: "Access a list of various school forms available for manual download and submission (e.g., Medical Leave, Parent Consent).",
    icon: FileArchive,
    actionType: "pdfPageLink",
    link: "/student/school-forms",
    buttonText: "View PDF Forms",
    dataAiHint: "archive document files",
};

export function MyApplicationsPageClient() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4 border-b pb-2">Online Applications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {onlineApplications.map((form) => (
            <Card key={form.id} className="shadow-lg flex flex-col text-center">
              <CardHeader className="pb-3">
                <div className="flex justify-center mb-3">
                  <form.icon className="h-12 w-12 text-primary" data-ai-hint={form.dataAiHint} />
                </div>
                <CardTitle className="text-xl">{form.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow items-center justify-between">
                <CardDescription className="mb-4 text-sm h-16 line-clamp-3">{form.description}</CardDescription>
                <Button asChild className="w-full mt-auto">
                  <Link href={form.link}>
                    {form.actionType === "online" ? <Edit className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                    {form.buttonText}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4 border-b pb-2">Downloadable PDF Forms</h2>
         <Card className="shadow-lg flex flex-col text-center max-w-md mx-auto">
            <CardHeader className="pb-3">
                <div className="flex justify-center mb-3">
                  <pdfFormsLink.icon className="h-12 w-12 text-primary" data-ai-hint={pdfFormsLink.dataAiHint} />
                </div>
                <CardTitle className="text-xl">{pdfFormsLink.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow items-center justify-between">
                <CardDescription className="mb-4 text-sm h-16 line-clamp-3">{pdfFormsLink.description}</CardDescription>
                <Button asChild className="w-full mt-auto">
                  <Link href={pdfFormsLink.link}>
                     <FileArchive className="mr-2 h-4 w-4" />
                    {pdfFormsLink.buttonText}
                  </Link>
                </Button>
              </CardContent>
         </Card>
      </section>
    </div>
  );
}
