
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { StudentProfile } from '@/types';

interface ClassStats {
  boys: number;
  girls: number;
  total: number;
}

const grades = Array.from({ length: 8 }, (_, i) => (i + 1).toString());
const divisions = Array.from({ length: 6 }, (_, i) => String.fromCharCode(65 + i)); // A to F

export default function ManageUsersPage() {
  const [classStats, setClassStats] = useState<Record<string, ClassStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentCounts = async () => {
      setLoading(true);
      try {
        const studentProfilesRef = collection(db, "studentProfiles");
        const studentQuery = query(studentProfilesRef);
        const querySnapshot = await getDocs(studentQuery);
        
        const stats: Record<string, ClassStats> = {};
        
        querySnapshot.forEach(doc => {
          const student = doc.data() as StudentProfile;
          const classKey = `${student.grade}-${student.division}`;
          if (!stats[classKey]) {
            stats[classKey] = { boys: 0, girls: 0, total: 0 };
          }
          stats[classKey].total++;
          if (student.gender === 'Male') {
            stats[classKey].boys++;
          } else if (student.gender === 'Female') {
            stats[classKey].girls++;
          }
        });
        
        setClassStats(stats);
      } catch (error) {
        console.error("Error fetching student counts: ", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentCounts();
  }, []);

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
          <Users className="h-8 w-8" />
          Manage Users - Class Summary
        </CardTitle>
        <CardDescription>
          View student counts for each class. Click on a class to view and manage its students.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading class data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Grade</TableHead>
                  {divisions.map(division => (
                    <TableHead key={division} className="text-center font-bold">Division {division}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(grade => (
                  <TableRow key={grade}>
                    <TableCell className="font-semibold">Grade {grade}</TableCell>
                    {divisions.map(division => {
                      const classKey = `${grade}-${division}`;
                      const stats = classStats[classKey] || { boys: 0, girls: 0, total: 0 };
                      return (
                        <TableCell key={classKey} className="text-center">
                          <Link href={`/admin/manage-users/${grade}/${division}`} className="block p-2 rounded-md hover:bg-muted transition-colors">
                            <p className="font-bold text-lg">{stats.total}</p>
                            <p className="text-xs text-muted-foreground">
                              {stats.boys}B / {stats.girls}G
                            </p>
                          </Link>
                        </TableCell>
                      );
                    })}
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
