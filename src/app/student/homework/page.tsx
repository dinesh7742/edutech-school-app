
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Download, Loader2, Image as ImageIcon, Video, File as FileIcon } from "lucide-react";
import NextImage from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import type { Homework, HomeworkAttachment } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function StudentHomeworkPage() {
  const [allHomework, setAllHomework] = useState<Homework[]>([]);
  const [filteredHomework, setFilteredHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchHomework = async () => {
      setLoading(true);
      try {
        const homeworkCollection = collection(db, "homework");
        const q = query(homeworkCollection, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fetchedHomework: Homework[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp as Timestamp;
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            attachments: data.attachments || [],
            postedByUid: data.postedByUid,
            postedByName: data.postedByName,
            timestamp: timestamp,
            displayDate: timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString() : 'N/A',
            dueDate: data.dueDate ? new Date(data.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A',
            subject: data.subject,
            grade: data.grade,
            division: data.division,
          } as Homework;
        });
        setAllHomework(fetchedHomework);
      } catch (error) {
        console.error("Error fetching homework:", error);
        // Handle error display if needed
      } finally {
        setLoading(false);
      }
    };

    fetchHomework();
  }, []);

  useEffect(() => {
    if (!user || !user.grade || !user.division || allHomework.length === 0) {
       // Homework is typically very specific, so if user details are missing, show nothing
       // or only school-wide if that concept existed for homework (it doesn't typically)
      setFilteredHomework(allHomework.filter(hw => hw.grade === user?.grade && hw.division === user?.division));
      return;
    }

    const relevantHomework = allHomework.filter(hw => {
      // Homework must match grade and division
      return hw.grade === user.grade && hw.division === user.division;
    });
    setFilteredHomework(relevantHomework);

  }, [user, allHomework]);

  const handleDownload = async (url: string, fileName: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL after the download has been initiated
        window.URL.revokeObjectURL(blobUrl);

        toast({ title: "Download Started", description: `Downloading ${fileName}...` });
    } catch (error) {
        console.error("Download failed:", error);
        toast({
            title: "Download Failed",
            description: "Could not start the file download. Please try again or check browser permissions.",
            variant: "destructive"
        });
    }
  };


  const renderAttachment = (attachment: HomeworkAttachment, index: number) => {
    switch(attachment.type) {
      case 'image':
        return (
          <div key={index} className="my-2 space-y-2">
            <div className="relative w-full aspect-video border rounded-md overflow-hidden bg-muted">
                <NextImage src={attachment.url} alt={attachment.name} layout="fill" objectFit="contain" />
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => handleDownload(attachment.url, attachment.name)}>
                <Download className="mr-2 h-4 w-4" /> Download Image
            </Button>
          </div>
        )
      case 'video':
        return (
          <div key={index} className="my-2 space-y-2">
            <video controls src={attachment.url} className="w-full rounded-md border bg-black"></video>
            <p className="text-xs text-muted-foreground mt-1">{attachment.name}</p>
             <Button size="sm" variant="outline" className="w-full" onClick={() => handleDownload(attachment.url, attachment.name)}>
                <Download className="mr-2 h-4 w-4" /> Download Video
            </Button>
          </div>
        )
      case 'pdf':
      default:
        return (
          <Button key={index} variant="outline" className="mt-2 w-full" onClick={() => handleDownload(attachment.url, attachment.name)} data-ai-hint="document sheet">
            {attachment.type === 'pdf' ? <FileIcon className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            {`Download ${attachment.name}`}
          </Button>
        )
    }
  }

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
        Homework for Grade {user?.grade}{user?.division}
      </h1>
      {filteredHomework.length === 0 ? (
         <p className="text-muted-foreground text-center py-8">No homework assigned to your class at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHomework.map(hw => (
            <Card key={hw.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{hw.title}</CardTitle>
                <CardDescription>
                  Subject: {hw.subject} | Due Date: {hw.dueDate} <br />
                  Posted: {hw.displayDate} by {hw.postedByName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hw.description && <p className="text-sm mb-3 whitespace-pre-wrap">{hw.description}</p>}
                
                {hw.attachments && hw.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Attachments:</h4>
                     {hw.attachments.map((att, index) => renderAttachment(att, index))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
