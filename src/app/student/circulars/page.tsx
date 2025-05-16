
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Circular } from "@/types";
import { useAuth } from "@/context/AuthContext"; // For potential future filtering

export default function StudentCircularsPage() {
  const [circularsList, setCircularsList] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // For future filtering by grade/division

  useEffect(() => {
    const fetchCirculars = async () => {
      setLoading(true);
      try {
        const circularsCollection = collection(db, "circulars");
        // TODO: Implement filtering based on user.grade and user.division or school-wide circulars
        const q = query(circularsCollection, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fetchedCirculars: Circular[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp as Timestamp;
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            postedByUid: data.postedByUid,
            postedByName: data.postedByName,
            timestamp: timestamp,
            displayDate: timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString() : 'N/A',
            grade: data.grade,
            division: data.division,
          } as Circular;
        });
        setCircularsList(fetchedCirculars);
      } catch (error) {
        console.error("Error fetching circulars:", error);
        // Handle error display if needed
      } finally {
        setLoading(false);
      }
    };

    fetchCirculars();
  }, [user]); // Rerun if user context changes for future filtering

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading circulars...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <FileText className="h-8 w-8" />
        All Circulars
      </h1>
      {circularsList.length === 0 ? (
         <p className="text-muted-foreground text-center py-8">No circulars available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {circularsList.map(circ => (
            <Card key={circ.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{circ.title}</CardTitle>
                <CardDescription>
                  Posted on: {circ.displayDate} by {circ.postedByName}
                  {circ.grade && ` | For Grade: ${circ.grade}${circ.division ? circ.division : ''}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {circ.description && <p className="text-sm mb-3 whitespace-pre-wrap">{circ.description}</p>}
                {circ.fileUrl && (
                  <Button asChild variant="outline">
                    <a href={circ.fileUrl} target="_blank" rel="noopener noreferrer" data-ai-hint="document letter">
                      <Download className="mr-2 h-4 w-4" /> 
                      {circ.fileName ? `Download ${circ.fileName}` : 'Download Circular'}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
