
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, MessageSquare, AlertTriangle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, Timestamp } from "firebase/firestore";
import type { LateArrivalApplication, RequestStatus } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
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

export function LateArrivalManagementTable() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<LateArrivalApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | "All">("Pending");

  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [currentAppForComment, setCurrentAppForComment] = useState<LateArrivalApplication | null>(null);
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
        const appsCollectionRef = collection(db, "lateArrivalRequests");
        let q;
        if (filterStatus === "All") {
          q = query(appsCollectionRef, orderBy("applicationTimestamp", "desc"));
        } else {
          q = query(appsCollectionRef, where("status", "==", filterStatus), orderBy("applicationTimestamp", "desc"));
        }
        // TODO: Further filter by teacher's assigned grade/division if necessary

        const querySnapshot = await getDocs(q);
        const fetchedApps = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestDate: doc.data().requestDate as string,
          applicationTimestamp: doc.data().applicationTimestamp as Timestamp,
        })) as LateArrivalApplication[];
        
        setApplications(fetchedApps);
      } catch (err: any) {
        console.error("Error fetching late arrival/early departure requests:", err);
        setError("Failed to load requests. " + (err.message || ""));
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
            setError("A Firestore index might be required. Please check the console for a link to create it.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [teacherUser, filterStatus]);

  const handleUpdateStatus = async (appId: string, newStatus: RequestStatus, teacherComment?: string) => {
    if (!teacherUser || !appId) {
      toast({ title: "Error", description: "User or application ID missing.", variant: "destructive" });
      return;
    }
    try {
      const appDocRef = doc(db, "lateArrivalRequests", appId);
      await updateDoc(appDocRef, {
        status: newStatus,
        reviewedByTeacherId: teacherUser.uid,
        reviewedByTeacherName: teacherUser.displayName || teacherUser.email,
        reviewTimestamp: serverTimestamp(),
        teacherComments: teacherComment || null,
      });
      toast({ title: "Success", description: `Request ${newStatus.toLowerCase()}.` });
      setApplications(prevApps => prevApps.map(app => app.id === appId ? { ...app, status: newStatus, teacherComments: teacherComment } : app));
    } catch (error: any) {
      console.error("Error updating request status:", error);
      toast({ title: "Error", description: "Could not update request status. " + error.message, variant: "destructive" });
    }
    setShowCommentDialog(false);
    setCurrentAppForComment(null);
    setComment("");
    setActionToConfirm(null);
  };

  const openCommentDialog = (app: LateArrivalApplication, action: "Approved" | "Rejected") => {
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

  const formatDateDisplay = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM yyyy");
    } catch (e) {
      return dateString;
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
        <p className="ml-4 text-lg">Loading requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive">
        <CardHeader><CardTitle className="text-destructive">Error Loading Requests</CardTitle></CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-10 w-10 text-primary" />
                <CardTitle className="text-3xl font-bold text-primary">Manage Late Arrival / Early Departure Requests</CardTitle>
            </div>
        </div>
        <CardDescription>Review and process student requests.</CardDescription>
        <div className="flex items-center space-x-2 pt-4">
          <Label htmlFor="statusFilter" className="text-sm font-medium">Filter by Status:</Label>
          <Select onValueChange={(value) => setFilterStatus(value as RequestStatus | "All")} defaultValue="Pending">
            <SelectTrigger id="statusFilter" className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""} requests found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Reason</TableHead>
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
                    <TableCell>{formatDateDisplay(app.requestDate)}</TableCell>
                    <TableCell>{app.type}</TableCell>
                    <TableCell>{app.time}</TableCell>
                    <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.reason}</TableCell>
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
            <AlertDialogTitle>Review Request: {currentAppForComment?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Reviewing request for {currentAppForComment?.studentName} for action: 
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
