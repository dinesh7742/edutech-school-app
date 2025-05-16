"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle, Filter } from "lucide-react";
import type { StudentProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data - replace with actual data fetching from Firestore
const MOCK_STUDENTS: StudentProfile[] = [
  { uid: "student1", firstName: "Aarav", lastName: "Sharma", grade: "5", division: "A", email: "aarav.s@example.com", photoUrl: "https://placehold.co/40x40.png?text=AS", contactNumber: "9876543210" },
  { uid: "student2", firstName: "Priya", lastName: "Patel", grade: "5", division: "B", email: "priya.p@example.com", photoUrl: "https://placehold.co/40x40.png?text=PP", contactNumber: "9876543211" },
  { uid: "student3", firstName: "Rohan", lastName: "Singh", grade: "6", division: "A", email: "rohan.s@example.com", photoUrl: "https://placehold.co/40x40.png?text=RS", contactNumber: "9876543212" },
  { uid: "student4", firstName: "Sneha", lastName: "Verma", grade: "5", division: "A", email: "sneha.v@example.com", photoUrl: "https://placehold.co/40x40.png?text=SV", contactNumber: "9876543213" },
  { uid: "student5", firstName: "Vikram", lastName: "Kumar", grade: "6", division: "B", email: "vikram.k@example.com", photoUrl: "https://placehold.co/40x40.png?text=VK", contactNumber: "9876543214" },
];


export function StudentDataList() {
  const { user: teacherUser } = useAuth(); // Teacher's context
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch students based on teacher's assigned classes/grades
    // For now, use mock data and filter if teacher has grade/division info
    setLoading(true);
    // Simulating API call
    setTimeout(() => {
      let initialStudents = MOCK_STUDENTS;
      if (teacherUser?.grade && teacherUser?.division) {
        // This is a simplification. Teachers might teach multiple grades/divisions.
        // A real app would have a more complex mapping.
        // initialStudents = MOCK_STUDENTS.filter(s => s.grade === teacherUser.grade && s.division === teacherUser.division);
      } else if (teacherUser?.grade) {
        // initialStudents = MOCK_STUDENTS.filter(s => s.grade === teacherUser.grade);
      }
      setStudents(initialStudents);
      setFilteredStudents(initialStudents);
      setLoading(false);
    }, 1000);
  }, [teacherUser]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = students.filter(item => {
      return (
        item.firstName.toLowerCase().includes(lowercasedFilter) ||
        item.lastName.toLowerCase().includes(lowercasedFilter) ||
        item.email?.toLowerCase().includes(lowercasedFilter) ||
        `${item.grade}${item.division}`.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredStudents(filteredData);
  }, [searchTerm, students]);

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
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter Options</Button> {/* Placeholder for advanced filters */}
        </div>

        {filteredStudents.length === 0 && !loading ? (
          <div className="text-center py-10">
            <UserCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No Students Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? "Try adjusting your search or filter criteria." : "There are no students matching your current view."}
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
                      <AvatarImage src={student.photoUrl || `https://placehold.co/40x40.png?text=${student.firstName[0]}${student.lastName[0]}`} alt={`${student.firstName} ${student.lastName}`} data-ai-hint="profile avatar" />
                      <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.division}</TableCell>
                  <TableCell>{student.email}</TableCell>
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
