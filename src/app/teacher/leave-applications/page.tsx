
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
        Manage and process various applications submitted by students. Select a category below to view and take action on the requests.
      </CardDescription>

      <div className="space-y-10">
        {/* Leave Applications Card */}
        <Card className="shadow-xl bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary flex items-center gap-2">
              <MailOpen className="h-6 w-6" />
              Leave Applications
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Review and process student requests for leave.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveManagementTable />
          </CardContent>
        </Card>

        {/* Late Arrival / Early Departure Card */}
        <Card className="shadow-xl bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/50">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Late Arrival / Early Departure
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-400">
              Manage student requests for late arrivals or early departures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LateArrivalManagementTable />
          </CardContent>
        </Card>

        {/* Other School Applications Card */}
        <Card className="shadow-xl bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/50">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
              <FileSignature className="h-6 w-6" />
              Other School Applications
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              Review other miscellaneous applications like TC, report requests, etc.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OtherApplicationsReviewTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
