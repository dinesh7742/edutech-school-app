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
import { GradeDivisionSelector } from "@/components/auth/GradeDivisionSelector"; // Assuming this can be reused
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud } from "lucide-react";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { db, storage } from "@/lib/firebase";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Schemas for different content types
const noticeSchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(10, "Content is required"),
  // targetAll: z.boolean().default(false),
  grade: z.string().optional(),
  division: z.string().optional(),
});
type NoticeFormValues = z.infer<typeof noticeSchema>;

const fileUploadSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  fileUrl: z.string().url("Please provide a valid URL for the file.").or(z.literal("")), // Placeholder for actual file upload
  fileName: z.string().optional(), // To store original file name
  grade: z.string().min(1, "Grade is required"),
  division: z.string().min(1, "Division is required"),
});
type FileUploadFormValues = z.infer<typeof fileUploadSchema>; // For Homework, Circulars

const textbookSchema = z.object({
  title: z.string().min(3, "Title is required"),
  subject: z.string().min(2, "Subject is required"),
  fileUrl: z.string().url("Please provide a valid URL for the PDF.").or(z.literal("")),
  fileName: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
});
type TextbookFormValues = z.infer<typeof textbookSchema>;

const photoGallerySchema = z.object({
  title: z.string().min(3, "Title is required"),
  imageUrls: z.array(z.string().url("Each URL must be valid.")).min(1, "At least one image URL is required").max(10, "Maximum 10 images"),
});
type PhotoGalleryFormValues = z.infer<typeof photoGallerySchema>;


