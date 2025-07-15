
"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { School, User, Download, Loader2, Search } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { getProgressCardData } from "@/lib/progressCardStore";

const schoolInfo = {
  name: "PM SHRI MPS VARSHA NAGAR",
  address: "Vikhroli West, Mumbai - 79",
  udise: "27220600119",
};

const subjectTranslations: { [key: string]: string } = {
    "First Language": "प्रथम भाषा",
    "Second Language": "द्वितीय भाषा",
    "Third Language": "तृतीय भाषा",
    "Math": "गणित",
    "EVS": "सा. वि",
    "Scout": "स्काउट",
    "Art": "कला",
    "Work Experience": "कार्यानुभव",
    "Physical Ed Health": "शा. शि.व आरोग्य",
};

export function ProgressCardClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rollNo, setRollNo] = useState("");
  const [term, setTerm] = useState<"term1" | "term2">("term1");
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportCardRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (!rollNo) {
      toast({ title: "Roll Number Required", description: "Please enter your roll number.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    
    // Simulate API call by getting data from our mock store
    setTimeout(() => {
      const allMarksData = getProgressCardData();
      const data = allMarksData[rollNo];
      
      if (data) {
        setReportData(data);
        toast({ title: "Success", description: "Report card found." });
      } else {
        setReportData(null);
        toast({ title: "Not Found", description: "No report card found for this roll number.", variant: "destructive" });
      }
      setIsLoading(false);
    }, 500);
  };

  const handleDownload = useCallback(() => {
    if (reportCardRef.current) {
      setIsDownloading(true);
      html2canvas(reportCardRef.current, {
        useCORS: true,
        scale: 2, 
        backgroundColor: null,
      }).then(canvas => {
        const link = document.createElement("a");
        link.download = `progress_card_${reportData?.studentDetails?.name.replace(/ /g, '_')}_${term}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setIsDownloading(false);
      }).catch(err => {
        console.error("Error generating report card image:", err);
        toast({ title: "Error", description: "Could not download the report card.", variant: "destructive" });
        setIsDownloading(false);
      });
    }
  }, [reportCardRef, reportData, term, toast]);

  const currentTermData = reportData ? reportData[term] : null;
  const academicYear = new Date().getFullYear();

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find Your Report Card</CardTitle>
          <CardDescription>Enter your Roll Number and select the Term.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Label htmlFor="rollNo">Roll Number</Label>
            <Input id="rollNo" value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="e.g., 12" />
          </div>
          <div>
            <Label htmlFor="term">Term</Label>
            <Select value={term} onValueChange={(value) => setTerm(value as "term1" | "term2")}>
              <SelectTrigger id="term" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="term1">First Term</SelectItem>
                <SelectItem value="term2">Second Term</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </CardContent>
      </Card>

      {reportData && currentTermData && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle>Report Card Found</CardTitle>
              <CardDescription>
                Showing report for {reportData.studentDetails.name} - {term === 'term1' ? 'First Term' : 'Second Term'}
              </CardDescription>
            </div>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download Report
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={reportCardRef} className="bg-white p-4 border-2 border-black text-black">
              <div className="text-center border-b-2 border-black pb-2 mb-2">
                <h2 className="text-xl font-bold">{schoolInfo.name}</h2>
                <p className="text-sm">{schoolInfo.address}</p>
                <h3 className="text-lg font-semibold mt-1">PROGRESS REPORT: {term === 'term1' ? 'FIRST TERM' : 'SECOND TERM'} {academicYear} - {academicYear + 1}</h3>
              </div>
              <table className="w-full text-sm mb-2">
                <tbody>
                  <tr>
                    <td><strong>Student's Name:</strong> {reportData.studentDetails.name}</td>
                    <td><strong>Gender:</strong> {reportData.studentDetails.gender}</td>
                  </tr>
                  <tr>
                    <td><strong>Class / Div:</strong> {reportData.studentDetails.grade} - {reportData.studentDetails.division}</td>
                    <td><strong>Roll No:</strong> {reportData.studentDetails.rollNo}</td>
                  </tr>
                  <tr>
                    <td><strong>Attendance:</strong> {currentTermData.attendance}</td>
                  </tr>
                </tbody>
              </table>
              
              <h4 className="font-bold text-center bg-gray-200 p-1 my-2">Scholastic Areas (Part 1)</h4>
              <Table className="border border-black">
                <TableHeader>
                  <TableRow className="border-b border-black bg-gray-100">
                    <TableHead className="border-r border-black font-bold text-black w-[25%]">Subjects (विषय)</TableHead>
                    <TableHead className="border-r border-black font-bold text-black text-center">Formative (आकारिक)</TableHead>
                    <TableHead className="border-r border-black font-bold text-black text-center">Summative (संकलित)</TableHead>
                    <TableHead className="border-r border-black font-bold text-black text-center">Total (एकूण)</TableHead>
                    <TableHead className="font-bold text-black text-center">Grade (श्रेणी)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTermData.scholastic?.map((s: any, index: number) => (
                    <TableRow key={index} className="border-b border-black">
                      <TableCell className="border-r border-black font-medium">{subjectTranslations[s.subject] || s.subject}</TableCell>
                      <TableCell className="border-r border-black text-center">{s.formative}</TableCell>
                      <TableCell className="border-r border-black text-center">{s.summative}</TableCell>
                      <TableCell className="border-r border-black text-center">{s.total}</TableCell>
                      <TableCell className="text-center">{s.grade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <h4 className="font-bold text-center bg-gray-200 p-1 my-2">Co-Scholastic Areas (Part 2)</h4>
              <Table className="border border-black">
                <TableHeader>
                  <TableRow className="border-b border-black bg-gray-100">
                    <TableHead className="border-r border-black font-bold text-black">Area (विषय)</TableHead>
                    <TableHead className="font-bold text-black text-center">Grade (श्रेणी)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTermData.coScholastic?.map((cs: any, index: number) => (
                    <TableRow key={index} className="border-b border-black">
                      <TableCell className="border-r border-black font-medium">{subjectTranslations[cs.area] || cs.area}</TableCell>
                      <TableCell className="text-center">{cs.grade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-2">
                <p><strong>Teacher's Remarks:</strong> {currentTermData.teacherRemarks}</p>
              </div>

              <div className="grid grid-cols-2 mt-2 border border-black p-1">
                <div className="border-r border-black pr-1">
                    <p className="font-bold text-center">Grading Scale (Scholastic)</p>
                    <p className="text-xs">91-100: A1, 81-90: A2, 71-80: B1, 61-70: B2, 51-60: C1, 41-50: C2, 33-40: D, 32 & Below: E</p>
                </div>
                <div className="pl-1">
                    <p className="font-bold text-center">Result</p>
                    <p className="text-center font-bold text-lg mt-2">Passed & Promoted to next class</p>
                </div>
              </div>

              <div className="flex justify-between mt-12 pt-4">
                <p className="border-t-2 border-black px-4">Parent's Signature</p>
                <p className="border-t-2 border-black px-4">Class Teacher's Signature</p>
                <p className="border-t-2 border-black px-4">Principal's Signature</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
