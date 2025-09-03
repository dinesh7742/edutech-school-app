"use client"; 

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MailOpen, AlertTriangle, FileSignature, ClipboardCheck, UserCheck, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import { useAuth } from "@/context/AuthContext";

const LeaveManagementTable = dynamic(
  () => import('@/components/teacher/LeaveManagementTable').then(mod => mod.LeaveManagementTable),
  { loading: () => <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> }
);
const LateArrivalManagementTable = dynamic(
  () => import('@/components/teacher/LateArrivalManagementTable').then(mod => mod.LateArrivalManagementTable),
  { loading: () => <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> }
);
const OtherApplicationsReviewTable = dynamic(
  () => import('@/components/teacher/OtherApplicationsReviewTable').then(mod => mod.OtherApplicationsReviewTable),
  { loading: () => <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> }
);
const TeacherLeaveManagementTable = dynamic(
  () => import('@/components/teacher/TeacherLeaveManagementTable').then(mod => mod.TeacherLeaveManagementTable),
  { loading: () => <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> }
);


export default function AllSubmissionsReviewPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <div className="py-4 space-y-8">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Review Submissions</h1>
      </div>
      <CardDescription>
        Manage and process various applications submitted by students and staff. Review each category below.
      </CardDescription>

      <Tabs defaultValue={isAdmin ? "teacher-leave" : "student-leave"} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {isAdmin && (
            <TabsTrigger value="teacher-leave">
              <UserCheck className="mr-2 h-4 w-4" /> Teacher Leave
            </TabsTrigger>
          )}
          <TabsTrigger value="student-leave">
            <MailOpen className="mr-2 h-4 w-4" /> Student Leave
          </TabsTrigger>
          <TabsTrigger value="late-arrival">
            <AlertTriangle className="mr-2 h-4 w-4" /> Late Arrivals
          </TabsTrigger>
          <TabsTrigger value="other">
            <FileSignature className="mr-2 h-4 w-4" /> Other Requests
          </TabsTrigger>
        </TabsList>
        
        {isAdmin && (
          <TabsContent value="teacher-leave">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>Teacher Leave Applications</CardTitle>
                <CardDescription>Review and process leave requests from teachers.</CardDescription>
              </CardHeader>
              <CardContent>
                <TeacherLeaveManagementTable />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="student-leave">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Student Leave Applications</CardTitle>
              <CardDescription>Review and process leave requests from students.</CardDescription>
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
