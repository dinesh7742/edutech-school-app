
"use client";

import { useState, ChangeEvent, useEffect } from "react";
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
import { Loader2, UploadCloud, X, FileText, ClipboardList, BookOpen, Image as ImageIcon, Video, Trash2, FileIcon, Film, ImagePlus } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import type { Notice, Homework, HomeworkAttachment } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAX_DATA_URI_SIZE_BYTES = 1000000; // Approx 1MB for Firestore field limit
const MAX_RAW_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB for file uploads

// Schemas for different content types
const noticeSchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(10, "Content is required"),
  grade: z.string().optional(),
  division: z.string().optional(),
});
type NoticeFormValues = z.infer<typeof noticeSchema>;

const homeworkSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  division: z.string().min(1, "Division is required"),
  subject: z.string().min(1, "Subject is required"),
  dueDate: z.string().refine((val) => {
    if (!val) return false;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Due date is required and must be a valid date"),
  // title and description are removed from schema
  title: z.string().optional(),
  description: z.string().optional(),
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
  coverImageUrl: z.string().optional(), // Will store Data URI or be empty
  fileName: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
});
type TextbookFormValues = z.infer<typeof textbookSchema>;

const photoGallerySchema = z.object({
  title: z.string().min(3, "Event/Album title is required"),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  // imageFiles will be handled by component state, not directly by react-hook-form for this field
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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("notice");

  const defaultGradeDivision = { grade: user?.grade || "1", division: user?.division || "A" };

  const formNotice = useForm<NoticeFormValues>({ resolver: zodResolver(noticeSchema), defaultValues: { grade: defaultGradeDivision.grade, division: defaultGradeDivision.division } });
  
  const formHomework = useForm<HomeworkFormValues>({ resolver: zodResolver(homeworkSchema), defaultValues: defaultGradeDivision });
  const [homeworkFiles, setHomeworkFiles] = useState<File[]>([]);
  const [homeworkFilePreviews, setHomeworkFilePreviews] = useState<{name: string, type: string, url: string}[]>([]);


  const formCircular = useForm<CircularFormValues>({ resolver: zodResolver(circularSchema), defaultValues: { grade: defaultGradeDivision.grade, division: defaultGradeDivision.division } });
  
  const formTextbook = useForm<TextbookFormValues>({ resolver: zodResolver(textbookSchema), defaultValues: { grade: user?.grade || "1", coverImageUrl: "" } });
  const [textbookCoverPreview, setTextbookCoverPreview] = useState<string | null>(null);
  const [selectedTextbookCoverFile, setSelectedTextbookCoverFile] = useState<File | null>(null);

  const formGallery = useForm<PhotoGalleryFormValues>({ resolver: zodResolver(photoGallerySchema), defaultValues: {} });
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]);

  const formLiveClass = useForm<LiveClassFormValues>({ resolver: zodResolver(liveClassSchema), defaultValues: { grade: defaultGradeDivision.grade, division: defaultGradeDivision.division } });

  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [loadingRecentNotices, setLoadingRecentNotices] = useState(true);
  const [recentHomework, setRecentHomework] = useState<Homework[]>([]);
  const [loadingRecentHomework, setLoadingRecentHomework] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchRecentContent = async () => {
      // Fetch Recent Notices
      setLoadingRecentNotices(true);
      try {
        const noticesRef = collection(db, "notices");
        const noticesQuery = query(noticesRef, where("postedByUid", "==", user.uid), orderBy("timestamp", "desc"), limit(3));
        const noticeSnapshot = await getDocs(noticesQuery);
        setRecentNotices(noticeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
      } catch (error) {
        console.error("Error fetching recent notices:", error);
        toast({ title: "Error", description: "Could not load your recent notices.", variant: "destructive" });
      }
      setLoadingRecentNotices(false);

      // Fetch Recent Homework
      setLoadingRecentHomework(true);
      try {
        const homeworkRef = collection(db, "homework");
        const homeworkQuery = query(homeworkRef, where("postedByUid", "==", user.uid), orderBy("timestamp", "desc"), limit(3));
        const homeworkSnapshot = await getDocs(homeworkQuery);
        setRecentHomework(homeworkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Homework)));
      } catch (error) {
        console.error("Error fetching recent homework:", error);
        toast({ title: "Error", description: "Could not load your recent homework.", variant: "destructive" });
      }
      setLoadingRecentHomework(false);
    };

    fetchRecentContent();
  }, [user, toast]);


  const handleTextbookCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
        toast({
          title: "Image File Too Large",
          description: `Please choose an image file smaller than ${MAX_RAW_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }
      setSelectedTextbookCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTextbookCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedTextbookCoverFile(null);
      setTextbookCoverPreview(null);
    }
  };
  
    const handleHomeworkFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const filesArray = Array.from(event.target.files);
            const validFiles: File[] = [];

            for (const file of filesArray) {
                if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
                    toast({
                        title: "File Too Large",
                        description: `${file.name} is too large (max ${MAX_RAW_FILE_SIZE_BYTES / 1024 / 1024}MB). It has been skipped.`,
                        variant: "destructive",
                        duration: 5000,
                    });
                    continue;
                }
                validFiles.push(file);

                const reader = new FileReader();
                reader.onloadend = () => {
                    setHomeworkFilePreviews(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        url: reader.result as string,
                    }]);
                };
                reader.readAsDataURL(file);
            }
            setHomeworkFiles(prev => [...prev, ...validFiles]);
        }
    };
    
    const removeHomeworkFile = (index: number) => {
        setHomeworkFiles(prev => prev.filter((_, i) => i !== index));
        setHomeworkFilePreviews(prev => prev.filter((_, i) => i !== index));
    };


  const handleGalleryFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      let validFiles: File[] = [];
      let newPreviews: string[] = [];

      for (const file of filesArray) {
        if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
          toast({
            title: "Image File Too Large",
            description: `${file.name} is too large (max ${MAX_RAW_FILE_SIZE_BYTES / 1024 / 1024}MB). It has been skipped.`,
            variant: "destructive",
            duration: 5000,
          });
          continue; 
        }
        validFiles.push(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
      setSelectedGalleryFiles(prev => [...prev, ...validFiles]); 
    }
  };
  
  const removeGalleryImage = (index: number) => {
    setSelectedGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryImagePreviews(prev => prev.filter((_, i) => i !== index));
  };


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

      if (type === "homework") {
        collectionName = "homework";

        // Auto-generate title for homework
        documentData.title = `Homework: ${data.subject} - ${data.dueDate}`;
        
        const uploadedAttachments: HomeworkAttachment[] = [];
        if (homeworkFiles.length > 0) {
            for (const file of homeworkFiles) {
                const storageRef = ref(storage, `homework/${user.uid}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                
                let fileType: HomeworkAttachment['type'] = 'other';
                if (file.type.startsWith('image/')) fileType = 'image';
                else if (file.type.startsWith('video/')) fileType = 'video';
                else if (file.type === 'application/pdf') fileType = 'pdf';

                uploadedAttachments.push({
                    name: file.name,
                    url: downloadURL,
                    type: fileType,
                });
            }
        }
        documentData.attachments = uploadedAttachments;
      } else if (type === "textbook") {
        collectionName = "textbooks";
        if (selectedTextbookCoverFile) {
          const coverDataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedTextbookCoverFile);
          });
          if (coverDataUri.length > MAX_DATA_URI_SIZE_BYTES) {
            toast({
              title: "Textbook Cover Too Large",
              description: "The cover image is too large (over 1MB encoded) and was not saved. Please use a smaller image. The textbook details were saved without the cover.",
              variant: "destructive",
              duration: 7000,
            });
            documentData.coverImageUrl = data.coverImageUrl || "";
          } else {
            documentData.coverImageUrl = coverDataUri;
          }
        } else {
           documentData.coverImageUrl = data.coverImageUrl || "";
        }
      } else if (type === "gallery") {
        collectionName = "galleryAlbums";
        const uploadedImages: { url: string; alt?: string }[] = [];
        if (selectedGalleryFiles.length > 0) {
          for (let i = 0; i < selectedGalleryFiles.length; i++) {
            const file = selectedGalleryFiles[i];
            try {
              const imageDataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });

              if (imageDataUri.length > MAX_DATA_URI_SIZE_BYTES) {
                toast({
                  title: "Gallery Image Skipped",
                  description: `${file.name} is too large (over 1MB encoded) and was not saved.`,
                  variant: "destructive",
                  duration: 5000,
                });
                continue; 
              }
              uploadedImages.push({
                url: imageDataUri,
                alt: `${data.title || 'Gallery Image'} ${i + 1}`
              });
            } catch (fileError) {
              console.error("Error processing gallery file:", file.name, fileError);
              toast({
                title: "File Processing Error",
                description: `Could not process ${file.name}. It was skipped.`,
                variant: "destructive",
              });
            }
          }
        }
        documentData.images = uploadedImages;
      } else {
         switch (type) {
            case "notice":
              collectionName = "notices";
              documentData.grade = data.grade || null;
              documentData.division = data.division || null;
              break;
            case "circular":
              collectionName = "circulars";
              documentData.grade = data.grade || null;
              documentData.division = data.division || null;
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
      }


      await addDoc(collection(db, collectionName), documentData);

      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Posted Successfully` });

      if (type === 'notice') {
        formNotice.reset({ title: "", content: "", grade: defaultGradeDivision.grade, division: defaultGradeDivision.division });
        setRecentNotices(prev => [{...documentData, id: 'new', timestamp: Timestamp.now()}, ...prev].slice(0,3)); // Optimistic update
      }
      if (type === 'homework') {
        formHomework.reset({ grade: defaultGradeDivision.grade, division: defaultGradeDivision.division, subject: "", dueDate: "" });
        setHomeworkFiles([]);
        setHomeworkFilePreviews([]);
        setRecentHomework(prev => [{...documentData, id: 'new', timestamp: Timestamp.now()}, ...prev].slice(0,3)); // Optimistic update
      }
      if (type === 'circular') formCircular.reset({ title: "", description: "", fileUrl: "", fileName: "", grade: defaultGradeDivision.grade, division: defaultGradeDivision.division });
      if (type === 'textbook') {
        formTextbook.reset({ title: "", subject: "", fileUrl: "", coverImageUrl: "", fileName: "", grade: user?.grade || "1" });
        setTextbookCoverPreview(null);
        setSelectedTextbookCoverFile(null);
        const textbookFileInput = document.getElementById('textbookCoverImageUpload') as HTMLInputElement;
        if (textbookFileInput) textbookFileInput.value = "";
      }
      if (type === 'gallery') {
        formGallery.reset({ title: "", description: "", eventDate: ""});
        setGalleryImagePreviews([]);
        setSelectedGalleryFiles([]);
        const galleryFileInput = document.getElementById('galleryImageUpload') as HTMLInputElement;
        if (galleryFileInput) galleryFileInput.value = "";
      }
      if (type === 'liveClass') formLiveClass.reset({ subject: "", meetingLink: "", description: "", grade: defaultGradeDivision.grade, division: defaultGradeDivision.division });

    } catch (e: any) {
      console.error(`Error posting ${type}:`, e);
      toast({ title: "Error", description: `Failed to post ${type}. ${e.message || 'Firestore document might be too large if many/large images were included.'}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, collectionName: 'notices' | 'homework') => {
    if (!id || id === 'new') {
      toast({ title: "Cannot Delete", description: "This item cannot be deleted right now.", variant: "destructive" });
      return;
    }
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, collectionName, id));

      if (collectionName === 'notices') {
        setRecentNotices(prev => prev.filter(item => item.id !== id));
      } else if (collectionName === 'homework') {
        setRecentHomework(prev => prev.filter(item => item.id !== id));
      }

      toast({
        title: "Post Deleted",
        description: "The item has been successfully removed.",
      });
    } catch (error: any) {
      console.error(`Error deleting post from ${collectionName}:`, error);
      toast({
        title: "Deletion Failed",
        description: error.message || `Could not delete the post from ${collectionName}.`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderSharedFields = (formInstance: any, type: 'homework' | 'circular' | 'notice' | 'liveClass') => (
    <>
      { type !== 'homework' && (
        <div>
          <Label htmlFor={`${activeTab}Title`}>{type === 'liveClass' ? 'Subject / Title *' : 'Title *'}</Label>
          <Input id={`${activeTab}Title`} {...formInstance.register(type === 'liveClass' ? "subject" : "title")} />
          {formInstance.formState.errors[type === 'liveClass' ? "subject" : "title"] && <p className="text-sm text-destructive mt-1">{(formInstance.formState.errors[type === 'liveClass' ? "subject" : "title"] as any).message}</p>}
        </div>
      )}

      {type === 'notice' ? (
        <div>
          <Label htmlFor="noticeContent">Content *</Label>
          <Textarea id="noticeContent" {...formInstance.register("content")} rows={5} />
          {formInstance.formState.errors.content && <p className="text-sm text-destructive mt-1">{formInstance.formState.errors.content.message}</p>}
        </div>
      ) : type !== 'liveClass' && type !== 'homework' ? ( 
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

      {type === 'circular' && (
        <>
          <div>
            <Label htmlFor={`${activeTab}FileUrl`}>File URL (Optional, direct link to the PDF/document)</Label>
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
    <>
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-6 h-auto">
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
              <div className="space-y-2">
                <Label htmlFor="homeworkFiles">Attachments (PDFs, Images, Videos)</Label>
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="homeworkFiles" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">PDF, IMAGE, or VIDEO (MAX 10MB each)</p>
                        </div>
                        <Input id="homeworkFiles" type="file" className="hidden" multiple onChange={handleHomeworkFilesChange} accept="application/pdf,image/*,video/*"/>
                    </label>
                </div>
              </div>
              
              {homeworkFilePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {homeworkFilePreviews.map((file, index) => (
                      <div key={index} className="relative group border rounded-md p-2 flex flex-col items-center gap-2">
                        {file.type.startsWith('image/') ? (
                           <Image src={file.url} alt={`Preview ${file.name}`} width={80} height={80} className="rounded-md object-cover w-full aspect-square" />
                        ) : file.type.startsWith('video/') ? (
                           <div className="flex flex-col items-center justify-center w-full aspect-square bg-slate-200 rounded-md">
                             <Film className="w-10 h-10 text-slate-500" />
                           </div>
                        ) : (
                           <div className="flex flex-col items-center justify-center w-full aspect-square bg-slate-200 rounded-md">
                             <FileIcon className="w-10 h-10 text-slate-500" />
                           </div>
                        )}
                        <p className="text-xs text-center truncate w-full">{file.name}</p>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeHomeworkFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                <Input id="textbookFileUrl" {...formTextbook.register("fileUrl")} placeholder="https://example.com/textbook.pdf" />
                {formTextbook.formState.errors.fileUrl && <p className="text-sm text-destructive mt-1">{formTextbook.formState.errors.fileUrl.message}</p>}
              </div>
              <div>
                <Label htmlFor="textbookCoverImageUpload">Cover Image (Optional)</Label>
                <Input
                  id="textbookCoverImageUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleTextbookCoverFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {textbookCoverPreview ? (
                  <Image src={textbookCoverPreview} alt="Cover Preview" width={100} height={140} className="mt-2 rounded-md object-contain border" data-ai-hint="book cover" />
                ) : (
                  <div className="mt-2 flex items-center justify-center h-36 w-28 rounded-md border border-dashed bg-muted/50">
                    <UploadCloud className="h-10 w-10 text-muted-foreground" data-ai-hint="upload book"/>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Upload a cover image. (Max 2MB file. Very large images might not save due to database limits).</p>
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
                      onDivisionChange={() => { }}
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
                <Label htmlFor="galleryImageUpload">Upload Images (Multiple selection allowed)</Label>
                <Input
                  id="galleryImageUpload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryFilesChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {galleryImagePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {galleryImagePreviews.map((previewUrl, index) => (
                      <div key={index} className="relative group">
                        <Image src={previewUrl} alt={`Preview ${index + 1}`} width={100} height={100} className="rounded-md object-cover w-full aspect-square border" data-ai-hint="gallery event"/>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeGalleryImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                 <p className="text-xs text-muted-foreground mt-1">
                   Upload images from your device. (Max 2MB per file. Very large images might not save due to database limits).
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

    <Card className="w-full max-w-2xl mx-auto shadow-xl mt-8">
        <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary">My Recent Posts</CardTitle>
            <CardDescription>Quick overview of your last few posts. You can delete them here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <section>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Recent Notices</h3>
                {loadingRecentNotices ? (
                    <p className="text-muted-foreground">Loading recent notices...</p>
                ) : recentNotices.length === 0 ? (
                    <p className="text-muted-foreground">No notices posted by you recently.</p>
                ) : (
                    <ul className="space-y-2">
                        {recentNotices.map(notice => (
                            <li key={notice.id} className="p-3 border rounded-md bg-muted/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{notice.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Posted: {notice.timestamp instanceof Timestamp ? notice.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                            {notice.grade && ` | For: Grade ${notice.grade}${notice.division ? ` Div ${notice.division}` : ' (All Div)'}`}
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={isDeleting === notice.id}>
                                                {isDeleting === notice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the notice titled "{notice.title}". This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(notice.id, 'notices')} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <p className="text-sm mt-1 line-clamp-2 whitespace-pre-wrap">{notice.content}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <section>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary"/>Recent Homework</h3>
                {loadingRecentHomework ? (
                     <p className="text-muted-foreground">Loading recent homework...</p>
                ) : recentHomework.length === 0 ? (
                    <p className="text-muted-foreground">No homework posted by you recently.</p>
                ) : (
                    <ul className="space-y-2">
                        {recentHomework.map(hw => (
                             <li key={hw.id} className="p-3 border rounded-md bg-muted/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{hw.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Subject: {hw.subject} | Due: {hw.dueDate ? new Date(hw.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}
                                            <br/>
                                            For: Grade {hw.grade} Div {hw.division} | Posted: {hw.timestamp instanceof Timestamp ? hw.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={isDeleting === hw.id}>
                                                {isDeleting === hw.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the homework titled "{hw.title}". This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(hw.id, 'homework')} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                {hw.description && <p className="text-sm mt-1 line-clamp-2 whitespace-pre-wrap">{hw.description}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
             {/* TODO: Add sections for recent Circulars, Textbooks, Gallery Albums, Live Classes similarly */}
        </CardContent>
    </Card>
    </>
  );
}
