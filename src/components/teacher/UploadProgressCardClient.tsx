
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Upload, FileCheck2, Info } from "lucide-react";
import { setProgressCardData, getProgressCardData } from "@/lib/progressCardStore";

const studentDetailHeaders = [
  "RollNo", "Name", "MotherName", "FatherName", "DOB(YYYY-MM-DD)", "GRNo",
];

const subjectHeaders = (prefix: string) => [
  `${prefix}_FirstLanguage_FA1`, `${prefix}_FirstLanguage_FA2`, `${prefix}_FirstLanguage_SA1`, `${prefix}_FirstLanguage_Total`, `${prefix}_FirstLanguage_Grade`,
  `${prefix}_SecondLanguage_FA1`, `${prefix}_SecondLanguage_FA2`, `${prefix}_SecondLanguage_SA1`, `${prefix}_SecondLanguage_Total`, `${prefix}_SecondLanguage_Grade`,
  `${prefix}_ThirdLanguage_FA1`, `${prefix}_ThirdLanguage_FA2`, `${prefix}_ThirdLanguage_SA1`, `${prefix}_ThirdLanguage_Total`, `${prefix}_ThirdLanguage_Grade`,
  `${prefix}_Math_FA1`, `${prefix}_Math_FA2`, `${prefix}_Math_SA1`, `${prefix}_Math_Total`, `${prefix}_Math_Grade`,
  `${prefix}_EVS_FA1`, `${prefix}_EVS_FA2`, `${prefix}_EVS_SA1`, `${prefix}_EVS_Total`, `${prefix}_EVS_Grade`,
];

const coScholasticHeaders = (prefix: string) => [
  `${prefix}_Scout_Grade`,
  `${prefix}_Art_Grade`,
  `${prefix}_WorkExperience_Grade`,
  `${prefix}_PhysicalEdHealth_Grade`,
];

const term1Headers = [
  "Term1_Attendance",
  ...subjectHeaders("Term1"),
  ...coScholasticHeaders("Term1"),
  "Term1_TeacherRemarks",
];

const term2Headers = [
  "Term2_Attendance",
  ...subjectHeaders("Term2"),
  ...coScholasticHeaders("Term2"),
  "Term2_TeacherRemarks",
];


