
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
          <section className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <MailOpen className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-semibold text-blue-700 dark:text-blue-300">Leave Applications</h2>
            </div>
            <LeaveManagementTable />
          </section>

          {/* Section 2: Late Arrival / Early Departure */}
          <section className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              <h2 className="text-2xl font-semibold text-amber-700 dark:text-amber-300">Late Arrival / Early Departure</h2>
            </div>
            <LateArrivalManagementTable />
          </section>

          {/* Section 3: Other School Applications */}
          <section className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FileSignature className="h-7 w-7 text-green-600 dark:text-green-400" />
              <h2 className="text-2xl font-semibold text-green-700 dark:text-green-300">Other School Applications</h2>
            </div>
            <OtherApplicationsReviewTable />
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
