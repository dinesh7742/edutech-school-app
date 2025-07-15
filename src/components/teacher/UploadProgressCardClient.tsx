
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

// Define the structure of the Excel template
const templateHeaders = [
  // Student Details
  "RollNo", "Name", "MotherName", "FatherName", "DOB(YYYY-MM-DD)", "GRNo", 
  "Term1_Attendance", "Term2_Attendance",
  // Term 1 Scholastic
  "Term1_English_FA1", "Term1_English_FA2", "Term1_English_SA1", "Term1_English_Total", "Term1_English_Grade",
  "Term1_Marathi_FA1", "Term1_Marathi_FA2", "Term1_Marathi_SA1", "Term1_Marathi_Total", "Term1_Marathi_Grade",
  "Term1_Hindi_FA1", "Term1_Hindi_FA2", "Term1_Hindi_SA1", "Term1_Hindi_Total", "Term1_Hindi_Grade",
  "Term1_Math_FA1", "Term1_Math_FA2", "Term1_Math_SA1", "Term1_Math_Total", "Term1_Math_Grade",
  "Term1_EVS_FA1", "Term1_EVS_FA2", "Term1_EVS_SA1", "Term1_EVS_Total", "Term1_EVS_Grade",
  // Term 1 Co-Scholastic
  "Term1_WorkEd_Grade", "Term1_ArtEd_Grade", "Term1_HealthPhyEd_Grade",
  "Term1_TeacherRemarks",
  // Term 2 Scholastic
  "Term2_English_FA1", "Term2_English_FA2", "Term2_English_SA1", "Term2_English_Total", "Term2_English_Grade",
  "Term2_Marathi_FA1", "Term2_Marathi_FA2", "Term2_Marathi_SA1", "Term2_Marathi_Total", "Term2_Marathi_Grade",
  "Term2_Hindi_FA1", "Term2_Hindi_FA2", "Term2_Hindi_SA1", "Term2_Hindi_Total", "Term2_Hindi_Grade",
  "Term2_Math_FA1", "Term2_Math_FA2", "Term2_Math_SA1", "Term2_Math_Total", "Term2_Math_Grade",
  "Term2_EVS_FA1", "Term2_EVS_FA2", "Term2_EVS_SA1", "Term2_EVS_Total", "Term2_EVS_Grade",
  // Term 2 Co-Scholastic
  "Term2_WorkEd_Grade", "Term2_ArtEd_Grade", "Term2_HealthPhyEd_Grade",
  "Term2_TeacherRemarks",
];


