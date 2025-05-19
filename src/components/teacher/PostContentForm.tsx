
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeDivisionSelector } from "@/components/auth/GradeDivisionSelector";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase"; 
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Schemas for different content types
const noticeSchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(10, "Content is required"),
  grade: z.string().optional(), 
  division: z.string().optional(),
});
type NoticeFormValues = z.infer<typeof noticeSchema>;

const homeworkSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  fileUrl: z.string().url("Please provide a valid URL for the file.").or(z.literal("")).optional(),
  fileName: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
  division: z.string().min(1, "Division is required"),
  subject: z.string().min(1, "Subject is required"),
  dueDate: z.string().refine((val) => {
    if (!val) return false; 
    const date = new Date(val);
    return !isNaN(date.getTime()); 
  }, "Due date is required and must be a valid date"),
});
type HomeworkFormValues = z.infer<typeof homeworkSchema>;

const circularSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  fileUrl: z.string().url("Please provide a valid URL for the file.").or(z.literal("")).optional(),
  fileName: z.string().optional(),
  grade: z.string().optional(), 
  division: z.string().optional(), 
});
type CircularFormValues = z.infer<typeof circularSchema>;

const textbookSchema = z.object({
  title: z.string().min(3, "Textbook Title is required"),
  subject: z.string().min(2, "Subject is required"),
  fileUrl: z.string().url("Please provide a valid URL for the PDF.").or(z.literal("")).optional(),
  coverImageUrl: z.string().url("Please provide a valid URL for the cover image.").or(z.literal("")).optional(),
  fileName: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
});
type TextbookFormValues = z.infer<typeof textbookSchema>;

const photoGallerySchema = z.object({
  title: z.string().min(3, "Event/Album title is required"),
  description: z.string().optional(),
  eventDate: z.string().optional(), 
  imageUrls: z.string()
    .refine(value => {
      if (!value) return true; 
      try {
        const urls = value.split(',').map(url => url.trim());
        return urls.every(url => url === "" || z.string().url().safeParse(url).success || url.startsWith('https://placehold.co')); 
      } catch (e) {
        return false;
      }
    }, "Please provide comma-separated, valid URLs (e.g., https://example.com/image.png). Empty input is also allowed.")
    .optional(),
});
type PhotoGalleryFormValues = z.infer<typeof photoGallerySchema>;

const liveClassSchema = z.object({
  subject: z.string().min(3, "Subject/Title is required"),
  meetingLink: z.string().url("A valid meeting URL is required"),
  description: z.string().optional(),
  grade: z.string().optional(),
  division: z.string().optional(),
});
type LiveClassFormValues = z.infer<typeof liveClassSchema>;


