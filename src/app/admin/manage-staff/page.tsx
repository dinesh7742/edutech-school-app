
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, where, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { AppUser, Staff } from "@/types";

type CombinedStaff = (AppUser | Staff) & {
  type: 'Teaching' | 'Non-Teaching';
};

export default function ManageStaffPage() {
  const { toast } = useToast();
  const [allStaff, setAllStaff] = useState<CombinedStaff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<CombinedStaff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaffData = async () => {
      setLoading(true);
      setError(null);
      try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
        const nonTeachingQuery = query(collection(db, "staff"));

        const [teachersSnapshot, nonTeachingSnapshot] = await Promise.all([
          getDocs(teachersQuery),
          getDocs(nonTeachingQuery),
        ]);

        const teachingStaff: CombinedStaff[] = teachersSnapshot.docs.map(doc => ({
          ...(doc.data() as AppUser),
          uid: doc.id,
          type: 'Teaching',
        }));

        const nonTeachingStaff: CombinedStaff[] = nonTeachingSnapshot.docs.map(doc => ({
          ...(doc.data() as Staff),
          uid: doc.id,
          type: 'Non-Teaching',
        }));

        const combinedList = [...teachingStaff, ...nonTeachingStaff];
        setAllStaff(combinedList);
        setFilteredStaff(combinedList);
      } catch (err: any) {
        console.error("Error fetching staff data:", err);
        setError("Failed to load staff data. Please try again later.");
        toast({ title: "Error", description: "Could not fetch staff list.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchStaffData();
  }, [toast]);
  
  useEffect(() => {
    let tempStaff = allStaff;
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        tempStaff = tempStaff.filter(item => {
            const name = 'displayName' in item ? item.displayName : item.name;
            return name?.toLowerCase().includes(lowercasedFilter);
        });
    }
    setFilteredStaff(tempStaff);
  }, [searchTerm, allStaff]);


  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };
  
  const formatDate = (date: any) => {
    if (!date) return "N/A";
    if (date instanceof Timestamp) {
      return format(date.toDate(), "dd MMM yyyy");
    }
    if (typeof date === 'string') {
      try {
        return format(new Date(date), "dd MMM yyyy");
      } catch (e) {
        return date;
      }
    }
    return "Invalid Date";
  };


  if (loading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Loading Staff Data...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
          <Users className="h-8 w-8" />
          Manage Staff ({allStaff.length})
        </CardTitle>
        <CardDescription>View all teaching and non-teaching staff members.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                  placeholder="Search by employee name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 max-w-sm"
                />
            </div>
          </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Sr.No</TableHead>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Appointment Date</TableHead>
                <TableHead>Assigned Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff, index) => {
                const name = 'displayName' in staff ? staff.displayName : staff.name;
                const role = staff.type === 'Teaching' ? 'Teacher' : staff.role;
                const appointmentDate = 'createdAt' in staff ? staff.createdAt : ('joiningDate' in staff ? staff.joiningDate : undefined);
                const photoUrl = 'photoURL' in staff ? staff.photoURL : undefined;
                const grade = 'grade' in staff ? staff.grade : undefined;
                const division = 'division' in staff ? staff.division : undefined;

                return (
                  <TableRow key={staff.uid}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={photoUrl || undefined} alt={name || ""} />
                        <AvatarFallback>{getInitials(name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{role}</TableCell>
                    <TableCell>{formatDate(appointmentDate)}</TableCell>
                    <TableCell>{grade && division ? `${grade}-${division}` : "N/A"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filteredStaff.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No staff members found matching your search.</p>
        )}
      </CardContent>
    </Card>
  );
}
