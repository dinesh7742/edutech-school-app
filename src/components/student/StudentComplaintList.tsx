
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Complaint } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquareWarning, Eye } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export function StudentComplaintList() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    const fetchComplaints = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const complaintsRef = collection(db, "complaints");
        const q = query(
          complaintsRef,
          where("studentUid", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedComplaints = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Complaint));
        setComplaints(fetchedComplaints);
      } catch (err: any) {
        console.error("Error fetching student complaints:", err);
        setError("Failed to load your conduct records.");
         if (err.code === 'failed-precondition' && err.message.includes('index')) {
          setError("A Firestore index might be required for fetching complaints. Please check the console for a link to create it.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComplaints();
  }, [user]);

  const statusBadgeVariant = (status: Complaint["status"]) => {
    switch (status) {
      case "Pending Acknowledgment": return "destructive";
      case "Acknowledged": return "accent";
      default: return "outline";
    }
  };
  
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
            <MessageSquareWarning className="h-8 w-8" />
            Parent Notifications
        </CardTitle>
        <CardDescription>
          This page lists all conduct reports filed by teachers. Please review any pending reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading notifications...</p>
          </div>
        ) : error ? (
          <p className="text-center text-destructive py-10">{error}</p>
        ) : complaints.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            You have no conduct records. Great job!
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incident Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Filed by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map(complaint => (
                  <TableRow key={complaint.id}>
                    <TableCell>{format(new Date(complaint.incidentDate + "T00:00:00"), "PPP")}</TableCell>
                    <TableCell>{complaint.subject}</TableCell>
                    <TableCell>{complaint.teacherName}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(complaint.status)}>
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="outline" size="sm">
                          <Link href={`/student/conduct-record/${complaint.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View & Acknowledge
                          </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
