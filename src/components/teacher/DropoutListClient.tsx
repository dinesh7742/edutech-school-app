
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, UserCircle, RotateCw, Archive } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, writeBatch, serverTimestamp, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { DroppedStudentProfile } from "@/types";
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
import { GradeDivisionSelector } from "@/components/auth/GradeDivisionSelector";
import { Label } from "@/components/ui/label";

export function DropoutListClient() {
  const { toast } = useToast();
  const [droppedStudents, setDroppedStudents] = useState<DroppedStudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<DroppedStudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReAdmitting, setIsReAdmitting] = useState<string | null>(null);

  const [showReAdmitDialog, setShowReAdmitDialog] = useState(false);
  const [studentToReAdmit, setStudentToReAdmit] = useState<DroppedStudentProfile | null>(null);
  const [newGrade, setNewGrade] = useState("");
  const [newDivision, setNewDivision] = useState("");

  useEffect(() => {
    const fetchDroppedStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const profilesCollectionRef = collection(db, "droppedStudentProfiles");
        // Removed orderBy("deletedAt", "desc") to prevent missing index error. Sorting is done client-side.
        const q = query(profilesCollectionRef);
        const querySnapshot = await getDocs(q);
        
        const fetchedProfiles = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as DroppedStudentProfile));

        // Sort client-side by first name
        fetchedProfiles.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        setDroppedStudents(fetchedProfiles);
        setFilteredStudents(fetchedProfiles);
      } catch (err: any) {
        console.error("Error fetching dropped students:", err);
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
          setError("A Firestore index might be required to sort this list. Please check the console for a link to create it. The list is currently unsorted.");
        } else {
          setError("Failed to load dropout list. " + (err.message || ""));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDroppedStudents();
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = droppedStudents.filter(item => {
      const fullName = `${item.firstName?.toLowerCase() || ''} ${item.lastName?.toLowerCase() || ''}`;
      return fullName.includes(lowercasedFilter);
    });
    setFilteredStudents(filteredData);
  }, [searchTerm, droppedStudents]);

  const startReAdmitProcess = (student: DroppedStudentProfile) => {
    setStudentToReAdmit(student);
    setNewGrade(student.grade);
    setNewDivision(student.division);
    setShowReAdmitDialog(true);
  };

  const handleReAdmitStudent = async () => {
    if (!studentToReAdmit || !newGrade || !newDivision) {
        toast({ title: "Error", description: "Missing student data or new class assignment.", variant: "destructive" });
        return;
    }
    setIsReAdmitting(studentToReAdmit.uid);

    try {
        const batch = writeBatch(db);

        // Reference to the documents in the "dropped" collections
        const droppedProfileRef = doc(db, "droppedStudentProfiles", studentToReAdmit.uid);
        const droppedUserRef = doc(db, "droppedUsers", studentToReAdmit.uid);

        // Fetch the data from the "dropped" collections
        const droppedProfileSnap = await getDoc(droppedProfileRef);
        const droppedUserSnap = await getDoc(droppedUserRef);

        if (!droppedProfileSnap.exists() && !droppedUserSnap.exists()) {
            throw new Error("Could not find any dropped record for this student to restore.");
        }

        // Reference to where the documents will be moved back to
        const studentProfileRef = doc(db, "studentProfiles", studentToReAdmit.uid);
        const userRef = doc(db, "users", studentToReAdmit.uid);

        // Restore profile if it exists
        if (droppedProfileSnap.exists()) {
            const { deletionReason, deletedAt, deletedBy, ...profileData } = droppedProfileSnap.data();
            batch.set(studentProfileRef, { ...profileData, grade: newGrade, division: newDivision });
            batch.delete(droppedProfileRef);
        }

        // Restore user record if it exists, or create one if it doesn't but the profile did
        if (droppedUserSnap.exists()) {
            const userData = { ...droppedUserSnap.data(), grade: newGrade, division: newDivision };
            batch.set(userRef, userData);
            batch.delete(droppedUserRef);
        } else if (droppedProfileSnap.exists()) {
             // If user record is missing but profile exists, create a basic user record from profile data
             const profileData = droppedProfileSnap.data() as DroppedStudentProfile;
             const basicUserData = {
                uid: profileData.uid,
                email: profileData.email,
                displayName: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
                role: 'student',
                grade: newGrade,
                division: newDivision,
                createdAt: profileData.deletedAt, // Use deletion time as a rough creation time
             };
             batch.set(userRef, basicUserData);
        }


        await batch.commit();

        setDroppedStudents(prev => prev.filter(s => s.uid !== studentToReAdmit.uid));
        
        toast({
            title: "Student Re-admitted",
            description: `${studentToReAdmit.firstName} has been moved back to the active student list in Grade ${newGrade}-${newDivision}.`,
        });

    } catch (error: any) {
        console.error("Error re-admitting student:", error);
        toast({ title: "Error", description: `Could not re-admit student. ${error.message}`, variant: "destructive" });
    } finally {
        setIsReAdmitting(null);
        setShowReAdmitDialog(false);
        setStudentToReAdmit(null);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-destructive py-10">{error}</p>;
  }

  return (
    <>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
            <Archive className="h-8 w-8" />
            Dropout Box
          </CardTitle>
          <CardDescription>This list contains students who have been removed from active rosters. You can view their details or re-admit them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Input
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-10">
              <UserCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">Dropout Box is Empty</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No students have been moved to the dropout list yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Original Class</TableHead>
                    <TableHead>Reason for Deletion</TableHead>
                    <TableHead>Date Removed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.uid} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{student.firstName} {student.lastName || ''}</TableCell>
                      <TableCell>{student.grade}-{student.division}</TableCell>
                      <TableCell>{student.deletionReason}</TableCell>
                      <TableCell>{student.deletedAt ? format((student.deletedAt as any).toDate(), 'dd MMM yyyy') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => startReAdmitProcess(student)} disabled={isReAdmitting === student.uid}>
                          {isReAdmitting === student.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                           Re-admit
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
      <AlertDialog open={showReAdmitDialog} onOpenChange={setShowReAdmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-admit Student</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to re-admit <span className="font-bold">{studentToReAdmit?.firstName}</span>. Please confirm the new grade and division for this student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
              <Label>Assign to new class</Label>
              <GradeDivisionSelector
                grade={newGrade}
                onGradeChange={setNewGrade}
                division={newDivision}
                onDivisionChange={setNewDivision}
              />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReAdmitStudent} disabled={!newGrade || !newDivision || !!isReAdmitting}>
              {isReAdmitting ? "Re-admitting..." : "Confirm & Re-admit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
