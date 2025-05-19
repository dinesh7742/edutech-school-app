
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailOpen, AlertTriangle, FileSignature, ArrowRight } from "lucide-react";

interface SubmissionType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  buttonText: string;
  dataAiHint: string;
}

const submissionTypes: SubmissionType[] = [
  {
    id: "leave-applications",
    title: "Leave Applications",
    description: "Review and process student requests for leave from school.",
    icon: MailOpen,
    link: "/teacher/leave-applications",
    buttonText: "Review Leave Apps",
    dataAiHint: "mail letter envelope",
  },
  {
    id: "late-arrival-requests",
    title: "Late Arrival / Early Departure",
    description: "Manage requests for students arriving late or needing to depart early.",
    icon: AlertTriangle,
    link: "/teacher/late-arrival-requests",
    buttonText: "Review Late/Early Apps",
    dataAiHint: "alert triangle time",
  },
  {
    id: "other-applications",
    title: "Other School Applications",
    description: "Review various other student applications like TC, re-exam requests, etc.",
    icon: FileSignature,
    link: "/teacher/other-applications-review",
    buttonText: "Review Other Apps",
    dataAiHint: "document signature form",
  },
];

export function ManageSubmissionsClient() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {submissionTypes.map((submission) => (
        <Card key={submission.id} className="shadow-lg flex flex-col text-center">
          <CardHeader className="pb-3">
            <div className="flex justify-center mb-3">
              <submission.icon className="h-12 w-12 text-primary" data-ai-hint={submission.dataAiHint} />
            </div>
            <CardTitle className="text-xl">{submission.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow items-center justify-between">
            <CardDescription className="mb-4 text-sm h-16 line-clamp-3">{submission.description}</CardDescription>
            <Button asChild className="w-full mt-auto">
              <Link href={submission.link}>
                {submission.buttonText} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

    