
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import type { Complaint } from "@/types";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Calendar, Tag, Book, MessageSquare, Check, ShieldCheck, FileSignature, Edit, Download } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const DetailRow = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string, children?: React.ReactNode }) => (
  <div className="flex items-start space-x-3 py-2">
    <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
    <div className="flex-grow">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {value && <p className="text-base text-foreground">{value}</p>}
      {children && <div className="text-base text-foreground">{children}</div>}
    </div>
  </div>
);

export function ComplaintDetailsClient({ complaintId }: { complaintId: string }) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [parentRemarks, setParentRemarks] = useState("");
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const complaintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!complaintId) {
        setError("Invalid complaint ID.");
        setIsLoading(false);
        return;
    }
    
    const fetchComplaint = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const complaintDocRef = doc(db, "complaints", complaintId);
            const docSnap = await getDoc(complaintDocRef);
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Complaint;
                setComplaint(data);
            } else {
                setError("Complaint not found.");
            }
        } catch (err) {
            console.error("Error fetching complaint details:", err);
            setError("Failed to load complaint details.");
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchComplaint();
  }, [complaintId]);

  const handleDownloadPdf = async () => {
    const reportElement = complaintRef.current;
    if (!reportElement || !complaint) return;

    setIsDownloading(true);
    try {
        const canvas = await html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            logging: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        let finalImgWidth = pdfWidth - 20; // with margin
        let finalImgHeight = finalImgWidth / ratio;

        if (finalImgHeight > pdfHeight - 20) {
            finalImgHeight = pdfHeight - 20;
            finalImgWidth = finalImgHeight * ratio;
        }

        const x = (pdfWidth - finalImgWidth) / 2;
        const y = 10; // top margin

        pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
        pdf.save(`conduct_report_${complaint.studentName.replace(/ /g, '_')}_${complaint.incidentDate}.pdf`);

        toast({
          title: "Download Started",
          description: "Your PDF is being prepared for download.",
        });

    } catch (err) {
        console.error("Error generating PDF:", err);
        toast({ title: "Download Failed", description: "Could not generate the PDF.", variant: "destructive" });
    } finally {
        setIsDownloading(false);
    }
  };


  const handleAcknowledge = async () => {
    if (!complaint || !user) return;
    if (!isAcknowledged) {
        toast({ title: "Acknowledgment Required", description: "Please check the box to acknowledge.", variant: "destructive" });
        return;
    }
    setIsAcknowledging(true);
    const complaintDocRef = doc(db, "complaints", complaint.id!);
    try {
        await updateDoc(complaintDocRef, {
            status: "Acknowledged",
            acknowledgmentTimestamp: serverTimestamp(),
            parentRemarks: parentRemarks,
            acknowledgedBy: "Parent",
        });
        toast({
            title: "Complaint Acknowledged",
            description: "Thank you for your review.",
        });
        setComplaint(prev => prev ? { ...prev, status: "Acknowledged" } : null);
    } catch (err: any) {
        console.error("Error acknowledging complaint:", err);
        toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
        setIsAcknowledging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-destructive py-10">{error}</p>;
  }

  if (!complaint) {
    return <p className="text-center text-muted-foreground py-10">Complaint record not found.</p>;
  }
  
  const isStudentRole = role === 'student';

  return (
    <Card className="max-w-3xl mx-auto shadow-xl">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-3xl font-bold text-primary">Student Conduct Report</CardTitle>
          <CardDescription>
              This is a record of a recent incident concerning {isStudentRole ? "you" : `your child, ${complaint.studentName}`}.
          </CardDescription>
        </div>
        {role === 'teacher' && (
            <Button onClick={handleDownloadPdf} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download as PDF
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <div ref={complaintRef} className="p-4 bg-white text-black">
          <div className="space-y-6 divide-y">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-6">
                <DetailRow icon={User} label="Student Name" value={complaint.studentName} />
                <DetailRow icon={Tag} label="Class" value={`${complaint.grade}-${complaint.division}`} />
                <DetailRow icon={Calendar} label="Incident Date" value={format(new Date(complaint.incidentDate + "T00:00:00"), "PPP")} />
                <DetailRow icon={Edit} label="Filed by" value={complaint.teacherName} />
                <DetailRow icon={Book} label="Subject" value={complaint.subject} />
                <DetailRow icon={MessageSquare} label="Complaint Type">
                    <div className="flex flex-wrap gap-2">
                        {complaint.complaintTypes.map(type => (
                            <Badge key={type} variant="secondary">{type}</Badge>
                        ))}
                        {complaint.otherComplaintType && (
                            <Badge variant="secondary">Other: {complaint.otherComplaintType}</Badge>
                        )}
                    </div>
                </DetailRow>
            </div>
            <div className="pt-6">
                 <DetailRow icon={FileSignature} label="Description of Incident" value={complaint.description} />
            </div>
            <div className="pt-6">
                <DetailRow icon={ShieldCheck} label="Action Taken by Teacher" value={complaint.actionTaken} />
            </div>
            
            {complaint.status === "Acknowledged" ? (
                <div className="pt-6">
                    <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2 mb-4">
                        <Check className="h-6 w-6" /> Acknowledged
                    </h3>
                    <DetailRow icon={Calendar} label="Acknowledged On" value={complaint.acknowledgmentTimestamp ? format((complaint.acknowledgmentTimestamp as Timestamp).toDate(), "PPPp") : "N/A"} />
                    {complaint.parentRemarks && (
                         <DetailRow icon={MessageSquare} label="Your Remarks" value={complaint.parentRemarks} />
                    )}
                </div>
            ) : isStudentRole ? (
                <div className="pt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-destructive">Parent/Student Acknowledgment</h3>
                    <p className="text-sm text-muted-foreground">
                        Please review the report above. By checking the box and submitting, you acknowledge that you have read and understood this report.
                    </p>
                    <div className="space-y-2">
                        <Label htmlFor="parentRemarks">Your Remarks (Optional)</Label>
                        <Textarea 
                            id="parentRemarks"
                            placeholder="You can add any remarks here..."
                            value={parentRemarks}
                            onChange={(e) => setParentRemarks(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="acknowledge-check" checked={isAcknowledged} onCheckedChange={(checked) => setIsAcknowledged(checked as boolean)} />
                        <Label htmlFor="acknowledge-check" className="font-medium">I have read and understood the complaint above.</Label>
                    </div>
                    <Button onClick={handleAcknowledge} disabled={isAcknowledging}>
                        {isAcknowledging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Acknowledgment
                    </Button>
                </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
