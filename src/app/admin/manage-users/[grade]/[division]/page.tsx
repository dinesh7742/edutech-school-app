
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle, Trash2, Loader2, MoreVertical, Search, ArrowUpCircle } from "lucide-react";
import type { CombinedStudentData, DeletionReason } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, doc, deleteDoc, where, writeBatch, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
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
import { GradeDivisionSelector } from "@/components/auth/GradeDivisionSelector";
import { Label } from "@/components/ui/label";

interface StudentListPageProps {
  params: {
    grade: string;
    division: string;
  };
}

export default function StudentListPage({ params }: StudentListPageProps) {
  const { user: adminUser } = useAuth();
  const { toast } = useToast();
  const { grade, division } = params;

  const [students, setStudents] = useState<CombinedStudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<CombinedStudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<CombinedStudentData | null>(null);
  const [deletionReason, setDeletionReason] = useState<DeletionReason | null>(null);
  
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [studentToPromote, setStudentToPromote] = useState<CombinedStudentData | null>(null);
  const [newGrade, setNewGrade] = useState("");
  const [newDivision, setNewDivision] = useState("");

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersCollectionRef = collection(db, "users");
        const usersQuery = query(
          usersCollectionRef, 
          where("role", "==", "student"),
          where("grade", "==", grade),
          where("division", "==", division)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const userMap = new Map();
        usersSnapshot.forEach(doc => {
          userMap.set(doc.id, { uid: doc.id, ...doc.data() });
        });

        const studentUids = Array.from(userMap.keys());
        if (studentUids.length === 0) {
            setStudents([]);
            setFilteredStudents([]);
            setLoading(false);
            return;
        }

        const profilesCollectionRef = collection(db, "studentProfiles");
        const profilesQuery = query(profilesCollectionRef, where('__name__', 'in', studentUids));
        const profilesSnapshot = await getDocs(profilesQuery);
        const profileMap = new Map();
        profilesSnapshot.forEach(doc => {
          profileMap.set(doc.id, { uid: doc.id, ...doc.data() });
        });
        
        const combinedData = studentUids.map(uid => {
            const user = userMap.get(uid);
            const profile = profileMap.get(uid);
            return {
                ...user,
                ...profile,
                uid: uid,
                firstName: profile?.firstName || user.displayName?.split(' ')[0] || '',
                lastName: profile?.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
            };
        });

        combinedData.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));
        setStudents(combinedData);
        setFilteredStudents(combinedData);

      } catch (err: any) {
        console.error("Error fetching student data:", err);
        setError("Failed to load student data for this class.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [grade, division]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = students.filter(item => {
      const fullName = `${item.firstName?.toLowerCase() || ''} ${item.lastName?.toLowerCase() || ''}`;
      return (
        fullName.includes(lowercasedFilter) ||
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
    if (!studentToDelete || !deletionReason || !adminUser) return;
    setIsDeleting(studentToDelete.uid);
    try {
      const batch = writeBatch(db);
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
          deletedBy: adminUser.uid,
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
      toast({
        title: "Student Moved to Dropout Box",
        description: `${studentToDelete.firstName} has been removed from the active list.`,
      });
    } catch (error: any) {
      console.error("Error moving student to dropout:", error);
      toast({ title: "Error", description: `Could not move student. ${error.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(null);
      setStudentToDelete(null);
      setDeletionReason(null);
      setShowConfirmDialog(false);
    }
  };

  const startDeletionProcess = (student: CombinedStudentData, reason: DeletionReason) => {
    setStudentToDelete(student);
    setDeletionReason(reason);
    setShowConfirmDialog(true);
  };
  
  const startPromotionProcess = (student: CombinedStudentData) => {
    setStudentToPromote(student);
    setNewGrade(student.grade || '1');
    setNewDivision(student.division || 'A');
    setShowPromoteDialog(true);
  };
  
  const handlePromoteStudent = async () => {
    if (!studentToPromote || !newGrade || !newDivision) return;
    setIsPromoting(studentToPromote.uid);
    try {
        const batch = writeBatch(db);
        const userRef = doc(db, "users", studentToPromote.uid);
        batch.update(userRef, { grade: newGrade, division: newDivision });

        const profileRef = doc(db, "studentProfiles", studentToPromote.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            batch.update(profileRef, { grade: newGrade, division: newDivision });
        }
        await batch.commit();
        
        setStudents(prev => prev.filter(s => s.uid !== studentToPromote.uid));
        toast({
            title: "Student Promoted",
            description: `${studentToPromote.firstName} has been moved to Grade ${newGrade}-${newDivision}.`
        });

    } catch(err: any) {
        toast({ title: "Promotion Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsPromoting(null);
        setShowPromoteDialog(false);
        setStudentToPromote(null);
    }
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
        <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
        <CardContent><p>{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Student List: Grade {grade} - {division}</CardTitle>
          <CardDescription>View, edit, or manage students in this class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-sm"
                />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-10">
              <UserCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">No Students Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "No students match your search." : "There are no students in this class."}
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
                  <TableHead>Contact Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.uid} className="hover:bg-muted/50">
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={student.photoUrl || undefined} alt={`${student.firstName} ${student.lastName || ''}`} data-ai-hint="profile avatar" />
                        <AvatarFallback>{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{student.firstName} {student.lastName || ''}</TableCell>
                    <TableCell>{student.email || 'N/A'}</TableCell>
                    <TableCell>{student.contactNumber || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/teacher/student-data/${student.uid}`}>
                          <Eye className="mr-2 h-4 w-4" /> View/Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isDeleting === student.uid || isPromoting === student.uid}>
                            {isDeleting === student.uid || isPromoting === student.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onSelect={() => startPromotionProcess(student)}>
                                <ArrowUpCircle className="mr-2 h-4 w-4"/>
                                Promote Student
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuLabel>Move to Dropout</DropdownMenuLabel>
                           <DropdownMenuItem onSelect={() => startDeletionProcess(student, "Duplicate Entry")}>
                                <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                Duplicate Entry
                           </DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => startDeletionProcess(student, "Left with LC")}>
                               <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                Left with LC
                           </DropdownMenuItem>
                           <DropdownMenuItem onSelect={() => startDeletionProcess(student, "Continuous Absent")}>
                               <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
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
              The student will be removed from the active class list but can be re-admitted later.
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

      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote Student</AlertDialogTitle>
            <AlertDialogDescription>
              Promote or move <span className="font-bold">{studentToPromote?.firstName}</span> to a new class.
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
            <AlertDialogAction onClick={handlePromoteStudent} disabled={!newGrade || !newDivision || !!isPromoting}>
              {isPromoting ? "Promoting..." : "Confirm & Promote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
