
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Notice } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // To potentially filter by grade/division later

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      try {
        // For now, fetching all notices. 
        // TODO: Implement filtering based on user.grade and user.division
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
            postedByUid: data.postedByUid,
            postedByName: data.postedByName,
            timestamp: timestamp,
            displayDate: timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString() : 'N/A',
            grade: data.grade,
            division: data.division,
          } as Notice;
        });
        setNotices(fetchedNotices);
      } catch (error) {
        console.error("Error fetching notices:", error);
        // Handle error display if needed
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [user]); // Rerun if user context changes, for future filtering logic

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
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <Bell className="h-8 w-8" />
        All Notices
      </h1>
      {notices.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No notices available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notices.map(notice => (
            <Card key={notice.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{notice.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Posted by: {notice.postedByName} on {notice.displayDate}
                  {notice.grade && ` | For Grade: ${notice.grade}${notice.division ? notice.division : ''}`}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{notice.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
