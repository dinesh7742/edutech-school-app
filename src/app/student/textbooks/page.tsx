
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Loader2 } from "lucide-react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, Timestamp } from "firebase/firestore"; // Removed orderBy for now
import type { Textbook } from "@/types";

export default function StudentTextbooksPage() {
  const [textbooksList, setTextbooksList] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // For displaying errors

  useEffect(() => {
    const fetchTextbooks = async () => {
      setLoading(true);
      setError(null); // Reset error on new fetch
      console.log("[StudentTextbooksPage] Attempting to fetch textbooks from Firestore...");
      try {
        const textbooksCollectionRef = collection(db, "textbooks");
        // Simplified query: removed orderBy to see if data loads
        const q = query(textbooksCollectionRef); 
        console.log("[StudentTextbooksPage] Executing Firestore query for textbooks (simplified):", q);
        const querySnapshot = await getDocs(q);
        
        console.log(`[StudentTextbooksPage] Firestore query successful. Found ${querySnapshot.docs.length} documents.`);
        
        if (querySnapshot.empty) {
          console.warn("[StudentTextbooksPage] No textbooks found in the 'textbooks' collection after query execution.");
        }

        const fetchedTextbooks: Textbook[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`[StudentTextbooksPage] Mapping document ${doc.id}:`, data);
          // Basic validation for essential fields before mapping
          if (!data.title || !data.subject || !data.grade) {
            console.warn(`[StudentTextbooksPage] Document ${doc.id} is missing critical fields (title, subject, or grade) and will be skipped.`, data);
            return null; // Skip this document
          }
          return {
            id: doc.id,
            title: data.title,
            subject: data.subject,
            fileUrl: data.fileUrl || "", // Default to empty string if undefined
            coverImageUrl: data.coverImageUrl || undefined, // Default to undefined if missing
            fileName: data.fileName || "", // Default to empty string
            postedByUid: data.postedByUid,
            postedByName: data.postedByName,
            timestamp: data.timestamp as Timestamp, // Assume timestamp exists
            grade: data.grade,
          };
        }).filter(Boolean) as Textbook[]; // Filter out any nulls from skipped documents
        
        setTextbooksList(fetchedTextbooks);
        console.log(`[StudentTextbooksPage] Successfully mapped ${fetchedTextbooks.length} textbooks to state:`, fetchedTextbooks);

      } catch (err: any) {
        console.error("[StudentTextbooksPage] Error fetching textbooks from Firestore:", err);
        setError(`Failed to load textbooks: ${err.message}. Please check the browser console for more details, especially for Firestore permission errors or missing index warnings (if orderBy is used).`);
        setTextbooksList([]); // Clear list on error
      } finally {
        setLoading(false);
        console.log("[StudentTextbooksPage] Finished fetching textbooks. Loading set to false.");
      }
    };

    fetchTextbooks();
  }, []); // Fetch once on component mount

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading textbooks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Textbooks
        </h1>
        <Card className="shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Textbooks</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please check your internet connection. If the issue persists, the browser's developer console might have more specific Firestore error messages (e.g., permission denied).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <BookOpen className="h-8 w-8" />
        Textbooks
      </h1>
      {textbooksList.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No textbooks available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {textbooksList.map(book => (
            <Card key={book.id} className="shadow-lg flex flex-col">
              <CardHeader className="p-0">
                <Image 
                  src={book.coverImageUrl || `https://placehold.co/200x280.png/E8EAF6/3F51B5?text=${encodeURIComponent(book.subject)}`} 
                  alt={book.title} 
                  width={200} 
                  height={280} 
                  className="w-full h-auto object-cover rounded-t-lg aspect-[5/7]"
                  data-ai-hint={`textbook ${book.subject.toLowerCase()}`}
                />
              </CardHeader>
              <CardContent className="p-4 flex flex-col flex-grow">
                <CardTitle className="text-lg mb-1">{book.title}</CardTitle>
                <CardDescription className="text-sm mb-1">Subject: {book.subject}</CardDescription>
                <CardDescription className="text-sm mb-3">Grade: {book.grade}</CardDescription>
                <div className="mt-auto">
                  {book.fileUrl ? (
                    <Button asChild variant="outline" className="w-full">
                      <a href={book.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" /> 
                        {book.fileName || 'Download PDF'}
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      No PDF
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
