"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Download } from "lucide-react";

// Mock data - replace with actual data fetching
const mockHomework = [
  { id: "1", title: "Math Assignment Ch 5", subject: "Mathematics", dueDate: "2024-08-05", fileUrl: "https://placehold.co/200x100.png?text=MathHW", description: "Complete all exercises from Chapter 5. Show all working steps.", dataAiHint: "document sheet" },
  { id: "2", title: "Science Project: Solar System", subject: "Science", dueDate: "2024-08-10", fileUrl: "https://placehold.co/200x100.png?text=SciProj", description: "Create a model or presentation about the solar system. Include all planets and key facts.", dataAiHint: "document presentation" },
  { id: "3", title: "History Essay: Ancient Rome", subject: "History", dueDate: "2024-08-12", fileUrl: "https://placehold.co/200x100.png?text=HistEssay", description: "Write a 500-word essay on the rise and fall of Ancient Rome.", dataAiHint: "document text" },
];

export default function StudentHomeworkPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <ClipboardList className="h-8 w-8" />
        All Homework
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockHomework.map(hw => (
          <Card key={hw.id} className="shadow-lg">
            <CardHeader>
              <CardTitle>{hw.title}</CardTitle>
              <CardDescription>
                Subject: {hw.subject} | Due Date: {hw.dueDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">{hw.description}</p>
              {hw.fileUrl && (
                <Button asChild variant="outline">
                  <a href={hw.fileUrl} target="_blank" rel="noopener noreferrer" data-ai-hint={hw.dataAiHint}>
                    <Download className="mr-2 h-4 w-4" /> Download Attachment
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {mockHomework.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No homework assigned at the moment.</p>
      )}
    </div>
  );
}
