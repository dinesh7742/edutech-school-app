
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Download, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Homework } from "@/types";
import { useAuth } from "@/context/AuthContext"; // To potentially filter by grade/division later

export default function StudentHomeworkPage() {
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // For future filtering

  useEffect(() => {
    const fetchHomework = async () => {
      setLoading(true);
      try {
        const homeworkCollection = collection(db, "homework");
        // TODO: Filter by user.grade and user.division
        // For now, fetching all homework and ordering by timestamp
        const q = query(homeworkCollection, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fetchedHomework: Homework[] = querySnapshot.docs.map(doc => {
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
            dueDate: data.dueDate ? new Date(data.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A', // Ensure date is parsed correctly for display
            subject: data.subject,
            grade: data.grade,
            division: data.division,
          } as Homework;
        });
        setHomeworkList(fetchedHomework);
      } catch (error) {
        console.error("Error fetching homework:", error);
        // Handle error display if needed
      } finally {
        setLoading(false);
      }
    };

    fetchHomework();
  }, [user]); // Rerun if user context changes for future filtering

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading homework...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <ClipboardList className="h-8 w-8" />
        All Homework
      </h1>
      {homeworkList.length === 0 ? (
         <p className="text-muted-foreground text-center py-8">No homework assigned at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {homeworkList.map(hw => (
            <Card key={hw.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{hw.title}</CardTitle>
                <CardDescription>
                  Subject: {hw.subject} | Due Date: {hw.dueDate} <br />
                  Posted: {hw.displayDate} by {hw.postedByName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3 whitespace-pre-wrap">{hw.description}</p>
                {hw.fileUrl && (
                  <Button asChild variant="outline">
                    <a href={hw.fileUrl} target="_blank" rel="noopener noreferrer" data-ai-hint="document sheet">
                      <Download className="mr-2 h-4 w-4" /> 
                      {hw.fileName ? `Download ${hw.fileName}` : 'Download Attachment'}
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

    