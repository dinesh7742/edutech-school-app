
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle, Trash2, Loader2, MoreVertical, Search } from "lucide-react";
import type { StudentProfile, AppUser } from "@/types";
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
import { GradeDivisionSelector } from "@/components/auth/GradeDivisionSelector";

type DeletionReason = "Duplicate Entry" | "Left with LC" | "Continuous Absent";

// Combined type to handle both full profiles and basic user data
type CombinedStudentData = StudentProfile & AppUser;


export function StudentDataList() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<CombinedStudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<CombinedStudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [divisionFilter, setDivisionFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<CombinedStudentData | null>(null);
  const [deletionReason, setDeletionReason] = useState<DeletionReason | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Step 1: Fetch all users who are students
        const usersCollectionRef = collection(db, "users");
        const usersQuery = query(usersCollectionRef, where("role", "==", "student"));
        const usersSnapshot = await getDocs(usersQuery);
        const userMap = new Map<string, AppUser>();
        usersSnapshot.forEach(doc => {
          userMap.set(doc.id, { uid: doc.id, ...doc.data() } as AppUser);
        });

        // Step 2: Fetch all student profiles
        const profilesCollectionRef = collection(db, "studentProfiles");
        const profilesSnapshot = await getDocs(profilesCollectionRef);
        const profileMap = new Map<string, StudentProfile>();
        profilesSnapshot.forEach(doc => {
          profileMap.set(doc.id, { uid: doc.id, ...doc.data() } as StudentProfile);
        });

        // Step 3: Merge the two maps
        const combinedData: CombinedStudentData[] = [];
        userMap.forEach((user, uid) => {
          const profile = profileMap.get(uid);
          // Combine user and profile data, giving preference to profile data if it exists
          const combined: CombinedStudentData = {
            ...user, // Start with base user data (email, role, default grade/div)
            ...profile, // Override with specific profile data if present
            uid: uid,
            // Ensure essential fields from user data are kept if profile is incomplete
            firstName: profile?.firstName || user.displayName?.split(' ')[0] || '',
            lastName: profile?.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
            grade: profile?.grade || user.grade || 'N/A',
            division: profile?.division || user.division || 'N/A',
          };
          combinedData.push(combined);
        });
        
        // Sort the combined list
        combinedData.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));

        setStudents(combinedData);
        setFilteredStudents(combinedData);

      } catch (err: any) {
        console.error("Error fetching student data:", err);
        setError("Failed to load student data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  useEffect(() => {
    let tempStudents = students;

    if (gradeFilter !== "All") {
        tempStudents = tempStudents.filter(s => s.grade === gradeFilter);
    }
    if (divisionFilter !== "All") {
        tempStudents = tempStudents.filter(s => s.division === divisionFilter);
    }
    
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        tempStudents = tempStudents.filter(item => {
            const fullName = `${item.firstName?.toLowerCase() || ''} ${item.lastName?.toLowerCase() || ''}`;
            return (
                fullName.includes(lowercasedFilter) ||
                (item.email && item.email.toLowerCase().includes(lowercasedFilter))
            );
        });
    }

    setFilteredStudents(tempStudents);
  }, [searchTerm, gradeFilter, divisionFilter, students]);

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

  const startDeletionProcess = (student: CombinedStudentData, reason: DeletionReason) => {
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
          <CardTitle className="text-3xl font-bold text-primary">Student Database</CardTitle>
          <CardDescription>View, search, and manage all student profiles in the school.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-grow w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
            </div>
            <div className="flex-grow w-full">
                <GradeDivisionSelector
                    grade={gradeFilter}
                    onGradeChange={(val) => {
                        setGradeFilter(val);
                        if (val === "All") setDivisionFilter("All");
                    }}
                    division={divisionFilter}
                    onDivisionChange={setDivisionFilter}
                />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-10">
              <UserCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">No Students Found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || gradeFilter !== "All" || divisionFilter !== "All"
                  ? "No students match your search criteria."
                  : "No student profiles have been created yet."}
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
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
                    <TableCell>{student.grade}-{student.division}</TableCell>
                    <TableCell>{student.email || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/teacher/student-data/${student.uid}`}>
                          <Eye className="mr-2 h-4 w-4" /> View/Edit
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
