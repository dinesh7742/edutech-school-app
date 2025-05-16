"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Download } from "lucide-react";
import Image from "next/image";

// Mock data - replace with actual data fetching
const mockTextbooks = [
  { id: "1", title: "Mathematics Grade 5", subject: "Mathematics", fileUrl: "https://placehold.co/200x280.pdf/E8EAF6/3F51B5?text=Math+G5", coverImageUrl: "https://placehold.co/200x280.png/E8EAF6/3F51B5?text=Math+G5", dataAiHint: "textbook math" },
  { id: "2", title: "Science Explorer Grade 5", subject: "Science", fileUrl: "https://placehold.co/200x280.pdf/E8EAF6/3F51B5?text=Science+G5", coverImageUrl: "https://placehold.co/200x280.png/E8EAF6/3F51B5?text=Science+G5", dataAiHint: "textbook science" },
  { id: "3", title: "English Grammar & Composition", subject: "English", fileUrl: "https://placehold.co/200x280.pdf/E8EAF6/3F51B5?text=English+G5", coverImageUrl: "https://placehold.co/200x280.png/E8EAF6/3F51B5?text=English+G5", dataAiHint: "textbook english" },
  { id: "4", title: "Social Studies Our Past", subject: "Social Studies", fileUrl: "https://placehold.co/200x280.pdf/E8EAF6/3F51B5?text=SST+G5", coverImageUrl: "https://placehold.co/200x280.png/E8EAF6/3F51B5?text=SST+G5", dataAiHint: "textbook history" },
];

export default function StudentTextbooksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <BookOpen className="h-8 w-8" />
        Textbooks
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {mockTextbooks.map(book => (
          <Card key={book.id} className="shadow-lg flex flex-col">
            <CardHeader className="p-0">
              <Image 
                src={book.coverImageUrl} 
                alt={book.title} 
                width={200} 
                height={280} 
                className="w-full h-auto object-cover rounded-t-lg aspect-[5/7]"
                data-ai-hint={book.dataAiHint}
              />
            </CardHeader>
            <CardContent className="p-4 flex flex-col flex-grow">
              <CardTitle className="text-lg mb-1">{book.title}</CardTitle>
              <CardDescription className="text-sm mb-3">Subject: {book.subject}</CardDescription>
              <div className="mt-auto">
                <Button asChild variant="outline" className="w-full">
                  <a href={book.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {mockTextbooks.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No textbooks available at the moment.</p>
      )}
    </div>
  );
}
