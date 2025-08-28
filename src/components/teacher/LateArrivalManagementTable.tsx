
"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, Timestamp, addDoc } from "firebase/firestore";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
        const queryConstraints = [];
        if (filterStatus !== "All") {
          queryConstraints.push(where("status", "==", filterStatus));
        }

        const q = query(appsCollectionRef, ...queryConstraints);
        
        const querySnapshot = await getDocs(q);
        const fetchedApps = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestDate: doc.data().requestDate as string,
          applicationTimestamp: doc.data().applicationTimestamp as Timestamp,
        })) as LateArrivalApplication[];
        
        // Sort client-side
        fetchedApps.sort((a, b) => {
            const timeA = (a.applicationTimestamp as Timestamp)?.toDate()?.getTime() || 0;
            const timeB = (b.applicationTimestamp as Timestamp)?.toDate()?.getTime() || 0;
            return timeB - timeA;
        });

        setApplications(fetchedApps);
      } catch (err: any) {
        console.error("Error fetching late arrival/early departure requests:", err);
        setError("Failed to load requests. " + (err.message || ""));
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [teacherUser, filterStatus]);

  const handleUpdateStatus = async (appId: string, newStatus: RequestStatus, teacherComment?: string) => {
    if (!teacherUser || !currentAppForComment) {
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

      // Create a notification for the student
      const notificationMessage = `Your ${currentAppForComment.type} request for ${formatDateDisplay(currentAppForComment.requestDate)} has been ${newStatus}.`;
      await addDoc(collection(db, "notifications"), {
        recipientUid: currentAppForComment.studentUid,
        type: 'LateArrivalStatusUpdate',
        message: notificationMessage,
        link: '/student/my-applications',
        timestamp: serverTimestamp(),
        isRead: false
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
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="p-4 rounded-md border border-destructive bg-destructive/10">
        <p className="text-destructive text-sm font-medium">Error Loading Requests</p>
        <p className="text-destructive/80 text-xs mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2">
        <Label htmlFor="statusFilterLateArrival" className="text-sm font-medium shrink-0">Filter by Status:</Label>
        <Select onValueChange={(value) => setFilterStatus(value as RequestStatus | "All")} defaultValue="Pending">
          <SelectTrigger id="statusFilterLateArrival" className="w-full sm:w-[180px]">
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
      {applications.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""} requests found.</p>
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
                      <div className="flex flex-col sm:flex-row gap-2">
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
    </div>
  );
}
