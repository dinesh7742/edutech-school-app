
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Notice } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Image from 'next/image';

export default function StudentNoticesPage() {
  const [allNotices, setAllNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      try {
        const noticesCollection = collection(db, "notices");
        const q = query(noticesCollection, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fetchedNotices: Notice[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp as Timestamp; // Firestore Timestamp
          return {
            id: doc.id,
            title: data.title,
            content: data.content,
            imageUrl: data.imageUrl,
            postedByUid: data.postedByUid,
            postedByName: data.postedByName,
            timestamp: timestamp,
            displayDate: timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString() : 'N/A',
            grade: data.grade,
            division: data.division,
          } as Notice;
        });
        setAllNotices(fetchedNotices);
      } catch (error) {
        console.error("Error fetching notices:", error);
        // Handle error display if needed
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  useEffect(() => {
    if (!user || !user.grade || !user.division || allNotices.length === 0) {
      // If user details are not available or no notices, show all notices (or none if empty)
      // This also covers cases where filtering might not be applicable yet
      setFilteredNotices(allNotices.filter(notice => {
        // School-wide notices
        if (!notice.grade && !notice.division) return true;
        return false; // Default to not showing if user context isn't fully ready for filtering
      }));
      if (user && user.grade && user.division && allNotices.length > 0) {
        // Proceed with filtering if user context is available
         const relevantNotices = allNotices.filter(notice => {
          const isSchoolWide = !notice.grade || notice.grade === "";
          const isGradeMatch = notice.grade === user.grade;
          const isDivisionMatch = notice.division === user.division;
          const isGradeWideForUser = isGradeMatch && (!notice.division || notice.division === "");

          return isSchoolWide || (isGradeMatch && isDivisionMatch) || isGradeWideForUser;
        });
        setFilteredNotices(relevantNotices);
      } else {
         // Fallback if user info isn't fully loaded or no notices
        setFilteredNotices(allNotices.filter(n => (!n.grade && !n.division)));
      }
      return;
    }

    const relevantNotices = allNotices.filter(notice => {
      // Condition 1: School-wide (no grade specified for the notice)
      if (!notice.grade || notice.grade === "") {
        return true;
      }
      // Condition 2: Matches student's grade
      if (notice.grade === user.grade) {
        // Condition 2a: Grade-wide (no division specified for the notice)
        if (!notice.division || notice.division === "") {
          return true;
        }
        // Condition 2b: Matches student's specific division
        if (notice.division === user.division) {
          return true;
        }
      }
      return false;
    });
    setFilteredNotices(relevantNotices);

  }, [user, allNotices]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading notices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notices for You
        </h1>
       </div>
      {filteredNotices.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No relevant notices available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotices.map(notice => (
            <Card key={notice.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{notice.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Posted by: {notice.postedByName} on {notice.displayDate}
                  {notice.grade && ` | For Grade: ${notice.grade}${notice.division ? ` Div: ${notice.division}` : ' (All Divisions)'}`}
                  {!notice.grade && ' | School Wide'}
                </p>
              </CardHeader>
              <CardContent>
                {notice.imageUrl && (
                  <div className="mb-4 relative w-full aspect-video rounded-md overflow-hidden">
                    <Image src={notice.imageUrl} alt={notice.title} layout="fill" objectFit="cover" data-ai-hint="announcement notice"/>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{notice.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
