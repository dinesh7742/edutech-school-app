
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Circular } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileViewer, type FileInfo } from "@/components/shared/FileViewer";

export default function StudentCircularsPage() {
  const [allCirculars, setAllCirculars] = useState<Circular[]>([]);
  const [filteredCirculars, setFilteredCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewingFile, setViewingFile] = useState<FileInfo | null>(null);

  useEffect(() => {
    const fetchCirculars = async () => {
      setLoading(true);
      try {
        const circularsCollection = collection(db, "circulars");
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
        setAllCirculars(fetchedCirculars);
      } catch (error) {
        console.error("Error fetching circulars:", error);
        // Handle error display if needed
      } finally {
        setLoading(false);
      }
    };

    fetchCirculars();
  }, []);

  useEffect(() => {
    if (!user || !user.grade || !user.division || allCirculars.length === 0) {
      setFilteredCirculars(allCirculars.filter(circ => {
        // School-wide circulars
        if (!circ.grade && !circ.division) return true;
        return false; 
      }));
       if (user && user.grade && user.division && allCirculars.length > 0) {
         const relevantCirculars = allCirculars.filter(circ => {
          const isSchoolWide = !circ.grade || circ.grade === "";
          const isGradeMatch = circ.grade === user.grade;
          const isDivisionMatch = circ.division === user.division;
          const isGradeWideForUser = isGradeMatch && (!circ.division || circ.division === "");

          return isSchoolWide || (isGradeMatch && isDivisionMatch) || isGradeWideForUser;
        });
        setFilteredCirculars(relevantCirculars);
      } else {
        setFilteredCirculars(allCirculars.filter(c => (!c.grade && !c.division)));
      }
      return;
    }

    const relevantCirculars = allCirculars.filter(circ => {
      // Condition 1: School-wide (no grade specified for the circ)
      if (!circ.grade || circ.grade === "") {
        return true;
      }
      // Condition 2: Matches student's grade
      if (circ.grade === user.grade) {
        // Condition 2a: Grade-wide (no division specified for the circ)
        if (!circ.division || circ.division === "") {
          return true;
        }
        // Condition 2b: Matches student's specific division
        if (circ.division === user.division) {
          return true;
        }
      }
      return false;
    });
    setFilteredCirculars(relevantCirculars);

  }, [user, allCirculars]);


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading circulars...</p>
      </div>
    );
  }

  return (
    <>
    <FileViewer fileInfo={viewingFile} onOpenChange={(isOpen) => !isOpen && setViewingFile(null)} />
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <FileText className="h-8 w-8" />
        Circulars for You
      </h1>
      {filteredCirculars.length === 0 ? (
         <p className="text-muted-foreground text-center py-8">No relevant circulars available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCirculars.map(circ => (
            <Card key={circ.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{circ.title}</CardTitle>
                <CardDescription>
                  Posted on: {circ.displayDate} by {circ.postedByName}
                  {circ.grade && ` | For Grade: ${circ.grade}${circ.division ? ` Div: ${circ.division}` : ' (All Divisions)'}`}
                  {!circ.grade && ' | School Wide'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {circ.description && <p className="text-sm mb-3 whitespace-pre-wrap">{circ.description}</p>}
                {circ.fileUrl && (
                  <Button
                    variant="outline"
                    onClick={() => setViewingFile({url: circ.fileUrl!, type: 'pdf', name: circ.fileName || 'Circular'})}
                    data-ai-hint="document letter"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> 
                    {circ.fileName ? `View ${circ.fileName}` : 'View Circular'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
