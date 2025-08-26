
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import type { StudentProfile, ProgressReport, SubjectMarks } from '@/types';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const examTypes = ["Unit Test 1", "Unit Test 2", "First Semester Exam", "Second Semester Exam"];
const academicYears = Array.from({ length: 5 }, (_, i) => `${new Date().getFullYear() - i}-${new Date().getFullYear() - i + 1}`);
const subjects = ["English", "Marathi", "EVS 1", "EVS 2", "Mathematics", "Physical Education", "Scout & Guide", "Art Education", "Work Experience"];

export function ProgressReportManager() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedExamType, setSelectedExamType] = useState(examTypes[0]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(academicYears[0]);
  
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<any[] | null>(null);

  useEffect(() => {
    if (teacherUser?.grade && teacherUser?.division) {
      const fetchStudents = async () => {
        setLoadingStudents(true);
        const profilesRef = collection(db, "studentProfiles");
        const q = query(
          profilesRef,
          where("grade", "==", teacherUser.grade),
          where("division", "==", teacherUser.division)
        );
        const querySnapshot = await getDocs(q);
        const fetchedStudents = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StudentProfile));
        setStudents(fetchedStudents);
        setLoadingStudents(false);
      };
      fetchStudents();
    } else {
        setLoadingStudents(false);
    }
  }, [teacherUser]);

  const handleDownloadTemplate = () => {
    if (students.length === 0) {
      toast({ title: "No Students Found", description: "Cannot generate template without students in your class.", variant: "destructive" });
      return;
    }
    setIsDownloading(true);
    
    const dataForExcel = students.map(student => {
      const row: { [key: string]: any } = {
        "PEN Number": student.penNumber || 'N/A',
        "Student Name": `${student.firstName} ${student.lastName || ''}`.trim(),
        "Student UID": student.uid,
      };
      subjects.forEach(subject => {
        row[`${subject} (Marks)`] = "";
        row[`${subject} (Grade)`] = "";
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Marks");

    XLSX.writeFile(workbook, `Marks_Template_Grade_${teacherUser?.grade}${teacherUser?.division}_${selectedExamType}.xlsx`);
    setIsDownloading(false);
    toast({ title: "Template Downloaded", description: "Please fill in the marks and grade, then upload the file." });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        setUploadedData(json);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadedData || !teacherUser) return;
    setIsUploading(true);

    try {
        const batch = writeBatch(db);
        const reportsCollectionRef = collection(db, "progressReports");

        uploadedData.forEach((row: any) => {
            const studentUid = row['Student UID'];
            if (!studentUid) {
                console.warn("Skipping row with missing Student UID:", row);
                return;
            }
            
            const reportId = `${studentUid}_${selectedAcademicYear}_${selectedExamType.replace(/\s+/g, '-')}`;
            const reportDocRef = doc(reportsCollectionRef, reportId);

            const subjectData: Record<string, SubjectMarks> = {};
            let totalMarks = 0;
            subjects.forEach(subject => {
                const marks = Number(row[`${subject} (Marks)`] || 0);
                const grade = row[`${subject} (Grade)`] || 'N/A';
                subjectData[subject] = { marks, grade };
                totalMarks += marks;
            });

            const percentage = (totalMarks / (subjects.length * 100)) * 100; // Assuming each subject is out of 100

            const reportData: Omit<ProgressReport, 'id'> = {
                studentUid: studentUid,
                penNumber: row['PEN Number'],
                grade: teacherUser.grade!,
                division: teacherUser.division!,
                academicYear: selectedAcademicYear,
                examType: selectedExamType,
                subjects: subjectData,
                totalMarks: totalMarks,
                percentage: percentage,
                finalGrade: 'N/A', // You can implement a grading logic here
                postedByUid: teacherUser.uid,
                postedByName: teacherUser.displayName || 'Teacher',
                createdAt: serverTimestamp(),
            };
            batch.set(reportDocRef, reportData, { merge: true });
        });

        await batch.commit();
        toast({ title: "Success", description: `${uploadedData.length} progress reports have been uploaded successfully.` });
        setUploadedData(null);
        setUploadedFileName(null);
    } catch (error) {
        console.error("Error uploading reports:", error);
        toast({ title: "Upload Failed", description: "An error occurred while uploading the reports.", variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3"><Download className="h-6 w-6"/>Download Marks Template</CardTitle>
          <CardDescription>Select the exam type and academic year, then download the pre-filled Excel template for your class.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
              <Label htmlFor="academicYear">Academic Year</Label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleDownloadTemplate} disabled={isDownloading || loadingStudents}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
            Download Template for Grade {teacherUser?.grade}{teacherUser?.division}
          </Button>
          {loadingStudents && <p className="text-sm text-muted-foreground">Loading student list...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3"><Upload className="h-6 w-6"/>Upload Completed Marks File</CardTitle>
          <CardDescription>Upload the filled Excel file here. The system will create a progress report for each student.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="upload-file" className="block text-sm font-medium text-gray-700">
            Upload File
          </Label>
          <Input id="upload-file" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          {uploadedFileName && <p className="text-sm text-muted-foreground">Selected file: {uploadedFileName}</p>}

          {uploadedData && (
            <div className="mt-4">
              <h3 className="font-semibold">Preview Data</h3>
              <div className="overflow-x-auto rounded-md border max-h-60 mt-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PEN No</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>English Marks</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {uploadedData.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row['PEN Number']}</TableCell>
                                <TableCell>{row['Student Name']}</TableCell>
                                <TableCell>{row['English (Marks)']}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
              {uploadedData.length > 5 && <p className="text-xs text-muted-foreground text-center mt-1">Showing first 5 of {uploadedData.length} records...</p>}
              <Button onClick={handleConfirmUpload} disabled={isUploading} className="mt-4">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                Confirm and Upload {uploadedData.length} Records
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