export function UploadProgressCardClient() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [processedFile, setProcessedFile] = useState<{name: string, count: number} | null>(null);

  const handleDownloadTemplate = (term: 1 | 2) => {
    const headers = term === 1 ? [...studentDetailHeaders, ...term1Headers] : [...studentDetailHeaders, ...term2Headers];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Term_${term}_Template`);
    XLSX.writeFile(wb, `Progress_Card_Template_Term${term}_Grade_${teacherUser?.grade}${teacherUser?.division}.xlsx`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setProcessedFile(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); // Use defval to handle empty cells gracefully
        
        if (json.length === 0) {
            toast({ title: "Error", description: "The uploaded Excel file is empty.", variant: "destructive" });
            setIsUploading(false);
            return;
        }
        
        const uploadedHeaders = Object.keys(json[0] as any);
        const isTerm1File = uploadedHeaders.includes("Term1_Attendance");
        const isTerm2File = uploadedHeaders.includes("Term2_Attendance");

        if (!isTerm1File && !isTerm2File) {
            toast({ title: "Invalid File", description: "Could not determine if this is a Term 1 or Term 2 file. Please use the downloaded template.", variant: "destructive" });
            setIsUploading(false);
            return;
        }

        processAndStoreData(json, isTerm1File ? 1 : 2);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({ title: "Error", description: "Could not process the Excel file. Make sure it is a valid .xlsx file.", variant: "destructive" });
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const processAndStoreData = (jsonData: any[], term: 1 | 2) => {
    const existingData = getProgressCardData();
    const updatedData = { ...existingData };

    jsonData.forEach(row => {
        const rollNo = row.RollNo;
        if (!rollNo) return; 

        // Initialize student entry if it doesn't exist
        if (!updatedData[rollNo]) {
            updatedData[rollNo] = { studentDetails: {}, term1: { scholastic: [], coScholastic: [] }, term2: { scholastic: [], coScholastic: [] } };
        }
        
        const student = updatedData[rollNo];

        // Update student details (common to both templates)
        student.studentDetails = {
            ...student.studentDetails, // Preserve existing details
            name: row.Name,
            rollNo: row.RollNo,
            grade: teacherUser?.grade,
            division: teacherUser?.division,
            motherName: row.MotherName,
            fatherName: row.FatherName,
            dob: row["DOB(YYYY-MM-DD)"],
            grNo: row.GRNo,
            attendance: {
              ...student.studentDetails.attendance,
              [`term${term}`]: row[`Term${term}_Attendance`],
            },
        };

        const prefix = `Term${term}`;
        // Update term-specific data
        student[`term${term}`] = {
            scholastic: [
                { subject: "First Language", fa1: row[`${prefix}_FirstLanguage_FA1`], fa2: row[`${prefix}_FirstLanguage_FA2`], sa1: row[`${prefix}_FirstLanguage_SA1`], total: row[`${prefix}_FirstLanguage_Total`], grade: row[`${prefix}_FirstLanguage_Grade`] },
                { subject: "Second Language", fa1: row[`${prefix}_SecondLanguage_FA1`], fa2: row[`${prefix}_SecondLanguage_FA2`], sa1: row[`${prefix}_SecondLanguage_SA1`], total: row[`${prefix}_SecondLanguage_Total`], grade: row[`${prefix}_SecondLanguage_Grade`] },
                { subject: "Third Language", fa1: row[`${prefix}_ThirdLanguage_FA1`], fa2: row[`${prefix}_ThirdLanguage_FA2`], sa1: row[`${prefix}_ThirdLanguage_SA1`], total: row[`${prefix}_ThirdLanguage_Total`], grade: row[`${prefix}_ThirdLanguage_Grade`] },
                { subject: "Mathematics", fa1: row[`${prefix}_Math_FA1`], fa2: row[`${prefix}_Math_FA2`], sa1: row[`${prefix}_Math_SA1`], total: row[`${prefix}_Math_Total`], grade: row[`${prefix}_Math_Grade`] },
                { subject: "E.V.S", fa1: row[`${prefix}_EVS_FA1`], fa2: row[`${prefix}_EVS_FA2`], sa1: row[`${prefix}_EVS_SA1`], total: row[`${prefix}_EVS_Total`], grade: row[`${prefix}_EVS_Grade`] },
            ],
            coScholastic: [
                { area: "Scout", grade: row[`${prefix}_Scout_Grade`] },
                { area: "Art", grade: row[`${prefix}_Art_Grade`] },
                { area: "Work Experience", grade: row[`${prefix}_WorkExperience_Grade`] },
                { area: "Physical Education & Health", grade: row[`${prefix}_PhysicalEdHealth_Grade`] },
            ],
            teacherRemarks: row[`${prefix}_TeacherRemarks`],
        };
    });
    
    setProgressCardData(updatedData);
    setProcessedFile({name: fileName, count: jsonData.length });
    setIsUploading(false);

    toast({
        title: "Upload Successful!",
        description: `Successfully processed and merged Term ${term} data for ${jsonData.length} students.`,
        duration: 8000,
    });
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Manage Progress Cards</CardTitle>
        <CardDescription>
          Upload student marks via an Excel file to automatically generate progress cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex">
                <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        This feature uses a temporary in-browser storage. Uploaded marks data will be available until the browser tab is closed. For persistent storage, a database integration is required.
                    </p>
                </div>
            </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 1: Download Template</h3>
          <p className="text-sm text-muted-foreground">
            Download the Excel template for the specific term you want to update. Do not change the column headers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => handleDownloadTemplate(1)} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download Term 1 Template
            </Button>
            <Button onClick={() => handleDownloadTemplate(2)} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download Term 2 Template
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 2: Upload Filled File</h3>
          <p className="text-sm text-muted-foreground">
            Once you have filled a template, upload the .xlsx file here. The system will automatically detect the term and merge the data.
          </p>
          <div className="flex items-center gap-4">
            <Label htmlFor="upload-excel" className="sr-only">Upload Excel File</Label>
            <Input
              id="upload-excel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {isUploading && <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
          {processedFile && !isUploading && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 text-green-700 border border-green-200">
                <FileCheck2 className="h-5 w-5" />
                <p className="text-sm font-medium">Successfully processed: {processedFile.name} ({processedFile.count} students)</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
