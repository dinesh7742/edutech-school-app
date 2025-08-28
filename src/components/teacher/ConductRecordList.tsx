
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import type { Complaint } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Search, MessageSquareWarning } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function ConductRecordList() {
  const { user: teacherUser } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Complaint["status"] | "All">("All");

  useEffect(() => {
    if (!teacherUser) {
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
          where("teacherUid", "==", teacherUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedComplaints = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Complaint));
        
        fetchedComplaints.sort((a, b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate().getTime() : 0;
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate().getTime() : 0;
            return dateB - dateA;
        });

        setComplaints(fetchedComplaints);
        setFilteredComplaints(fetchedComplaints);
      } catch (err: any) {
        console.error("Error fetching complaints:", err);
        setError("Failed to load complaint records.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchComplaints();
  }, [teacherUser]);

  useEffect(() => {
    let filtered = complaints;
    if (statusFilter !== "All") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.studentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredComplaints(filtered);
  }, [searchTerm, statusFilter, complaints]);
  
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
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
                    <MessageSquareWarning className="h-8 w-8" />
                    Student Conduct Records
                </CardTitle>
                <CardDescription>View, search, and manage student conduct complaints you have filed.</CardDescription>
            </div>
            <Button asChild>
                <Link href="/teacher/conduct-record/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Complaint
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-grow">
            <Label htmlFor="search-complaint">Search by Student Name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-complaint"
                placeholder="Type student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Label htmlFor="status-filter">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger id="status-filter" className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending Acknowledgment">Pending</SelectItem>
                <SelectItem value="Acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading complaints...</p>
          </div>
        ) : error ? (
          <p className="text-center text-destructive py-10">{error}</p>
        ) : filteredComplaints.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No complaints found matching your criteria.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Incident Date</TableHead>
                  <TableHead>Complaint Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map(complaint => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">{complaint.studentName}</TableCell>
                    <TableCell>{complaint.grade}-{complaint.division}</TableCell>
                    <TableCell>{format(new Date(complaint.incidentDate + "T00:00:00"), "dd MMM yyyy")}</TableCell>
                    <TableCell className="max-w-xs truncate">{complaint.complaintTypes.join(', ')}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(complaint.status)}>{complaint.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="outline" size="sm">
                          <Link href={`/teacher/conduct-record/${complaint.id}`}>View Details</Link>
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
