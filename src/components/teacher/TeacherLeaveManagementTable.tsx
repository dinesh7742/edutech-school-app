
"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, PlusCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, Timestamp, writeBatch, runTransaction, getDoc } from "firebase/firestore";
import type { TeacherLeaveApplication, AppUser, TeacherLeaveBalance } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInCalendarDays, getYear } from "date-fns";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AdminApplyLeaveForm } from "./AdminApplyLeaveForm";

export function TeacherLeaveManagementTable() {
  const { user: adminUser } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<TeacherLeaveApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TeacherLeaveApplication['status'] | "All">("Pending");
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [currentAppForComment, setCurrentAppForComment] = useState<TeacherLeaveApplication | null>(null);
  const [comment, setComment] = useState("");
  const [actionToConfirm, setActionToConfirm] = useState<"Approved" | "Rejected" | null>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const appsCollectionRef = collection(db, "teacherLeaves");
      const q = filterStatus === "All" ? query(appsCollectionRef) : query(appsCollectionRef, where("status", "==", filterStatus));
      
      const querySnapshot = await getDocs(q);
      const fetchedApps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TeacherLeaveApplication[];
      
      fetchedApps.sort((a, b) => (b.timestamp as Timestamp).toMillis() - (a.timestamp as Timestamp).toMillis());
      setApplications(fetchedApps);
    } catch (err: any) {
      console.error("Error fetching teacher leave applications:", err);
      setError("Failed to load applications. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const handleUpdateStatus = async (appId: string, newStatus: "Approved" | "Rejected", adminComment?: string) => {
    if (!adminUser || !currentAppForComment) {
      toast({ title: "Error", description: "Admin user or application data missing.", variant: "destructive" });
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const appDocRef = doc(db, "teacherLeaves", appId);
        const appDoc = await transaction.get(appDocRef);
        if (!appDoc.exists()) throw new Error("Application not found.");

        const appData = appDoc.data() as TeacherLeaveApplication;

        if (newStatus === "Approved" && appData.leaveType === "CL") {
            const leaveDuration = differenceInCalendarDays(parseISO(appData.toDate), parseISO(appData.fromDate)) + 1;
            const leaveYear = getYear(parseISO(appData.fromDate));
            const balanceDocId = `${appData.teacherId}_${leaveYear}`;
            const balanceDocRef = doc(db, "teacherLeaveBalances", balanceDocId);
            
            const balanceDoc = await transaction.get(balanceDocRef);
            
            if (balanceDoc.exists()) {
                const currentBalance = balanceDoc.data() as TeacherLeaveBalance;
                transaction.update(balanceDocRef, { usedCL: currentBalance.usedCL + leaveDuration });
            } else {
                const newBalance: TeacherLeaveBalance = { uid: appData.teacherId, year: leaveYear, totalCL: 15, usedCL: leaveDuration };
                transaction.set(balanceDocRef, newBalance);
            }
        }

        // All writes happen after all reads.
        transaction.update(appDocRef, {
          status: newStatus,
          reviewedByUid: adminUser.uid,
          reviewTimestamp: serverTimestamp(),
          adminComments: adminComment || null,
        });

        // Send notification to the teacher
        const notificationMessage = `Your ${appData.leaveType} leave from ${formatDateDisplay(appData.fromDate)} has been ${newStatus}.`;
        const notificationRef = doc(collection(db, "notifications"));
        transaction.set(notificationRef, {
          recipientUid: appData.teacherId,
          type: 'TeacherLeaveUpdate',
          message: notificationMessage,
          link: '/teacher/dashboard',
          timestamp: serverTimestamp(),
          isRead: false
        });
      });

      toast({ title: "Success", description: `Application ${newStatus.toLowerCase()}.` });
      fetchApplications(); // Refresh the list
    } catch (error: any) {
      console.error("Error updating application status:", error);
      toast({ title: "Error", description: "Could not update status. " + error.message, variant: "destructive" });
    }
    setShowCommentDialog(false);
    setCurrentAppForComment(null);
    setComment("");
    setActionToConfirm(null);
  };

  const openCommentDialog = (app: TeacherLeaveApplication, action: "Approved" | "Rejected") => {
    setCurrentAppForComment(app);
    setActionToConfirm(action);
    setComment(app.adminComments || "");
    setShowCommentDialog(true);
  };

  const confirmActionWithComment = () => {
    if (currentAppForComment && actionToConfirm) {
      handleUpdateStatus(currentAppForComment.id!, actionToConfirm, comment);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    try { return format(parseISO(dateString), "dd MMM yyyy"); } catch (e) { return dateString; }
  };
  
  const statusBadgeVariant = (status: TeacherLeaveApplication['status']) => {
    switch (status) {
      case "Pending": return "default";
      case "Approved": return "accent";
      case "Rejected": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="statusFilterTeacherLeave" className="text-sm font-medium shrink-0">Filter by Status:</Label>
          <Select onValueChange={(value) => setFilterStatus(value as any)} defaultValue="Pending">
            <SelectTrigger id="statusFilterTeacherLeave" className="w-full sm:w-[180px]">
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
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Apply on Behalf</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Apply Leave on Behalf of a Teacher</DialogTitle>
            </DialogHeader>
            <AdminApplyLeaveForm onSuccess={() => { setShowApplyDialog(false); fetchApplications(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-center text-destructive py-6">{error}</p>
      ) : applications.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">No applications found matching filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher Name</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Admin Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>{app.teacherName}</TableCell>
                  <TableCell><Badge variant="secondary">{app.leaveType}</Badge></TableCell>
                  <TableCell>{formatDateDisplay(app.fromDate)}</TableCell>
                  <TableCell>{formatDateDisplay(app.toDate)}</TableCell>
                  <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.reason}</TableCell>
                  <TableCell><Badge variant={statusBadgeVariant(app.status)}>{app.status}</Badge></TableCell>
                  <TableCell>
                    {app.status === "Pending" && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openCommentDialog(app, "Approved")} className="bg-green-500 hover:bg-green-600 text-white">
                          <CheckCircle className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openCommentDialog(app, "Rejected")} className="bg-red-500 hover:bg-red-600 text-white">
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.adminComments || "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review Leave Application</AlertDialogTitle>
            <AlertDialogDescription>
              Reviewing application for {currentAppForComment?.teacherName} for action: 
              <span className={`font-semibold ${actionToConfirm === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>{actionToConfirm}</span>. 
              Add comments below (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Add comments..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionWithComment}>Confirm {actionToConfirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
