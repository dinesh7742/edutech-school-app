
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Download, Eye, User, UserCheck, UserX } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { StudentProfile } from '@/types';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClassStats {
  boys: number;
  girls: number;
  other: number; // For transgender or 'other' gender
  total: number;
}

const grades = Array.from({ length: 8 }, (_, i) => (i + 1).toString());
const divisions = Array.from({ length: 6 }, (_, i) => String.fromCharCode(65 + i));

export default function ManageUsersPage() {
  const [classStats, setClassStats] = useState<Record<string, ClassStats>>({});
  const [gradeStats, setGradeStats] = useState<Record<string, ClassStats>>({});
  const [totalStats, setTotalStats] = useState<ClassStats>({ boys: 0, girls: 0, other: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStudentCounts = async () => {
      setLoading(true);
      try {
        const studentProfilesRef = collection(db, "studentProfiles");
        const studentQuery = query(studentProfilesRef);
        const querySnapshot = await getDocs(studentQuery);
        
        const stats: Record<string, ClassStats> = {};
        const gradeAggregates: Record<string, ClassStats> = {};
        let schoolTotal: ClassStats = { boys: 0, girls: 0, other: 0, total: 0 };
        
        grades.forEach(g => {
            gradeAggregates[g] = { boys: 0, girls: 0, other: 0, total: 0 };
        });

        querySnapshot.forEach(doc => {
          const student = doc.data() as StudentProfile;
          if (student.grade && student.division) {
            const classKey = `${student.grade}-${student.division}`;
            if (!stats[classKey]) {
              stats[classKey] = { boys: 0, girls: 0, other: 0, total: 0 };
            }
            stats[classKey].total++;
            schoolTotal.total++;

            if (student.gender === 'Male') {
              stats[classKey].boys++;
              gradeAggregates[student.grade].boys++;
              schoolTotal.boys++;
            } else if (student.gender === 'Female') {
              stats[classKey].girls++;
              gradeAggregates[student.grade].girls++;
              schoolTotal.girls++;
            } else {
               stats[classKey].other++;
               gradeAggregates[student.grade].other++;
               schoolTotal.other++;
            }
            gradeAggregates[student.grade].total++;
          }
        });
        
        setClassStats(stats);
        setGradeStats(gradeAggregates);
        setTotalStats(schoolTotal);
      } catch (error) {
        console.error("Error fetching student counts: ", error);
        toast({ title: "Error", description: "Could not fetch class summary data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentCounts();
  }, [toast]);

  if (loading) {
     return (
        <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading class summary...</p>
        </div>
     )
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
            <Users className="h-8 w-8" />
            School Details - Grade Wise ({new Date().getFullYear()}-{(new Date().getFullYear() + 1).toString().slice(-2)})
          </CardTitle>
      </CardHeader>
      <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"><Users className="h-4 w-4"/> Total Enrolments</p>
                    <p className="text-2xl font-bold">{totalStats.total}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"><User className="h-4 w-4"/>Total Boys</p>
                    <p className="text-2xl font-bold">{totalStats.boys}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"><UserCheck className="h-4 w-4"/>Total Girls</p>
                    <p className="text-2xl font-bold">{totalStats.girls}</p>
                </div>
                 <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"><UserX className="h-4 w-4"/>Total Transgender</p>
                    <p className="text-2xl font-bold">{totalStats.other}</p>
                </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/20">
                  <TableHead className="font-bold">Class/Grade</TableHead>
                  <TableHead className="font-bold">Section (Alias)</TableHead>
                  <TableHead className="font-bold text-center">Boys</TableHead>
                  <TableHead className="font-bold text-center">Girls</TableHead>
                  <TableHead className="font-bold text-center">Transgender</TableHead>
                  <TableHead className="font-bold text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(grade => (
                  <TableRow key={grade}>
                    <TableCell className="font-semibold">Grade {grade}</TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {divisions.map(division => {
                                const classKey = `${grade}-${division}`;
                                const total = classStats[classKey]?.total || 0;
                                return total > 0 ? (
                                     <Link href={`/admin/manage-users/${grade}/${division}`} key={classKey} className="text-sm hover:underline p-1 rounded bg-muted/50">
                                        {division}
                                     </Link>
                                ) : null;
                            })}
                        </div>
                    </TableCell>
                    <TableCell className="text-center">{gradeStats[grade]?.boys || 0}</TableCell>
                    <TableCell className="text-center">{gradeStats[grade]?.girls || 0}</TableCell>
                    <TableCell className="text-center">{gradeStats[grade]?.other || 0}</TableCell>
                    <TableCell className="text-center font-bold">{gradeStats[grade]?.total || 0}</TableCell>
                  </TableRow>
                ))}
                 <TableRow className="bg-primary/20 hover:bg-primary/20 font-bold">
                    <TableCell colSpan={2} className="text-right">Grand Total</TableCell>
                    <TableCell className="text-center text-lg">{totalStats.boys}</TableCell>
                    <TableCell className="text-center text-lg">{totalStats.girls}</TableCell>
                    <TableCell className="text-center text-lg">{totalStats.other}</TableCell>
                    <TableCell className="text-center text-lg">{totalStats.total}</TableCell>
                 </TableRow>
              </TableBody>
            </Table>
          </div>
      </CardContent>
    </Card>
  );
}
