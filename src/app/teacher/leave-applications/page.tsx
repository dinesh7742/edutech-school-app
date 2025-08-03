

"use client"; 

import { LeaveManagementTable } from "@/components/teacher/LeaveManagementTable";
import { LateArrivalManagementTable } from "@/components/teacher/LateArrivalManagementTable";
import { OtherApplicationsReviewTable } from "@/components/teacher/OtherApplicationsReviewTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MailOpen, AlertTriangle, FileSignature, ClipboardCheck } from "lucide-react";

export default function AllSubmissionsReviewPage() {
  return (
    <div className="py-4 space-y-8">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Review Student Submissions</h1>
      </div>
      <CardDescription>
        Manage and process various applications submitted by students. Review each category below.
      </CardDescription>

      <Card className="shadow-xl">
        <CardContent className="space-y-10 p-4 md:p-6">
          {/* Section 1: Leave Applications */}
          <section className="p-4 rounded-lg bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <MailOpen className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Leave Applications</h2>
            </div>
            <LeaveManagementTable />
          </section>

          {/* Section 2: Late Arrival / Early Departure */}
          <section className="p-4 rounded-lg bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Late Arrival / Early Departure</h2>
            </div>
            <LateArrivalManagementTable />
          </section>

          {/* Section 3: Other School Applications */}
          <section className="p-4 rounded-lg bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FileSignature className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Other School Applications</h2>
            </div>
            <OtherApplicationsReviewTable />
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
