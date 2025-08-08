
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { ProgressReport } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Award, Star } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Image from "next/image";

const schoolInfo = {
  name: "PM SHRI MPS VARSHA NAGAR",
  address: "Vikhroli West, Mumbai - 79",
  logoUrl: "https://i.postimg.cc/vmz54c6T/1.png"
};

const ReportCardToDownload = ({ report, studentName, grNumber }: { report: ProgressReport, studentName: string, grNumber?: string }) => {
  return (
    <div className="p-8 font-sans text-gray-800 bg-white" style={{ width: '210mm', height: '297mm' }}>
      <div className="text-center mb-8 border-b-2 border-primary pb-4">
        <Image src={schoolInfo.logoUrl} alt="School Logo" width={80} height={80} className="mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-primary">{schoolInfo.name}</h1>
        <p className="text-sm text-muted-foreground">{schoolInfo.address}</p>
      </div>
      <h2 className="text-center text-2xl font-semibold mb-6 underline">PROGRESS REPORT</h2>
      <p className="text-center text-lg mb-8 font-medium">Academic Year: {report.academicYear}</p>
      
      <div className="grid grid-cols-2 gap-4 mb-8 text-md">
        <p><span className="font-semibold">Student Name:</span> {studentName}</p>
        <p><span className="font-semibold">Grade:</span> {report.grade}-{report.division}</p>
        <p><span className="font-semibold">Roll No:</span> {report.rollNumber}</p>
        <p><span className="font-semibold">G.R. No:</span> {grNumber || 'N/A'}</p>
      </div>

      <div className="text-center border-t-2 border-b-2 border-dashed border-primary py-10 my-10">
        <p className="text-lg mb-2">For the <span className="font-bold">{report.examType}</span>, the student has secured:</p>
        <p className="text-6xl font-bold text-accent my-4">{report.marks}</p>
        <p className="text-3xl font-semibold text-secondary">Grade: {report.gradeValue}</p>
      </div>

      <div className="text-center my-12">
        <p className="text-5xl font-extrabold tracking-widest text-green-600 uppercase" style={{ WebkitTextStroke: '1px black', textShadow: '2px 2px 4px rgba(0,0,0,0.2)'}}>
          PASSED
        </p>
      </div>
      
      <div className="mt-24 pt-8 text-sm flex justify-between border-t">
        <p className="font-semibold">Class Teacher's Signature</p>
        <p className="font-semibold">Principal's Signature</p>
      </div>
    </div>
  );
};


export function ProgressReportClient() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const reportRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (user?.uid) {
      const fetchReports = async () => {
        setLoading(true);
        const reportsRef = collection(db, "progressReports");
        const q = query(reportsRef, where("studentUid", "==", user.uid), orderBy("academicYear", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedReports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgressReport));
        setReports(fetchedReports);
        setLoading(false);
      };
      fetchReports();
    }
  }, [user]);
  
  const handleDownload = async (reportId: string) => {
    const reportElement = reportRefs.current[reportId];
    if (!reportElement) return;

    setIsDownloading(reportId);
    try {
        const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Progress_Report_${user?.displayName?.replace(' ', '_')}_${reports.find(r => r.id === reportId)?.examType}.pdf`);
    } catch (err) {
        console.error("Error generating PDF:", err);
    } finally {
        setIsDownloading(null);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (reports.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No progress reports have been uploaded for you yet.</p>;
  }

  return (
    <>
      <div className="hidden">
        {reports.map(report => (
          <div key={`pdf-${report.id}`} ref={el => reportRefs.current[report.id!] = el}>
            <ReportCardToDownload report={report} studentName={user?.displayName || 'Student'} grNumber={(user as any)?.grNumber} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(report => (
          <Card key={report.id} className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2"><Star className="text-yellow-400"/> {report.examType}</CardTitle>
                    <CardDescription>Academic Year: {report.academicYear}</CardDescription>
                  </div>
                   <Button onClick={() => handleDownload(report.id!)} disabled={isDownloading === report.id} size="sm">
                    {isDownloading === report.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    Download PDF
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Marks Obtained</p>
                  <p className="text-4xl font-bold text-primary">{report.marks}</p>
                  <p className="text-sm text-muted-foreground mt-2">Grade</p>
                  <p className="text-2xl font-semibold text-accent">{report.gradeValue}</p>
              </div>
              <p className="mt-4 text-2xl font-bold text-green-500">PASSED</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
