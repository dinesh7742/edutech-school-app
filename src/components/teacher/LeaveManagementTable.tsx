
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ListFilter, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy } from "firebase/firestore";
import type { LeaveApplication, LeaveApplicationStatus } from "@/types";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export function LeaveManagementTable() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeaveApplicationStatus | "All">("Pending");

  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [currentAppForComment, setCurrentAppForComment] = useState<LeaveApplication | null>(null);
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
        const appsCollectionRef = collection(db, "leaveApplications");
        let q;
        if (filterStatus === "All") {
          q = query(appsCollectionRef, orderBy("applicationDate", "desc"));
        } else {
          q = query(appsCollectionRef, where("status", "==", filterStatus), orderBy("applicationDate", "desc"));
        }
        // TODO: In a larger system, filter by teacher's assigned grade/division or other criteria.
        // For now, fetching all applications or filtered by status for simplicity.

        const querySnapshot = await getDocs(q);
        const fetchedApps = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure dates are strings for consistent handling if they come from Firestore
          leaveStartDate: doc.data().leaveStartDate as string,
          leaveEndDate: doc.data().leaveEndDate as string,
        })) as LeaveApplication[];
        
        setApplications(fetchedApps);
      } catch (err: any) {
        console.error("Error fetching leave applications:", err);
        setError("Failed to load leave applications. " + (err.message || ""));
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
            setError("A Firestore index might be required for filtering/ordering leave applications. Please check the console for a link to create it.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [teacherUser, filterStatus]);

  const handleUpdateStatus = async (appId: string, newStatus: LeaveApplicationStatus, teacherComment?: string) => {
    if (!teacherUser || !appId) {
      toast({ title: "Error", description: "User or application ID missing.", variant: "destructive" });
      return;
    }
    try {
      const appDocRef = doc(db, "leaveApplications", appId);
      await updateDoc(appDocRef, {
        status: newStatus,
        reviewedByTeacherId: teacherUser.uid,
        reviewedByTeacherName: teacherUser.displayName || teacherUser.email,
        reviewTimestamp: serverTimestamp(),
        teacherComments: teacherComment || null, 
      });
      toast({ title: "Success", description: `Application ${newStatus.toLowerCase()}.` });
      setApplications(prevApps => prevApps.map(app => app.id === appId ? { ...app, status: newStatus } : app));
    } catch (error: any) {
      console.error("Error updating application status:", error);
      toast({ title: "Error", description: "Could not update application status. " + error.message, variant: "destructive" });
    }
    // Reset comment dialog states
    setShowCommentDialog(false);
    setCurrentAppForComment(null);
    setComment("");
    setActionToConfirm(null);
  };

  const openCommentDialog = (app: LeaveApplication, action: "Approved" | "Rejected") => {
    setCurrentAppForComment(app);
    setActionToConfirm(action);
    setComment(app.teacherComments || ""); // Pre-fill if existing comment
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
      return dateString; // Fallback if parsing fails
    }
  };
  
  const statusBadgeVariant = (status: LeaveApplicationStatus) => {
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
        <p className="ml-4 text-lg">Loading leave applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Manage Leave Applications</CardTitle>
        <CardDescription>Review and process student leave requests.</CardDescription>
         <div className="flex items-center space-x-2 pt-4">
          <Label htmlFor="statusFilter" className="text-sm font-medium">Filter by Status:</Label>
          <Select onValueChange={(value) => setFilterStatus(value as LeaveApplicationStatus | "All")} defaultValue="Pending">
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
          <p className="text-center text-muted-foreground py-8">No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""} leave applications found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.studentName}</TableCell>
                    <TableCell>{app.grade}{app.division}</TableCell>
                    <TableCell>{formatDateDisplay(app.leaveStartDate)}</TableCell>
                    <TableCell>{formatDateDisplay(app.leaveEndDate)}</TableCell>
                    <TableCell className="max-w-xs truncate hover:whitespace-normal">{app.reason}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(app.status)}>{app.status}</Badge>
                    </TableCell>
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
                <AlertDialogTitle>Review Leave Application</AlertDialogTitle>
                <AlertDialogDescription>
                    Reviewing application for {currentAppForComment?.studentName} for action: 
                    <span className={`font-semibold ${actionToConfirm === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>
                        {actionToConfirm}
                    </span>. 
                    Add any comments below (optional).
                </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                placeholder="Add comments for the student/record..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                />
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {setCurrentAppForComment(null); setActionToConfirm(null);}}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmActionWithComment}>
                    Confirm {actionToConfirm}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}

// Minimal Select component structure to satisfy the compiler for now. 
// In a real app, you'd use the full ShadCN Select.
const Label = ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { htmlFor: string }) => <label {...props}>{children}</label>;
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { onValueChange: (value: string) => void, defaultValue: string }) => (
  <select onChange={(e) => props.onValueChange(e.target.value)} defaultValue={props.defaultValue} {...props}>
    {children}
  </select>
);
const SelectTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
const SelectValue = ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>;
const SelectContent = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
const SelectItem = ({ children, value, ...props }: React.HTMLAttributes<HTMLOptionElement> & { value: string }) => <option value={value} {...props}>{children}</option>;

