
"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { SpecialAlert } from "@/types";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Megaphone, CheckCircle, UploadCloud, X } from "lucide-react";

const MAX_DATA_URI_SIZE_BYTES = 1000000; // Approx 1MB for Firestore field limit
const MAX_RAW_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB for initial client-side check

const specialAlertSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long.").max(100),
  message: z.string().min(10, "Message must be at least 10 characters long.").max(500),
  isActive: z.boolean(),
  imageUrl: z.string().optional(),
});

type SpecialAlertFormValues = z.infer<typeof specialAlertSchema>;

export function SpecialAlertForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SpecialAlertFormValues>({
    resolver: zodResolver(specialAlertSchema),
    defaultValues: {
      title: "",
      message: "",
      isActive: false,
      imageUrl: "",
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    const fetchCurrentAlert = async () => {
      setIsLoading(true);
      const alertDocRef = doc(db, "site_config", "special_alert");
      const docSnap = await getDoc(alertDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as SpecialAlert;
        reset({
          title: data.title,
          message: data.message,
          isActive: data.isActive,
          imageUrl: data.imageUrl || "",
        });
        if (data.imageUrl) {
          setImagePreview(data.imageUrl);
        }
      }
      setIsLoading(false);
    };
    fetchCurrentAlert();
  }, [reset]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImageFile(null);
    setImagePreview(null);
    setValue("imageUrl", "");
    const input = document.getElementById("alertImageUpload") as HTMLInputElement;
    if (input) input.value = "";
  };

  const onSubmit: SubmitHandler<SpecialAlertFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You are not authenticated.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    let finalImageUrl = data.imageUrl || "";

    if (selectedImageFile) {
        try {
            const generatedDataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(selectedImageFile);
            });

            if (generatedDataUri.length > MAX_DATA_URI_SIZE_BYTES) {
                toast({
                    title: "Image Too Large",
                    description: "The selected image is too large (over 1MB) and was not saved. Please use a smaller image. Your previous image (if any) is kept.",
                    variant: "destructive",
                });
                // finalImageUrl remains as the previously loaded URL
            } else {
                finalImageUrl = generatedDataUri;
            }
        } catch (error) {
             toast({ title: "Image Processing Error", description: "Could not process the selected image.", variant: "destructive" });
        }
    } else if (!imagePreview) {
        finalImageUrl = "";
    }
    
    const alertData: SpecialAlert = {
      title: data.title,
      message: data.message,
      isActive: data.isActive,
      imageUrl: finalImageUrl,
      postedByUid: user.uid,
      postedByName: user.displayName || "Teacher",
      timestamp: serverTimestamp(),
    };

    try {
      const alertDocRef = doc(db, "site_config", "special_alert");
      await setDoc(alertDocRef, alertData);
      toast({
        title: "Special Alert Updated",
        description: `The alert has been successfully ${data.isActive ? 'activated' : 'deactivated'}.`,
      });
      setSelectedImageFile(null); // Clear selected file after successful submission
    } catch (error: any) {
      console.error("Error updating special alert:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update the special alert.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading current alert status...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
          <Megaphone className="h-8 w-8" />
          Manage Special Alert
        </CardTitle>
        <CardDescription>
          Create or update a special pop-up message that will be shown to all students upon logging in. 
          Use this for urgent announcements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Alert Title *</Label>
            <Input id="title" {...register("title")} placeholder="e.g., School Closed Tomorrow" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Alert Message *</Label>
            <Textarea id="message" {...register("message")} placeholder="e.g., Due to heavy rainfall, the school will remain closed on..." rows={4} />
            {errors.message && <p className="text-sm text-destructive mt-1">{errors.message.message}</p>}
          </div>

           <div className="space-y-2">
            <Label htmlFor="alertImageUpload">Attach Image (Optional)</Label>
            <Input id="alertImageUpload" type="file" accept="image/*" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            {imagePreview && (
                <div className="relative group w-fit mt-2">
                    <Image src={imagePreview} alt="Alert Preview" width={120} height={120} className="rounded-md object-cover border"/>
                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={removeImage}>
                        <X className="h-4 w-4"/>
                    </Button>
                </div>
            )}
           </div>

          <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div>
              <Label htmlFor="isActive" className="text-base font-medium">Activate Alert</Label>
              <p className="text-sm text-muted-foreground">
                Turn this on to show the alert to all students. Turn it off to hide it.
              </p>
            </div>
          </div>
          {errors.isActive && <p className="text-sm text-destructive mt-1">{errors.isActive.message}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isActive ? 'Post or Update Active Alert' : 'Save as Inactive / Deactivate'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
