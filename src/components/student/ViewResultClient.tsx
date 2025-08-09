
"use client";

import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { StudentProfile, ProgressReport } from '@/types';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Search, School, User, Calendar, MapPin, Phone, Hash } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const schoolInfo = {
  name: "PM SHRI MPS VARSHA NAGAR",
  address: "Vikhroli West, Mumbai - 79",
  logoUrl: "https://i.postimg.cc/vmz54c6T/1.png" 
};

const examTypes = ["Unit Test 1", "Unit Test 2", "First Semester Exam", "Second Semester Exam"];
const academicYears = Array.from({ length: 5 }, (_, i) => `${new Date().getFullYear() - i}-${new Date().getFullYear() - i + 1}`);

const ReportCardToDownload = ({ report, studentProfile }: { report: ProgressReport, studentProfile: StudentProfile | null }) => {
  return (
    <div className="p-8 font-sans text-gray-800 bg-white" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'serif' }}>
        <div className="text-center mb-6 border-b-4 border-primary pb-4">
            <Image src={schoolInfo.logoUrl} alt="School Logo" width={90} height={90} className="mx-auto mb-2" />
            <h1 className="text-4xl font-extrabold text-primary tracking-wider">{schoolInfo.name}</h1>
            <p className="text-md text-muted-foreground">{schoolInfo.address}</p>
        </div>
        <h2 className="text-center text-3xl font-bold mb-4 text-secondary underline decoration-wavy">PROGRESS REPORT</h2>
        <p className="text-center text-xl mb-8 font-medium">Academic Year: {report.academicYear}</p>

        <Card className="mb-8 shadow-md border-primary/50">
            <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 text-lg">
                <p><span className="font-semibold">Student Name:</span> {studentProfile?.firstName} {studentProfile?.lastName || ''}</p>
                <p><span className="font-semibold">Grade:</span> {report.grade}-{report.division}</p>
                <p><span className="font-semibold">PEN No:</span> {studentProfile?.penNumber || 'N/A'}</p>
                <p><span className="font-semibold">G.R. No:</span> {studentProfile?.grNumber || 'N/A'}</p>
                <p><span className="font-semibold">Date of Birth:</span> {studentProfile?.dateOfBirth || 'N/A'}</p>
                <p><span className="font-semibold">Mother's Name:</span> {studentProfile?.motherName || 'N/A'}</p>
            </CardContent>
        </Card>

        <h3 className="text-2xl font-semibold mb-4 text-primary">Exam: {report.examType}</h3>
        <Table className="border">
            <TableHeader>
                <TableRow>
                    <TableHead className="font-bold text-lg">Subject</TableHead>
                    <TableHead className="font-bold text-lg text-center">Marks</TableHead>
                    <TableHead className="font-bold text-lg text-center">Grade</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(report.subjects).map(([subject, data]) => (
                    <TableRow key={subject}>
                        <TableCell className="font-medium text-md">{subject}</TableCell>
                        <TableCell className="text-center text-md">{data.marks}</TableCell>
                        <TableCell className="text-center text-md">{data.grade}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

        <Card className="mt-8 bg-muted/30 border-primary/50">
          <CardHeader><CardTitle>Overall Performance</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-xl">
             <p><span className="font-semibold">Total Marks:</span> {report.totalMarks}</p>
             <p><span className="font-semibold">Percentage:</span> {report.percentage.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
            <p className="text-6xl font-black tracking-widest text-green-600 uppercase" style={{ WebkitTextStroke: '2px black', textShadow: '3px 3px 5px rgba(0,0,0,0.3)'}}>
                PASSED
            </p>
        </div>
      
        <div className="mt-24 pt-8 text-md flex justify-between border-t-2 border-dashed">
            <p className="font-semibold">Class Teacher's Signature</p>
            <p className="font-semibold">Principal's Signature</p>
        </div>
    </div>
  );
};

export function ViewResultClient() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [penNumber, setPenNumber] = useState("");
  const [selectedExamType, setSelectedExamType] = useState(examTypes[0]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);
  
  const handleViewResult = async () => {
    if (!penNumber) {
      toast({ title: "PEN Number Required", description: "Please enter your PEN number.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setReport(null);
    setStudentProfile(null);

    try {
      const profilesCollectionRef = collection(db, "studentProfiles");
      const profileQuery = query(profilesCollectionRef, where("penNumber", "==", penNumber));
      const profileSnapshot = await getDocs(profileQuery);

      if (profileSnapshot.empty) {
        toast({ title: "Student Not Found", description: "No student found with that PEN number.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      const studentDoc = profileSnapshot.docs[0];
      const studentData = { uid: studentDoc.id, ...studentDoc.data() } as StudentProfile;
      setStudentProfile(studentData);
      
      const reportId = `${studentData.uid}_${selectedAcademicYear}_${selectedExamType.replace(/\s+/g, '-')}`;
      const reportDocRef = doc(db, "progressReports", reportId);
      const reportDocSnap = await getDoc(reportDocRef);

      if (reportDocSnap.exists()) {
        setReport({ id: reportDocSnap.id, ...reportDocSnap.data() } as ProgressReport);
      } else {
        toast({ title: "Result Not Found", description: "No result has been uploaded for this exam and academic year.", variant: "destructive" });
      }

    } catch (error) {
      console.error("Error fetching result:", error);
      toast({ title: "Error", description: "An error occurred while fetching the result.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Progress_Report_${studentProfile?.firstName}_${report?.examType}.pdf`);
    } catch (err) {
        console.error("Error generating PDF:", err);
        toast({ title: "Download Failed", description: "Could not generate PDF.", variant: "destructive" });
    } finally {
        setIsDownloading(false);
    }
  };


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Find Your Report Card</CardTitle>
          <CardDescription>Select academic year, exam type, and enter your PEN number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className='flex-1'>
              <Label htmlFor="academicYear">Academic Year</Label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='flex-1'>
              <Label htmlFor="examType">Exam Type</Label>
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {examTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className='flex-1'>
              <Label htmlFor="penNumber">PEN Number</Label>
              <Input 
                id="penNumber" 
                value={penNumber}
                onChange={(e) => setPenNumber(e.target.value)}
                placeholder="Enter your PEN no."
              />
            </div>
          </div>
          <Button onClick={handleViewResult} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />}
            View Result
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {report && studentProfile && (
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle>Your Progress Report</CardTitle>
                    <CardDescription>Details for {report.examType} - {report.academicYear}</CardDescription>
                </div>
                <Button onClick={handleDownload} disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    Download as PDF
                </Button>
            </CardHeader>
            <CardContent>
               <div className="border rounded-lg p-4 overflow-auto">
                    <ReportCardToDownload report={report} studentProfile={studentProfile} />
               </div>
               <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
                    <div ref={reportRef}>
                        <ReportCardToDownload report={report} studentProfile={studentProfile} />
                    </div>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
