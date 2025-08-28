
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ArrowRight, Loader2, School } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import type { Exam } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchExams = async () => {
      if (!user || !user.grade || !user.division) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const examsCollection = collection(db, "exams");
        const q = query(
          examsCollection, 
          where("grade", "==", user.grade),
          where("division", "==", user.division)
        );
        const querySnapshot = await getDocs(q);
        
        const fetchedExams: Exam[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp as Timestamp,
            displayDate: data.timestamp ? format(new Date((data.timestamp as Timestamp).seconds * 1000), "PPP") : 'N/A',
            dueDate: data.dueDate ? format(new Date(data.dueDate + 'T00:00:00'), "PPP") : 'N/A',
          } as Exam;
        });

        // Sort the exams by date on the client side
        fetchedExams.sort((a, b) => {
            const dateA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : 0;
            const dateB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : 0;
            return dateB - dateA;
        });

        setExams(fetchedExams);
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [user]);

  return (
    <div className="py-4">
      <div className="flex items-center gap-3 mb-6">
        <School className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold text-primary">Online Exams</h1>
      </div>
      <p className="mb-6 text-muted-foreground">
        Here are the online exams assigned to your class. Click "Take Exam" to open the test in a new tab.
      </p>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading exams...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {exams.length === 0 ? (
             <p className="text-muted-foreground text-center py-8">No exams assigned to your class at the moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map(exam => (
                <Card key={exam.id} className="shadow-lg flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <ClipboardCheck className="h-8 w-8 text-primary"/>
                        <CardTitle>{exam.title}</CardTitle>
                    </div>
                    <CardDescription>
                      Subject: {exam.subject} | Marks: {exam.totalMarks} <br/>
                      Due Date: <span className="font-semibold">{exam.dueDate}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button asChild className="w-full">
                      <a href={exam.googleFormLink} target="_blank" rel="noopener noreferrer">
                        Take Exam <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
