
"use client"; // Make this a client component to manage Tabs

import { LeaveManagementTable } from "@/components/teacher/LeaveManagementTable";
import { LateArrivalManagementTable } from "@/components/teacher/LateArrivalManagementTable";
import { OtherApplicationsReviewTable } from "@/components/teacher/OtherApplicationsReviewTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MailOpen, AlertTriangle, FileSignature } from "lucide-react";

export default function AllSubmissionsReviewPage() {
  return (
    <div className="py-4 space-y-6">
      <div className="flex items-center gap-3">
        {/* General icon can be used here if needed, or keep it clean */}
        <h1 className="text-3xl font-bold text-primary">Review Student Submissions</h1>
      </div>
      <Tabs defaultValue="leave-applications" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="leave-applications" className="flex items-center gap-2">
            <MailOpen className="h-5 w-5" /> Leave Applications
          </TabsTrigger>
          <TabsTrigger value="late-arrival-requests" className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Late Arrival / Early Departure
          </TabsTrigger>
          <TabsTrigger value="other-applications" className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> Other Applications
          </TabsTrigger>
        </TabsList>
        <TabsContent value="leave-applications">
          <LeaveManagementTable />
        </TabsContent>
        <TabsContent value="late-arrival-requests">
          <LateArrivalManagementTable />
        </TabsContent>
        <TabsContent value="other-applications">
          <OtherApplicationsReviewTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