export function PostContentForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("notice");
  
  // Separate form instances for each tab might be cleaner
  // Or reset form on tab change if using one. For now, one form with conditional fields
  const formNotice = useForm<NoticeFormValues>({ resolver: zodResolver(noticeSchema), defaultValues: { grade: user?.grade || "1", division: user?.division || "A"} });
  const formHomework = useForm<FileUploadFormValues>({ resolver: zodResolver(fileUploadSchema), defaultValues: { grade: user?.grade || "1", division: user?.division || "A"} });
  const formCircular = useForm<FileUploadFormValues>({ resolver: zodResolver(fileUploadSchema), defaultValues: { grade: user?.grade || "1", division: user?.division || "A"} }); // Similar to homework, can simplify
  const formTextbook = useForm<TextbookFormValues>({ resolver: zodResolver(textbookSchema), defaultValues: { grade: user?.grade || "1" }});
  const formGallery = useForm<PhotoGalleryFormValues>({ resolver: zodResolver(photoGallerySchema), defaultValues: { imageUrls: [""]}});


  const handleFormSubmit = async (data: any, type: string) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    console.log(`Submitting ${type}:`, data); // Placeholder for actual submission logic

    // Example Firestore submission (needs to be adapted for each type)
    // try {
    //   await addDoc(collection(db, type), {
    //     ...data,
    //     postedByUid: user.uid,
    //     postedByName: user.displayName,
    //     timestamp: serverTimestamp(),
    //   });
    //   toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Posted Successfully` });
    //   // Reset form based on type
    //   if (type === 'notices') formNotice.reset();
    //   // ... reset other forms
    // } catch (e) {
    //   toast({ title: "Error", description: `Failed to post ${type}.`, variant: "destructive" });
    // }

    // Mock submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Submission`,
      description: `Data for ${type} received. Actual posting to Firebase is not yet implemented.`,
    });
    // Reset specific form
    if (type === 'notice') formNotice.reset({ grade: user?.grade || "1", division: user?.division || "A"});
    if (type === 'homework') formHomework.reset({ grade: user?.grade || "1", division: user?.division || "A", fileUrl: "", fileName: ""});
    if (type === 'circular') formCircular.reset({ grade: user?.grade || "1", division: user?.division || "A", fileUrl: "", fileName: ""});
    if (type === 'textbook') formTextbook.reset({ grade: user?.grade || "1", fileUrl: "", fileName: ""});
    if (type === 'gallery') formGallery.reset({imageUrls: [""]});

    setIsLoading(false);
  };

  const renderFileUploadFields = (formInstance: any) => ( // Quick hack for multiple forms. Better to have specific components.
    <>
       <div>
        <Label htmlFor={`${activeTab}Title`}>Title *</Label>
        <Input id={`${activeTab}Title`} {...formInstance.register("title")} />
        {formInstance.formState.errors.title && <p className="text-sm text-destructive mt-1">{formInstance.formState.errors.title.message}</p>}
      </div>
      <div>
        <Label htmlFor={`${activeTab}Description`}>Description (Optional)</Label>
        <Textarea id={`${activeTab}Description`} {...formInstance.register("description")} />
      </div>
       <div>
        <Label htmlFor={`${activeTab}FileUrl`}>File URL * (Direct link to the file)</Label>
        <Input id={`${activeTab}FileUrl`} {...formInstance.register("fileUrl")} placeholder="https://example.com/document.pdf" />
        {formInstance.formState.errors.fileUrl && <p className="text-sm text-destructive mt-1">{formInstance.formState.errors.fileUrl.message}</p>}
        <p className="text-xs text-muted-foreground mt-1">Actual file upload feature will be added later. For now, please provide a public URL.</p>
      </div>
      <div>
        <Label htmlFor={`${activeTab}FileName`}>File Name (Optional, e.g., chapter5.pdf)</Label>
        <Input id={`${activeTab}FileName`} {...formInstance.register("fileName")} />
      </div>
      <GradeDivisionSelector
        grade={formInstance.watch("grade")}
        onGradeChange={(value) => formInstance.setValue("grade", value)}
        division={formInstance.watch("division")}
        onDivisionChange={(value) => formInstance.setValue("division", value)}
      />
      {formInstance.formState.errors.grade && <p className="text-sm text-destructive mt-1">{formInstance.formState.errors.grade.message}</p>}
      {formInstance.formState.errors.division && <p className="text-sm text-destructive mt-1">{formInstance.formState.errors.division.message}</p>}
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
              <div>
                <Label htmlFor="noticeTitle">Title *</Label>
                <Input id="noticeTitle" {...formNotice.register("title")} />
                {formNotice.formState.errors.title && <p className="text-sm text-destructive mt-1">{formNotice.formState.errors.title.message}</p>}
              </div>
              <div>
                <Label htmlFor="noticeContent">Content *</Label>
                <Textarea id="noticeContent" {...formNotice.register("content")} rows={5} />
                {formNotice.formState.errors.content && <p className="text-sm text-destructive mt-1">{formNotice.formState.errors.content.message}</p>}
              </div>
               <GradeDivisionSelector
                  grade={formNotice.watch("grade") || ""}
                  onGradeChange={(value) => formNotice.setValue("grade", value)}
                  division={formNotice.watch("division") || ""}
                  onDivisionChange={(value) => formNotice.setValue("division", value)}
                />
                <p className="text-xs text-muted-foreground">Select grade and division if this notice is specific, or leave for all (future feature).</p>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Notice
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="homework">
             <form onSubmit={formHomework.handleSubmit(data => handleFormSubmit(data, "homework"))} className="space-y-4">
              {renderFileUploadFields(formHomework)}
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Homework
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="circular">
            <form onSubmit={formCircular.handleSubmit(data => handleFormSubmit(data, "circular"))} className="space-y-4">
              {renderFileUploadFields(formCircular)} {/* Assuming circulars also target specific grades/divisions */}
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
                <Label htmlFor="textbookFileUrl">PDF URL *</Label>
                <Input id="textbookFileUrl" {...formTextbook.register("fileUrl")} placeholder="https://example.com/textbook.pdf"/>
                {formTextbook.formState.errors.fileUrl && <p className="text-sm text-destructive mt-1">{formTextbook.formState.errors.fileUrl.message}</p>}
                 <p className="text-xs text-muted-foreground mt-1">Provide a direct link to the PDF.</p>
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
                        division="" // Division not typically needed for textbook, hide or make optional
                        onDivisionChange={() => {}} // No-op
                      />
                    )}
                  />
                  {/* Simplified Grade selector for textbooks */}
                  {/* <Select onValueChange={(value) => formTextbook.setValue("grade", value)} value={formTextbook.watch("grade")}>
                    <SelectTrigger id="textbookGrade"><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>{Array.from({length:8}, (_,i) => (i+1).toString()).map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                  </Select> */}
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
              <div className="space-y-2">
                <Label>Image URLs (at least 1, max 10) *</Label>
                {formGallery.watch("imageUrls").map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      {...formGallery.register(`imageUrls.${index}` as const)}
                      placeholder={`https://example.com/image${index + 1}.jpg`}
                    />
                    {formGallery.watch("imageUrls").length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        const currentUrls = formGallery.getValues("imageUrls");
                        currentUrls.splice(index, 1);
                        formGallery.setValue("imageUrls", currentUrls);
                      }}>Remove</Button>
                    )}
                  </div>
                ))}
                {formGallery.formState.errors.imageUrls && <p className="text-sm text-destructive mt-1">{ (formGallery.formState.errors.imageUrls as any)?.message || (formGallery.formState.errors.imageUrls as any)?.root?.message}</p>}
                 { (formGallery.formState.errors.imageUrls as any)?.map((err: any, i:number) => err && <p key={i} className="text-sm text-destructive mt-1">{err.message}</p>) }


                <Button type="button" variant="outline" size="sm" onClick={() => {
                    const currentUrls = formGallery.getValues("imageUrls");
                    if (currentUrls.length < 10) {
                         formGallery.setValue("imageUrls", [...currentUrls, ""]);
                    } else {
                        toast({title: "Limit Reached", description: "You can add a maximum of 10 images."})
                    }
                }}>Add Image URL</Button>
                 <p className="text-xs text-muted-foreground mt-1">Provide direct links to images. Recommended: 5 images.</p>
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
