

"use client"; 

import { LeaveManagementTable } from "@/components/teacher/LeaveManagementTable";
import { LateArrivalManagementTable } from "@/components/teacher/LateArrivalManagementTable";
import { OtherApplicationsReviewTable } from "@/components/teacher/OtherApplicationsReviewTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MailOpen, AlertTriangle, FileSignature, ClipboardCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AllSubmissionsReviewPage() {
  return (
    <div className="py-4 space-y-8">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Review Submissions</h1>
      </div>
      <CardDescription>
        Manage and process various applications submitted by students and staff. Review each category below.
      </CardDescription>

      <Tabs defaultValue="leave" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leave">
            <MailOpen className="mr-2 h-4 w-4" /> Leave Applications
          </TabsTrigger>
          <TabsTrigger value="late-arrival">
            <AlertTriangle className="mr-2 h-4 w-4" /> Late Arrivals
          </TabsTrigger>
          <TabsTrigger value="other">
            <FileSignature className="mr-2 h-4 w-4" /> Other Requests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="leave">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Leave Applications</CardTitle>
              <CardDescription>Review and process leave requests from students and staff.</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveManagementTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="late-arrival">
           <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Late Arrival / Early Departure Requests</CardTitle>
              <CardDescription>Manage student requests for arriving late or leaving early.</CardDescription>
            </CardHeader>
            <CardContent>
              <LateArrivalManagementTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="other">
           <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Other School Applications</CardTitle>
              <CardDescription>Process miscellaneous applications like Bonafide Certificates, TC requests, etc.</CardDescription>
            </CardHeader>
            <CardContent>
              <OtherApplicationsReviewTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