export function PostContentForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("notice");
  
  const defaultGradeDivision = { grade: user?.grade || "1", division: user?.division || "A"};

  const formNotice = useForm<NoticeFormValues>({ resolver: zodResolver(noticeSchema), defaultValues: { grade: defaultGradeDivision.grade, division: defaultGradeDivision.division} });
  const formHomework = useForm<HomeworkFormValues>({ resolver: zodResolver(homeworkSchema), defaultValues: defaultGradeDivision });
  const formCircular = useForm<CircularFormValues>({ resolver: zodResolver(circularSchema), defaultValues: { grade: defaultGradeDivision.grade, division: defaultGradeDivision.division } });
  const formTextbook = useForm<TextbookFormValues>({ resolver: zodResolver(textbookSchema), defaultValues: { grade: user?.grade || "1" }});
  const formGallery = useForm<PhotoGalleryFormValues>({ resolver: zodResolver(photoGallerySchema), defaultValues: { imageUrls: "" }});
  const formLiveClass = useForm<LiveClassFormValues>({ resolver: zodResolver(liveClassSchema), defaultValues: { grade: defaultGradeDivision.grade, division: defaultGradeDivision.division} });


  const handleFormSubmit = async (data: any, type: string) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      let collectionName = "";
      let documentData: any = {
        ...data, 
        postedByUid: user.uid,
        postedByName: user.displayName || user.email || "Teacher",
        timestamp: serverTimestamp(),
      };

      switch (type) {
        case "notice":
          collectionName = "notices";
          documentData.grade = data.grade || null; 
          documentData.division = data.division || null; 
          break;
        case "homework":
          collectionName = "homework";
          break;
        case "circular":
          collectionName = "circulars";
          documentData.grade = data.grade || null;
          documentData.division = data.division || null;
          break;
        case "textbook":
          collectionName = "textbooks";
          break;
        case "gallery":
          collectionName = "galleryAlbums";
          if (data.imageUrls) {
            const urls = data.imageUrls.split(',').map((url: string) => url.trim()).filter((url: string) => url); 
            documentData.images = urls.map((url: string, index: number) => ({
              url: url,
              alt: `${data.title || 'Gallery Image'} ${index + 1}`
            }));
          } else {
            documentData.images = []; 
          }
          delete documentData.imageUrls; 
          break;
        case "liveClass":
          collectionName = "liveClasses";
          documentData.grade = data.grade || null;
          documentData.division = data.division || null;
          break;
        default:
          toast({ title: "Error", description: "Invalid content type.", variant: "destructive" });
          setIsLoading(false);
          return;
      }

      await addDoc(collection(db, collectionName), documentData);
      
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Posted Successfully` });

      // Reset specific form
      if (type === 'notice') formNotice.reset({ title: "", content: "", grade: defaultGradeDivision.grade, division: defaultGradeDivision.division});
      if (type === 'homework') formHomework.reset({ title: "", description: "", fileUrl: "", fileName: "", grade: defaultGradeDivision.grade, division: defaultGradeDivision.division, subject: "", dueDate: ""});
      if (type === 'circular') formCircular.reset({ title: "", description: "", fileUrl: "", fileName: "", grade: defaultGradeDivision.grade, division: defaultGradeDivision.division});
      if (type === 'textbook') formTextbook.reset({ title: "", subject: "", fileUrl: "", coverImageUrl: "", fileName: "", grade: user?.grade || "1"});
      if (type === 'gallery') formGallery.reset({title: "", description: "", eventDate: "", imageUrls: "" });
      if (type === 'liveClass') formLiveClass.reset({subject: "", meetingLink: "", description: "", grade: defaultGradeDivision.grade, division: defaultGradeDivision.division});


    } catch (e: any) {
      console.error(`Error posting ${type}:`, e);
      toast({ title: "Error", description: `Failed to post ${type}. ${e.message || 'An unknown error occurred.'}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderSharedFields = (formInstance: any, type: 'homework' | 'circular' | 'notice' | 'liveClass') => (
    <>
       <div>
        <Label htmlFor={`${activeTab}Title`}>{type === 'liveClass' ? 'Subject / Title *' : 'Title *'}</Label>
        <Input id={`${activeTab}Title`} {...formInstance.register(type === 'liveClass' ? "subject" : "title")} />
        {formInstance.formState.errors[type === 'liveClass' ? "subject" : "title"] && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors[type === 'liveClass' ? "subject" : "title"] as any).message}</p>}
      </div>
      
      {type === 'notice' ? (
        <div>
            <Label htmlFor="noticeContent">Content *</Label>
            <Textarea id="noticeContent" {...formInstance.register("content")} rows={5} />
            {formInstance.formState.errors.content && <p className="text-sm text-destructive mt-1">{formInstance.formState.errors.content.message}</p>}
        </div>
      ) : type !== 'liveClass' ? ( // Description for homework, circular
        <div>
            <Label htmlFor={`${activeTab}Description`}>Description (Optional)</Label>
            <Textarea id={`${activeTab}Description`} {...formInstance.register("description")} />
        </div>
      ) : null}

      {type === 'liveClass' && (
         <>
            <div>
                <Label htmlFor="liveClassMeetingLink">Meeting Link *</Label>
                <Input id="liveClassMeetingLink" {...formInstance.register("meetingLink")} placeholder="https://zoom.us/j/..." />
                {formInstance.formState.errors.meetingLink && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.meetingLink as any).message}</p>}
            </div>
             <div>
                <Label htmlFor="liveClassDescription">Description (Optional)</Label>
                <Textarea id="liveClassDescription" {...formInstance.register("description")} placeholder="E.g., Class timing, topics to cover" />
            </div>
         </>
      )}

      {type !== 'notice' && type !== 'liveClass' && ( 
        <>
            <div>
                <Label htmlFor={`${activeTab}FileUrl`}>File URL (Optional, direct link to the file)</Label>
                <Input id={`${activeTab}FileUrl`} {...formInstance.register("fileUrl")} placeholder="https://example.com/document.pdf" />
                {formInstance.formState.errors.fileUrl && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.fileUrl as any).message}</p>}
            </div>
            <div>
                <Label htmlFor={`${activeTab}FileName`}>File Name (Optional, e.g., chapter5.pdf)</Label>
                <Input id={`${activeTab}FileName`} {...formInstance.register("fileName")} />
            </div>
        </>
      )}

      {type === 'homework' && (
        <>
          <div>
            <Label htmlFor="homeworkSubject">Subject *</Label>
            <Input id="homeworkSubject" {...formInstance.register("subject")} />
            {formInstance.formState.errors.subject && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.subject as any).message}</p>}
          </div>
          <div>
            <Label htmlFor="homeworkDueDate">Due Date *</Label>
            <Input id="homeworkDueDate" type="date" {...formInstance.register("dueDate")} />
            {formInstance.formState.errors.dueDate && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.dueDate as any).message}</p>}
          </div>
        </>
      )}
      <Controller
        name="grade"
        control={formInstance.control}
        render={({ field: gradeField }) => (
          <Controller
            name="division"
            control={formInstance.control}
            render={({ field: divisionField }) => ( 
              <GradeDivisionSelector
                grade={gradeField.value || ""}
                onGradeChange={gradeField.onChange}
                division={divisionField.value || ""} 
                onDivisionChange={divisionField.onChange}
                showDivision={type !== 'textbook'} 
              />
            )}
          />
        )}
      />
      {formInstance.formState.errors.grade && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.grade as any).message}</p>}
      {(type === 'homework' || type === 'liveClass') && formInstance.formState.errors.division && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.division as any).message}</p>}
      
      {(type === 'circular' || type === 'notice' || type === 'liveClass') && <p className="text-xs text-muted-foreground mt-1">Optionally select grade and division to target specific students. Leave empty for school-wide content.</p>}
    </>
  );


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Post Content</CardTitle>
        <CardDescription>Share information with students and parents.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-6">
            <TabsTrigger value="notice" className="whitespace-normal text-center h-auto py-2 px-2 text-xs sm:text-sm">Notices</TabsTrigger>
            <TabsTrigger value="homework" className="whitespace-normal text-center h-auto py-2 px-2 text-xs sm:text-sm">Homework</TabsTrigger>
            <TabsTrigger value="circular" className="whitespace-normal text-center h-auto py-2 px-2 text-xs sm:text-sm">Circulars</TabsTrigger>
            <TabsTrigger value="textbook" className="whitespace-normal text-center h-auto py-2 px-2 text-xs sm:text-sm">Textbooks</TabsTrigger>
            <TabsTrigger value="gallery" className="whitespace-normal text-center h-auto py-2 px-2 text-xs sm:text-sm">Gallery</TabsTrigger>
            <TabsTrigger value="liveClass" className="whitespace-normal text-center h-auto py-2 px-2 text-xs sm:text-sm">Live Class</TabsTrigger>
          </TabsList>

          <TabsContent value="notice">
            <form onSubmit={formNotice.handleSubmit(data => handleFormSubmit(data, "notice"))} className="space-y-4">
              {renderSharedFields(formNotice, "notice")}
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Notice
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="homework">
             <form onSubmit={formHomework.handleSubmit(data => handleFormSubmit(data, "homework"))} className="space-y-4">
              {renderSharedFields(formHomework, "homework")}
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Homework
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="circular">
            <form onSubmit={formCircular.handleSubmit(data => handleFormSubmit(data, "circular"))} className="space-y-4">
              {renderSharedFields(formCircular, "circular")}
               <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Circular
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="textbook">
            <form onSubmit={formTextbook.handleSubmit(data => handleFormSubmit(data, "textbook"))} className="space-y-4">
              <div>
                <Label htmlFor="textbookTitle">Textbook Title *</Label>
                <Input id="textbookTitle" {...formTextbook.register("title")} />
                {formTextbook.formState.errors.title && <p className="text-sm text-destructive mt-1">{formTextbook.formState.errors.title.message}</p>}
              </div>
              <div>
                <Label htmlFor="textbookSubject">Subject *</Label>
                <Input id="textbookSubject" {...formTextbook.register("subject")} />
                {formTextbook.formState.errors.subject && <p className="text-sm text-destructive mt-1">{formTextbook.formState.errors.subject.message}</p>}
              </div>
              <div>
                <Label htmlFor="textbookFileUrl">PDF URL (Optional)</Label>
                <Input id="textbookFileUrl" {...formTextbook.register("fileUrl")} placeholder="https://example.com/textbook.pdf"/>
                {formTextbook.formState.errors.fileUrl && <p className="text-sm text-destructive mt-1">{formTextbook.formState.errors.fileUrl.message}</p>}
              </div>
               <div>
                <Label htmlFor="textbookCoverImageUrl">Cover Image URL (Optional)</Label>
                <Input id="textbookCoverImageUrl" {...formTextbook.register("coverImageUrl")} placeholder="https://example.com/cover.png"/>
                {formTextbook.formState.errors.coverImageUrl && <p className="text-sm text-destructive mt-1">{formTextbook.formState.errors.coverImageUrl.message}</p>}
              </div>
              <div>
                <Label htmlFor="textbookFileName">File Name (Optional, e.g., math_grade5.pdf)</Label>
                <Input id="textbookFileName" {...formTextbook.register("fileName")} />
              </div>
              <div>
                <Label htmlFor="textbookGrade">Grade *</Label>
                 <Controller
                    name="grade" 
                    control={formTextbook.control}
                    render={({ field }) => (
                       <GradeDivisionSelector
                        grade={field.value || ""} 
                        onGradeChange={field.onChange} 
                        division="" 
                        onDivisionChange={() => {}} 
                        showDivision={false} 
                        />
                    )}
                  />
                {formTextbook.formState.errors.grade && <p className="text-sm text-destructive mt-1">{formTextbook.formState.errors.grade.message}</p>}
              </div>
               <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Textbook
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="gallery">
            <form onSubmit={formGallery.handleSubmit(data => handleFormSubmit(data, "gallery"))} className="space-y-4">
              <div>
                <Label htmlFor="galleryTitle">Gallery Title / Event Name *</Label>
                <Input id="galleryTitle" {...formGallery.register("title")} />
                {formGallery.formState.errors.title && <p className="text-sm text-destructive mt-1">{formGallery.formState.errors.title.message}</p>}
              </div>
              <div>
                <Label htmlFor="galleryDescription">Description (Optional)</Label>
                <Textarea id="galleryDescription" {...formGallery.register("description")} />
              </div>
              <div>
                <Label htmlFor="galleryEventDate">Event Date (Optional)</Label>
                <Input id="galleryEventDate" type="date" {...formGallery.register("eventDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="galleryImageUrls">Image URLs (comma-separated, optional)</Label>
                <Textarea 
                  id="galleryImageUrls"
                  {...formGallery.register("imageUrls")}
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.png"
                  rows={3}
                />
                {formGallery.formState.errors.imageUrls && <p className="text-sm text-destructive mt-1">{(formGallery.formState.errors.imageUrls as any)?.message}</p>}
                 <p className="text-xs text-muted-foreground mt-1">
                   Provide direct links to images, separated by commas. 
                   E.g., <code>https://path.to/image.jpg, https://another.site/pic.png</code>.
                   Google Drive links or search result links will NOT work directly. 
                   Ensure image hostnames are configured in <code>next.config.ts</code> if not using common services like placehold.co.
                 </p>
              </div>
               <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Gallery
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="liveClass">
            <form onSubmit={formLiveClass.handleSubmit(data => handleFormSubmit(data, "liveClass"))} className="space-y-4">
              {renderSharedFields(formLiveClass, "liveClass")}
               <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Live Class
              </Button>
            </form>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
