
"use client";

import type { SchoolForm } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const availableForms: SchoolForm[] = [
  {
    id: "late-arrival",
    title: "Late Arrival / Early Departure Form",
    description: "Form to request permission for late arrival to or early departure from school.",
    pdfUrl: "/forms/late_arrival_early_departure_form.pdf",
    dataAiHint: "form document",
  },
  {
    id: "progress-report-request",
    title: "Progress Report Request Form",
    description: "Use this form to request a duplicate or special issuance of a progress report.",
    pdfUrl: "/forms/progress_report_request_form.pdf",
    dataAiHint: "report card",
  },
  {
    id: "re-exam-request",
    title: "Re-exam / Re-test Request Form",
    description: "Application for appearing in a re-exam or re-test, subject to school policy.",
    pdfUrl: "/forms/re_exam_request_form.pdf",
    dataAiHint: "exam paper",
  },
  {
    id: "parent-consent-trip",
    title: "Parent Consent Form for School Trips",
    description: "Parental consent form required for students participating in school excursions or field visits.",
    pdfUrl: "/forms/parent_consent_trip_form.pdf",
    dataAiHint: "consent document",
  },
  {
    id: "tc-application",
    title: "Transfer Certificate (TC) Application",
    description: "Application form to request a Transfer Certificate when shifting to another school.",
    pdfUrl: "/forms/transfer_certificate_application_form.pdf",
    dataAiHint: "certificate document",
  },
  {
    id: "duplicate-tc-request",
    title: "Duplicate TC Request Form",
    description: "Form to request a duplicate Transfer Certificate in case the original is lost or damaged.",
    pdfUrl: "/forms/duplicate_tc_request_form.pdf",
    dataAiHint: "certificate document",
  },
];

export function SchoolFormsList() {
  const { toast } = useToast();

  const handleDownload = (url: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download Started", description: `Downloading ${fileName}...` });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Could not start the file download. Please try opening the file in a new tab if possible.",
        variant: "destructive"
      });
      try {
        window.open(url, '_blank');
      } catch (e) {
        console.error("Fallback window.open failed:", e);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {availableForms.map((form) => (
        <Card key={form.id} className="shadow-lg flex flex-col">
          <CardHeader>
            <div className="flex items-start gap-3 mb-2">
                <FileText className="h-8 w-8 text-primary flex-shrink-0 mt-1" data-ai-hint={form.dataAiHint} />
                <CardTitle className="text-xl">{form.title}</CardTitle>
            </div>
            <CardDescription>{form.description}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button
              className="w-full"
              onClick={() => handleDownload(form.pdfUrl, `${form.id}_form.pdf`)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