export function UploadProgressCardClient() {
  const { user: teacherUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadedData, setUploadedData] = useState<any | null>(null);

  const handleDownloadTemplate = () => {
    // Create an empty worksheet with headers
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ProgressCardTemplate");

    // Write the workbook and trigger download
    XLSX.writeFile(wb, `Progress_Card_Template_Grade_${teacherUser?.grade}${teacherUser?.division}.xlsx`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate headers
        const uploadedHeaders = Object.keys(json[0] as any);
        const missingHeaders = templateHeaders.filter(h => !uploadedHeaders.includes(h));

        if (missingHeaders.length > 0) {
            toast({
                title: "Invalid File Format",
                description: `The uploaded Excel file is missing required columns: ${missingHeaders.join(", ")}. Please use the provided template.`,
                variant: "destructive",
                duration: 10000,
            });
            setIsUploading(false);
            setFileName("");
            return;
        }

        processAndStoreData(json);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({ title: "Error", description: "Could not process the Excel file. Make sure it is a valid .xlsx file.", variant: "destructive" });
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const processAndStoreData = (jsonData: any[]) => {
    // Transform JSON from excel to the nested structure needed by ProgressCardClient
    const newProgressCardData: any = {};

    jsonData.forEach(row => {
        const rollNo = row.RollNo;
        if (!rollNo) return; // Skip rows without a roll number

        newProgressCardData[rollNo] = {
            studentDetails: {
                name: row.Name,
                rollNo: row.RollNo,
                grade: teacherUser?.grade, // Assuming all uploads are for the teacher's class
                division: teacherUser?.division,
                motherName: row.MotherName,
                fatherName: row.FatherName,
                dob: row.["DOB(YYYY-MM-DD)"],
                grNo: row.GRNo,
                attendance: {
                    term1: row.Term1_Attendance,
                    term2: row.Term2_Attendance,
                },
            },
            term1: {
                scholastic: [
                    { subject: "Language 1 (English)", fa1: row.Term1_English_FA1, fa2: row.Term1_English_FA2, sa1: row.Term1_English_SA1, total: row.Term1_English_Total, grade: row.Term1_English_Grade },
                    { subject: "Language 2 (Marathi)", fa1: row.Term1_Marathi_FA1, fa2: row.Term1_Marathi_FA2, sa1: row.Term1_Marathi_SA1, total: row.Term1_Marathi_Total, grade: row.Term1_Marathi_Grade },
                    { subject: "Language 3 (Hindi)", fa1: row.Term1_Hindi_FA1, fa2: row.Term1_Hindi_FA2, sa1: row.Term1_Hindi_SA1, total: row.Term1_Hindi_Total, grade: row.Term1_Hindi_Grade },
                    { subject: "Mathematics", fa1: row.Term1_Math_FA1, fa2: row.Term1_Math_FA2, sa1: row.Term1_Math_SA1, total: row.Term1_Math_Total, grade: row.Term1_Math_Grade },
                    { subject: "E.V.S.", fa1: row.Term1_EVS_FA1, fa2: row.Term1_EVS_FA2, sa1: row.Term1_EVS_SA1, total: row.Term1_EVS_Total, grade: row.Term1_EVS_Grade },
                ],
                coScholastic: [
                    { area: "Work Education", grade: row.Term1_WorkEd_Grade },
                    { area: "Art Education", grade: row.Term1_ArtEd_Grade },
                    { area: "Health & Phy. Education", grade: row.Term1_HealthPhyEd_Grade },
                ],
                teacherRemarks: row.Term1_TeacherRemarks,
            },
            term2: {
                scholastic: [
                    { subject: "Language 1 (English)", fa1: row.Term2_English_FA1, fa2: row.Term2_English_FA2, sa1: row.Term2_English_SA1, total: row.Term2_English_Total, grade: row.Term2_English_Grade },
                    { subject: "Language 2 (Marathi)", fa1: row.Term2_Marathi_FA1, fa2: row.Term2_Marathi_FA2, sa1: row.Term2_Marathi_SA1, total: row.Term2_Marathi_Total, grade: row.Term2_Marathi_Grade },
                    { subject: "Language 3 (Hindi)", fa1: row.Term2_Hindi_FA1, fa2: row.Term2_Hindi_FA2, sa1: row.Term2_Hindi_SA1, total: row.Term2_Hindi_Total, grade: row.Term2_Hindi_Grade },
                    { subject: "Mathematics", fa1: row.Term2_Math_FA1, fa2: row.Term2_Math_FA2, sa1: row.Term2_Math_SA1, total: row.Term2_Math_Total, grade: row.Term2_Math_Grade },
                    { subject: "E.V.S.", fa1: row.Term2_EVS_FA1, fa2: row.Term2_EVS_FA2, sa1: row.Term2_EVS_SA1, total: row.Term2_EVS_Total, grade: row.Term2_EVS_Grade },
                ],
                coScholastic: [
                    { area: "Work Education", grade: row.Term2_WorkEd_Grade },
                    { area: "Art Education", grade: row.Term2_ArtEd_Grade },
                    { area: "Health & Phy. Education", grade: row.Term2_HealthPhyEd_Grade },
                ],
                teacherRemarks: row.Term2_TeacherRemarks,
            },
        };
    });
    
    // Store this transformed data in our mock store
    setProgressCardData(newProgressCardData);
    setUploadedData(newProgressCardData); // For confirmation message
    setIsUploading(false);

    toast({
        title: "Upload Successful!",
        description: `Successfully processed and stored progress card data for ${Object.keys(newProgressCardData).length} students. Students can now view their updated reports.`,
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
                        This feature uses a temporary in-browser storage. The uploaded marks data will be available for students to view until the browser tab is closed. For persistent storage, a database integration is required.
                    </p>
                </div>
            </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 1: Download Template</h3>
          <p className="text-sm text-muted-foreground">
            Download the Excel template. Fill it with your students' marks and details.
            Do not change the column headers.
          </p>
          <Button onClick={handleDownloadTemplate} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Download Excel Template
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Step 2: Upload Filled File</h3>
          <p className="text-sm text-muted-foreground">
            Once you have filled the template, upload the .xlsx file here.
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
          {fileName && !isUploading && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 text-green-700 border border-green-200">
                <FileCheck2 className="h-5 w-5" />
                <p className="text-sm font-medium">Successfully processed: {fileName}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
