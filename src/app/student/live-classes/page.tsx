
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { LiveClass } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function StudentLiveClassesPage() {
  const [allLiveClasses, setAllLiveClasses] = useState<LiveClass[]>([]);
  const [filteredLiveClasses, setFilteredLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLiveClasses = async () => {
      setLoading(true);
      try {
        const liveClassesCollection = collection(db, "liveClasses");
        const q = query(liveClassesCollection, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fetchedLiveClasses: LiveClass[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp as Timestamp;
          return {
            id: doc.id,
            subject: data.subject,
            meetingLink: data.meetingLink,
            description: data.description,
            postedByUid: data.postedByUid,
            postedByName: data.postedByName,
            timestamp: timestamp,
            displayDate: timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString() : 'N/A',
            grade: data.grade,
            division: data.division,
          } as LiveClass;
        });
        setAllLiveClasses(fetchedLiveClasses);
      } catch (error) {
        console.error("Error fetching live classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveClasses();
  }, []);

  useEffect(() => {
    if (!user || !user.grade || !user.division || allLiveClasses.length === 0) {
      setFilteredLiveClasses(allLiveClasses.filter(lc => {
        if (!lc.grade && !lc.division) return true; // School-wide
        return false; 
      }));
      if (user && user.grade && user.division && allLiveClasses.length > 0) {
         const relevantLiveClasses = allLiveClasses.filter(lc => {
          const isSchoolWide = !lc.grade || lc.grade === "";
          const isGradeMatch = lc.grade === user.grade;
          const isDivisionMatch = lc.division === user.division;
          const isGradeWideForUser = isGradeMatch && (!lc.division || lc.division === "");
          return isSchoolWide || (isGradeMatch && isDivisionMatch) || isGradeWideForUser;
        });
        setFilteredLiveClasses(relevantLiveClasses);
      } else {
        setFilteredLiveClasses(allLiveClasses.filter(n => (!n.grade && !n.division)));
      }
      return;
    }

    const relevantLiveClasses = allLiveClasses.filter(lc => {
      const isSchoolWide = !lc.grade || lc.grade === "";
      const isGradeMatch = lc.grade === user.grade;
      const isDivisionMatch = lc.division === user.division;
      const isGradeWideForUser = isGradeMatch && (!lc.division || lc.division === "");
      return isSchoolWide || (isGradeMatch && isDivisionMatch) || isGradeWideForUser;
    });
    setFilteredLiveClasses(relevantLiveClasses);

  }, [user, allLiveClasses]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading live classes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <Video className="h-8 w-8" />
        Live Classes
      </h1>
      {filteredLiveClasses.length === 0 ? (
         <p className="text-muted-foreground text-center py-8">No live classes scheduled or announced for you at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLiveClasses.map(lc => (
            <Card key={lc.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{lc.subject}</CardTitle>
                <CardDescription>
                  Posted on: {lc.displayDate} by {lc.postedByName}
                  {lc.grade && ` | For Grade: ${lc.grade}${lc.division ? ` Div: ${lc.division}` : ' (All Divisions)'}`}
                  {!lc.grade && ' | School Wide'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lc.description && <p className="text-sm mb-3 whitespace-pre-wrap">{lc.description}</p>}
                <Button asChild variant="destructive" className="w-full">
                  <a href={lc.meetingLink} target="_blank" rel="noopener noreferrer" data-ai-hint="video play">
                    Join Meeting
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
