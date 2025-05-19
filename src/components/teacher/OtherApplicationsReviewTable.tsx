
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, MessageSquare, Filter, FileSignature } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, Timestamp, DocumentData, QueryConstraint } from "firebase/firestore";
import type { OtherStudentApplication, RequestStatus, OtherApplicationType } from "@/types";
import { otherApplicationTypeLabels } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OtherApplicationsReviewTable() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<OtherStudentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "All">("Pending");
  const [filterFormType, setFilterFormType] = useState<OtherApplicationType | "All">("All");

  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [currentAppForComment, setCurrentAppForComment] = useState<OtherStudentApplication | null>(null);
  const [comment, setComment] = useState("");
  const [actionToConfirm, setActionToConfirm] = useState<"Approved" | "Rejected" | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!teacherUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const appsCollectionRef = collection(db, "otherStudentApplications");
        const queryConstraints: QueryConstraint[] = [];

        if (filterStatus !== "All") {
          queryConstraints.push(where("status", "==", filterStatus));
        }
        if (filterFormType !== "All") {
          queryConstraints.push(where("formType", "==", filterFormType));
        }
        queryConstraints.push(orderBy("applicationTimestamp", "desc"));
        
        const q = query(appsCollectionRef, ...queryConstraints);
        
        const querySnapshot = await getDocs(q);
        const fetchedApps = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            applicationTimestamp: data.applicationTimestamp as Timestamp,
          } as OtherStudentApplication;
        });
        
        setApplications(fetchedApps);
      } catch (err: any) {
        console.error("Error fetching other applications:", err);
        setError("Failed to load applications. " + (err.message || ""));
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
            toast({
              title: "Database Index Required",
              description: "Please create the required Firestore index. Check the console for a link.",
              variant: "destructive",
              duration: 10000
            });
            console.error("Firestore index required. The console error message from Firebase should contain a direct link to create it. Collection: 'otherStudentApplications'. Fields and order will depend on your active filters (e.g., status ASC, formType ASC, applicationTimestamp DESC).")
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [teacherUser, filterStatus, filterFormType, toast]);

  const handleUpdateStatus = async (appId: string, newStatus: RequestStatus, teacherComment?: string) => {
    if (!teacherUser || !appId) {
      toast({ title: "Error", description: "User or application ID missing.", variant: "destructive" });
      return;
    }
    try {
      const appDocRef = doc(db, "otherStudentApplications", appId);
      await updateDoc(appDocRef, {
        status: newStatus,
        reviewedByTeacherId: teacherUser.uid,
        reviewedByTeacherName: teacherUser.displayName || teacherUser.email,
        reviewTimestamp: serverTimestamp(),
        teacherComments: teacherComment || null,
      });
      toast({ title: "Success", description: `Application ${newStatus.toLowerCase()}.` });
      setApplications(prevApps => prevApps.map(app => app.id === appId ? { ...app, status: newStatus, teacherComments: teacherComment } : app));
    } catch (error: any) {
      console.error("Error updating application status:", error);
      toast({ title: "Error", description: "Could not update application status. " + error.message, variant: "destructive" });
    }
    setShowCommentDialog(false);
    setCurrentAppForComment(null);
    setComment("");
    setActionToConfirm(null);
  };

  const openCommentDialog = (app: OtherStudentApplication, action: "Approved" | "Rejected") => {
    setCurrentAppForComment(app);
    setActionToConfirm(action);
    setComment(app.teacherComments || "");
    setShowCommentDialog(true);
  };

  const confirmActionWithComment = () => {
    if (currentAppForComment && actionToConfirm) {
      handleUpdateStatus(currentAppForComment.id!, actionToConfirm, comment);
    }
  };

  const formatDateDisplay = (timestamp: Timestamp) => {
    if (!timestamp) return "N/A";
    try {
      return format(timestamp.toDate(), "dd MMM yyyy, HH:mm");
    } catch (e) {
      return "Invalid Date";
    }
  };
  
  const statusBadgeVariant = (status: RequestStatus) => {
    switch (status) {
      case "Pending": return "default";
      case "Approved": return "accent";
      case "Rejected": return "destructive";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive">
        <CardHeader><CardTitle className="text-destructive">Error Loading Applications</CardTitle></CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <FileSignature className="h-10 w-10 text-primary" />
                <CardTitle className="text-3xl font-bold text-primary">Review Other School Applications</CardTitle>
            </div>
        </div>
        <CardDescription>Review and process various student requests.</CardDescription>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="statusFilter" className="text-sm font-medium">Filter by Status:</Label>
            <Select onValueChange={(value) => setFilterStatus(value as RequestStatus | "All")} defaultValue="Pending">
              <SelectTrigger id="statusFilter" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="formTypeFilter" className="text-sm font-medium">Filter by Type:</Label>
            <Select onValueChange={(value) => setFilterFormType(value as OtherApplicationType | "All")} defaultValue="All">
              <SelectTrigger id="formTypeFilter" className="w-full sm:w-[220px]">
                <SelectValue placeholder="Select form type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Form Types</SelectItem>
                {Object.entries(otherApplicationTypeLabels).map(([typeKey, typeLabel]) => (
                  <SelectItem key={typeKey} value={typeKey}>{typeLabel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No applications found matching your filters.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Form Type</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Reason/Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.studentName}</TableCell>
                    <TableCell>{app.grade}{app.division}</TableCell>
                    <TableCell>{otherApplicationTypeLabels[app.formType] || app.formType}</TableCell>
                    <TableCell>{formatDateDisplay(app.applicationTimestamp)}</TableCell>
                    <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.reasonOrDetails}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant(app.status)}>{app.status}</Badge></TableCell>
                    <TableCell>
                      {app.status === "Pending" ? (
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openCommentDialog(app, "Approved")} className="bg-green-500 hover:bg-green-600 text-white">
                            <CheckCircle className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openCommentDialog(app, "Rejected")} className="bg-red-500 hover:bg-red-600 text-white">
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      ) : (
                         <span className="text-xs text-muted-foreground">Processed</span>
                      )}
                    </TableCell>
                     <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.teacherComments || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <AlertDialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review Application: {currentAppForComment?.formType ? otherApplicationTypeLabels[currentAppForComment.formType] : 'Application'}</AlertDialogTitle>
            <AlertDialogDescription>
              Reviewing request from {currentAppForComment?.studentName} for action: 
              <span className={`font-semibold ${actionToConfirm === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>
                {actionToConfirm}
              </span>. Add comments below (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Add comments for the student/record..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowCommentDialog(false); setCurrentAppForComment(null); setActionToConfirm(null);}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionWithComment}>
              Confirm {actionToConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
