
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle, Filter, Loader2 } from "lucide-react";
import type { StudentProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";

export function StudentDataList() {
  const { user: teacherUser } = useAuth(); // Teacher's context
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const profilesCollectionRef = collection(db, "studentProfiles");
        // TODO: Implement filtering based on teacher's assigned classes/grades in a real scenario.
        // For now, fetching all profiles and ordering by grade, then division, then firstName.
        const q = query(profilesCollectionRef, orderBy("grade"), orderBy("division"), orderBy("firstName"));
        const querySnapshot = await getDocs(q);
        
        const fetchedProfiles: StudentProfile[] = querySnapshot.docs.map(doc => {
          return {
            uid: doc.id, // Use doc.id as uid for the profile
            ...doc.data()
          } as StudentProfile;
        });
        
        setStudents(fetchedProfiles);
        setFilteredStudents(fetchedProfiles);
      } catch (err: any) {
        console.error("Error fetching student profiles:", err);
        setError("Failed to load student data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if teacherUser is loaded (though we don't use teacherUser for filtering yet)
    if (teacherUser) {
      fetchStudentProfiles();
    } else {
      // If teacherUser is not yet available (e.g. initial load), wait for AuthContext.
      // This prevents fetching before auth state is clear.
      // Alternatively, if teacherUser might be null for an extended period, handle accordingly.
      // For now, assuming teacherUser will be available once auth is settled.
      // setLoading(false); // Or keep loading until teacherUser is confirmed.
    }
  }, [teacherUser]); // Re-fetch if teacherUser changes (e.g. for future filtering logic)

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = students.filter(item => {
      const fullName = `${item.firstName.toLowerCase()} ${item.lastName ? item.lastName.toLowerCase() : ''}`;
      return (
        fullName.includes(lowercasedFilter) ||
        item.firstName.toLowerCase().includes(lowercasedFilter) ||
        (item.lastName && item.lastName.toLowerCase().includes(lowercasedFilter)) ||
        item.email?.toLowerCase().includes(lowercasedFilter) ||
        `${item.grade}${item.division}`.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredStudents(filteredData);
  }, [searchTerm, students]);

  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : "";
    const lastInitial = lastName ? lastName[0] : "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "??";
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
              The console might have more details (e.g. missing Firestore indexes for sorting).
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Student Data</CardTitle>
        <CardDescription>View and manage student profiles. Click on a student to see full details.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center gap-4">
          <Input
            placeholder="Search students (Name, Email, Grade/Div)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {/* Placeholder for advanced filters - can be implemented later */}
          {/* <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter Options</Button>  */}
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-10">
            <UserCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No Students Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? "Try adjusting your search or filter criteria." : "No student profiles available, or none match your current view."}
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Division</TableHead>
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
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.division}</TableCell>
                  <TableCell>{student.email || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/teacher/student-data/${student.uid}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
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
