
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle, Trash2, Loader2, MoreVertical } from "lucide-react";
import type { StudentProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, doc, deleteDoc, where, writeBatch, serverTimestamp, getDoc } from "firebase/firestore";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type DeletionReason = "Duplicate Entry" | "Left with LC" | "Continuous Absent";

export function StudentDataList() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [deletionReason, setDeletionReason] = useState<DeletionReason | null>(null);

  useEffect(() => {
    const fetchStudentProfiles = async () => {
      setLoading(true);
      setError(null);

      if (!teacherUser?.grade || !teacherUser?.division) {
        setError("Your teacher profile is missing an assigned grade or division.");
        setLoading(false);
        return;
      }

      try {
        const profilesCollectionRef = collection(db, "studentProfiles");
        const q = query(
            profilesCollectionRef, 
            where("grade", "==", teacherUser.grade),
            where("division", "==", teacherUser.division),
            orderBy("firstName")
        );
        const querySnapshot = await getDocs(q);
        
        const fetchedProfiles: StudentProfile[] = querySnapshot.docs.map(doc => {
          return {
            uid: doc.id,
            ...doc.data()
          } as StudentProfile;
        });
        
        setStudents(fetchedProfiles);
        setFilteredStudents(fetchedProfiles);
      } catch (err: any) {
        console.error("Error fetching student profiles:", err);
        setError("Failed to load student data. Please try again later.");
        if (err.code === 'failed-precondition' && err.message.includes('index')) {
            setError("A Firestore index is required to sort students. Please check the console for a link to create it.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (teacherUser) {
      fetchStudentProfiles();
    }
  }, [teacherUser]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = students.filter(item => {
      const fullName = `${item.firstName?.toLowerCase() || ''} ${item.lastName?.toLowerCase() || ''}`;
      return (
        fullName.includes(lowercasedFilter) ||
        (item.firstName && item.firstName.toLowerCase().includes(lowercasedFilter)) ||
        (item.lastName && item.lastName.toLowerCase().includes(lowercasedFilter)) ||
        (item.email && item.email.toLowerCase().includes(lowercasedFilter))
      );
    });
    setFilteredStudents(filteredData);
  }, [searchTerm, students]);

  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "??";
  };
  
  const handleSoftDeleteStudent = async () => {
    if (!studentToDelete || !deletionReason) return;

    setIsDeleting(studentToDelete.uid);
    
    try {
      const batch = writeBatch(db);

      // Get original documents
      const studentProfileRef = doc(db, "studentProfiles", studentToDelete.uid);
      const studentProfileSnap = await getDoc(studentProfileRef);
      
      const userRef = doc(db, "users", studentToDelete.uid);
      const userSnap = await getDoc(userRef);

      if (studentProfileSnap.exists()) {
        const droppedProfileRef = doc(db, "droppedStudentProfiles", studentToDelete.uid);
        const dataToMove = {
          ...studentProfileSnap.data(),
          deletionReason: deletionReason,
          deletedAt: serverTimestamp(),
          deletedBy: teacherUser?.uid,
        };
        batch.set(droppedProfileRef, dataToMove);
        batch.delete(studentProfileRef);
      }

      if (userSnap.exists()) {
        const droppedUserRef = doc(db, "droppedUsers", studentToDelete.uid);
        batch.set(droppedUserRef, userSnap.data());
        batch.delete(userRef);
      }
      
      await batch.commit();

      setStudents(prev => prev.filter(s => s.uid !== studentToDelete.uid));
      setFilteredStudents(prev => prev.filter(s => s.uid !== studentToDelete.uid));
      
      toast({
        title: "Student Moved to Dropout Box",
        description: `${studentToDelete.firstName} has been removed from the active list.`,
      });

    } catch (error: any) {
      console.error("Error moving student to dropout:", error);
      toast({
        title: "Error",
        description: `Could not move student. ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
      setStudentToDelete(null);
      setDeletionReason(null);
      setShowConfirmDialog(false);
    }
  };

  const startDeletionProcess = (student: StudentProfile, reason: DeletionReason) => {
    setStudentToDelete(student);
    setDeletionReason(reason);
    setShowConfirmDialog(true);
  };


  if (loading) {
    return (
       <Card className="shadow-xl">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-xl border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Student Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
           <p className="mt-2 text-sm text-muted-foreground">
              Please check your internet connection or Firestore security rules.
              The console might have more details.
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Student Data for Grade {teacherUser?.grade}-{teacherUser?.division} (Academic Year: 2025-26)</CardTitle>
          <CardDescription>View and manage student profiles for your assigned class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Input
              placeholder="Search students in your class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-10">
              <UserCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">No Students Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "No students match your search." : "No student profiles have been created for this class yet."}
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.uid} className="hover:bg-muted/50">
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={student.photoUrl || `https://placehold.co/40x40.png?text=${getInitials(student.firstName, student.lastName)}`} alt={`${student.firstName} ${student.lastName || ''}`} data-ai-hint="profile avatar" />
                        <AvatarFallback>{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{student.firstName} {student.lastName || ''}</TableCell>
                    <TableCell>{student.email || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/teacher/student-data/${student.uid}`}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isDeleting === student.uid}>
                            {isDeleting === student.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Move to Dropout</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => startDeletionProcess(student, "Duplicate Entry")}>
                            Duplicate Entry
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startDeletionProcess(student, "Left with LC")}>
                            Left with LC
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startDeletionProcess(student, "Continuous Absent")}>
                            Continuous Absent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move <span className="font-bold">{studentToDelete?.firstName}</span> to the dropout list for the reason: <span className="font-bold">{deletionReason}</span>.
              <br/><br/>
              The student will be removed from the active class list but can be re-admitted later from the Dropout Box.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDeleteStudent} className="bg-destructive hover:bg-destructive/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
