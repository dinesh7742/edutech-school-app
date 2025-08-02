
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle, Trash2, Loader2 } from "lucide-react";
import type { StudentProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, doc, deleteDoc, where } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";

export function StudentDataList() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Store UID of student being deleted

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

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!studentId) return;
    setIsDeleting(studentId);
    try {
      // This function only deletes Firestore data, not the authentication account.
      // This is a client-side limitation. Full user deletion requires a backend function.
      const studentProfileDocRef = doc(db, "studentProfiles", studentId);
      await deleteDoc(studentProfileDocRef);

      const userDocRef = doc(db, "users", studentId);
      await deleteDoc(userDocRef);

      setStudents(prevStudents => prevStudents.filter(student => student.uid !== studentId));
      setFilteredStudents(prevFiltered => prevFiltered.filter(student => student.uid !== studentId));
      
      toast({
        title: "Student Data Deleted",
        description: `All database records for ${studentName} have been removed. Their login account still exists.`,
        duration: 7000,
      });
    } catch (error: any) {
      console.error("Error deleting student data:", error);
      toast({
        title: "Error Deleting Student Data",
        description: `Could not remove ${studentName}'s data. ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
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
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Student Data for Grade {teacherUser?.grade}-{teacherUser?.division}</CardTitle>
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
              {searchTerm ? "No students match your search." : "No student profiles have been created for your class yet."}
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDeleting === student.uid}>
                          {isDeleting === student.uid ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all of the student's data records (profile, etc.) from the database.
                            <br/><br/>
                            <strong className="text-destructive">IMPORTANT:</strong> This action <strong className="underline">cannot</strong> delete the user's login account. They will NOT be able to sign up again with the same credentials. Full user deletion requires administrative action on the backend.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteStudent(student.uid, `${student.firstName} ${student.lastName || ''}`)}
                            className={isDeleting === student.uid ? "bg-destructive/80" : "bg-destructive hover:bg-destructive/90"}
                          >
                            {isDeleting === student.uid ? "Deleting..." : "Yes, delete student data"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
