
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Download } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { StudentProfile } from '@/types';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

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
          if (student.grade && student.division) {
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
          }
        });
        
        setClassStats(stats);
      } catch (error) {
        console.error("Error fetching student counts: ", error);
        toast({ title: "Error", description: "Could not fetch class summary data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentCounts();
  }, [toast]);

  const handleDownloadSummary = () => {
    setIsDownloading(true);
    try {
      const dataForExcel = grades.map(grade => {
        const row: { [key: string]: string | number } = { Grade: `Grade ${grade}` };
        let gradeTotal = 0;
        let gradeBoys = 0;
        let gradeGirls = 0;

        divisions.forEach(division => {
          const classKey = `${grade}-${division}`;
          const stats = classStats[classKey] || { boys: 0, girls: 0, total: 0 };
          row[`Div ${division} (Total)`] = stats.total;
          row[`Div ${division} (Boys)`] = stats.boys;
          row[`Div ${division} (Girls)`] = stats.girls;
          gradeTotal += stats.total;
          gradeBoys += stats.boys;
          gradeGirls += stats.girls;
        });

        row['Grade Total'] = gradeTotal;
        row['Grade Boys'] = gradeBoys;
        row['Grade Girls'] = gradeGirls;

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Class Summary");
      
      // Auto-size columns
      const cols = Object.keys(dataForExcel[0]).map(key => ({
        wch: Math.max(key.length, 10) // Set a minimum width for each column
      }));
      worksheet["!cols"] = cols;

      XLSX.writeFile(workbook, "Class_Summary_Report.xlsx");
      
      toast({ title: "Download Started", description: "Your class summary report is being downloaded." });
    } catch (error) {
      console.error("Error generating Excel file:", error);
      toast({ title: "Download Failed", description: "Could not generate the Excel file.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="shadow-xl">
      <CardHeader className="flex-row justify-between items-center">
        <div>
          <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
            <Users className="h-8 w-8" />
            Manage Users - Class Summary
          </CardTitle>
          <CardDescription>
            Download a summary of student counts for each class or click on a class link below to manage students.
          </CardDescription>
        </div>
        <Button onClick={handleDownloadSummary} disabled={loading || isDownloading}>
          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
          Download Class Summary
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading class data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">Click any class link to view the list of students for that specific class.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {grades.map(grade => (
                <div key={grade} className="space-y-2">
                  <h3 className="font-bold text-lg border-b pb-1">Grade {grade}</h3>
                  <div className="flex flex-col space-y-1">
                  {divisions.map(division => (
                    <Link key={`${grade}-${division}`} href={`/admin/manage-users/${grade}/${division}`} className="text-sm p-1 rounded hover:bg-muted">
                        Division {division}
                    </Link>
                  ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
