
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
import { db, storage } from "@/lib/firebase"; // Import storage
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Import storage functions

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
  imageFiles: z.custom<FileList>()
    .refine((files) => files && files.length > 0, "At least one image is required.")
    .refine((files) => files && files.length <= 10, "Maximum 10 images allowed.")
    .refine((files) => {
      if (!files || files.length === 0) return true;
      for (let i = 0; i < files.length; i++) {
        if (!files[i].type.startsWith("image/")) return false;
      }
      return true;
    }, "Only image files (e.g., JPG, PNG, GIF) are allowed.")
    .optional(), // Make it optional if no files are selected initially
});
type PhotoGalleryFormValues = z.infer<typeof photoGallerySchema>;


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
  const formGallery = useForm<PhotoGalleryFormValues>({ resolver: zodResolver(photoGallerySchema), defaultValues: { imageFiles: undefined }});


  const handleFormSubmit = async (data: any, type: string) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      let collectionName = "";
      let documentData: any = {
        ...data, // Spread initial form data
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
          if (data.imageFiles && data.imageFiles.length > 0) {
            toast({ title: "Uploading Images...", description: `Starting upload of ${data.imageFiles.length} image(s). This may take a moment.` });
            const uploadedImageObjects = await Promise.all(
              Array.from(data.imageFiles as FileList).map(async (file, index) => {
                const fileExtension = file.name.split('.').pop();
                const randomFileNamePart = Math.random().toString(36).substring(2, 15);
                const storagePath = `galleryImages/${user.uid}/${Date.now()}-${randomFileNamePart}.${fileExtension}`;
                const storageRef = ref(storage, storagePath);
                
                // console.log(`Uploading ${file.name} to ${storagePath}`);
                const uploadTaskSnapshot = await uploadBytesResumable(storageRef, file);
                const downloadURL = await getDownloadURL(uploadTaskSnapshot.ref);
                // console.log(`${file.name} uploaded. URL: ${downloadURL}`);
                return { url: downloadURL, alt: `${data.title || 'Gallery Image'} ${index + 1}` };
              })
            );
            documentData.images = uploadedImageObjects;
            toast({ title: "Image Upload Complete", description: `${uploadedImageObjects.length} image(s) uploaded successfully.` });
          } else {
            documentData.images = []; // Ensure images is an empty array if no files
          }
          delete documentData.imageFiles; // Remove FileList before saving to Firestore
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
      if (type === 'gallery') formGallery.reset({title: "", description: "", eventDate: "", imageFiles: undefined });

    } catch (e: any) {
      console.error(`Error posting ${type}:`, e);
      toast({ title: "Error", description: `Failed to post ${type}. ${e.message || 'An unknown error occurred.'}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderSharedFields = (formInstance: any, type: 'homework' | 'circular' | 'notice') => (
    <>
       <div>
        <Label htmlFor={`${activeTab}Title`}>Title *</Label>
        <Input id={`${activeTab}Title`} {...formInstance.register("title")} />
        {formInstance.formState.errors.title && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.title as any).message}</p>}
      </div>
      
      {type === 'notice' ? (
        <div>
            <Label htmlFor="noticeContent">Content *</Label>
            <Textarea id="noticeContent" {...formInstance.register("content")} rows={5} />
            {formInstance.formState.errors.content && <p className="text-sm text-destructive mt-1">{formInstance.formState.errors.content.message}</p>}
        </div>
      ) : (
        <div>
            <Label htmlFor={`${activeTab}Description`}>Description (Optional)</Label>
            <Textarea id={`${activeTab}Description`} {...formInstance.register("description")} />
        </div>
      )}

      {type !== 'notice' && ( // File URL and Name not for notices
        <>
            <div>
                <Label htmlFor={`${activeTab}FileUrl`}>File URL (Optional, direct link to the file)</Label>
                <Input id={`${activeTab}FileUrl`} {...formInstance.register("fileUrl")} placeholder="https://example.com/document.pdf" />
                {formInstance.formState.errors.fileUrl && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.fileUrl as any).message}</p>}
                <p className="text-xs text-muted-foreground mt-1">Actual file upload feature will be added later. For now, please provide a public URL if applicable.</p>
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
      {type === 'homework' && formInstance.formState.errors.division && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors.division as any).message}</p>}
      
      {(type === 'circular' || type === 'notice') && <p className="text-xs text-muted-foreground mt-1">Optionally select grade and division to target specific students. Leave empty for school-wide content.</p>}
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
            <TabsTrigger value="notice">Notices</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
            <TabsTrigger value="circular">Circulars</TabsTrigger>
            <TabsTrigger value="textbook">Textbooks</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
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
                 <p className="text-xs text-muted-foreground mt-1">Provide a direct link to the PDF if available.</p>
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
                        division="" // Not used for textbooks
                        onDivisionChange={() => {}} // No-op
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
                <Label htmlFor="galleryImageFiles">Upload Images (up to 10) *</Label>
                <Input 
                  id="galleryImageFiles"
                  type="file" 
                  multiple 
                  accept="image/*" 
                  {...formGallery.register("imageFiles")}
                />
                {formGallery.formState.errors.imageFiles && <p className="text-sm text-destructive mt-1">{(formGallery.formState.errors.imageFiles as any)?.message}</p>}
                 <p className="text-xs text-muted-foreground mt-1">Select one or more image files. Max 10 images.</p>
              </div>
               <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Gallery
              </Button>
            </form>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}

