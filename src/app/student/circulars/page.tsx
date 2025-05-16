"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

// Mock data - replace with actual data fetching
const mockCirculars = [
 { id: "1", title: "Fee Payment Reminder - August", date: "2024-07-28", fileUrl: "https://placehold.co/200x100.png?text=FeeRemind", description: "Gentle reminder to clear outstanding school fees for the month of August by the 10th.", dataAiHint: "document letter" },
 { id: "2", title: "Holiday List 2024-25 Updated", date: "2024-07-20", fileUrl: "https://placehold.co/200x100.png?text=Holidays", description: "The updated holiday list for the academic year 2024-25 is now available.", dataAiHint: "document calendar" },
 { id: "3", title: "Uniform Code Revision", date: "2024-07-15", fileUrl: "https://placehold.co/200x100.png?text=Uniform", description: "Please note the minor revisions to the school uniform code, effective from next Monday.", dataAiHint: "document rules" },
];

export default function StudentCircularsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <FileText className="h-8 w-8" />
        All Circulars
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockCirculars.map(circ => (
          <Card key={circ.id} className="shadow-lg">
            <CardHeader>
              <CardTitle>{circ.title}</CardTitle>
              <CardDescription>
                Posted on: {circ.date}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">{circ.description}</p>
              {circ.fileUrl && (
                <Button asChild variant="outline">
                  <a href={circ.fileUrl} target="_blank" rel="noopener noreferrer" data-ai-hint={circ.dataAiHint}>
                    <Download className="mr-2 h-4 w-4" /> Download Circular
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
       {mockCirculars.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No circulars available at the moment.</p>
      )}
    </div>
  );
}
