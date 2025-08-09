
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";

const MAX_DATA_URI_SIZE_BYTES = 1000000; // Approx 1MB for Firestore field limit
const MAX_RAW_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB for initial client-side check


const teacherProfileSchema = z.object({
  displayName: z.string().min(3, "Name must be at least 3 characters"),
  whatsAppNumber: z.string().optional().refine(val => {
    if (!val) return true; // Optional field
    return /^\+?[1-9]\d{1,14}$/.test(val.replace(/\s/g, ''));
  }, "Invalid WhatsApp number. Use an international format (e.g., +91XXXXXXXXXX)."),
  educationQualification: z.string().optional(),
  subjectTaught: z.string().optional(),
  address: z.string().optional(),
  photoUrl: z.string().optional(),
});

type TeacherProfileFormValues = z.infer<typeof teacherProfileSchema>;

export function TeacherProfileForm() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const defaultPhotoPlaceholder = `https://placehold.co/128x128.png?text=My+Photo`;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TeacherProfileFormValues>({
    resolver: zodResolver(teacherProfileSchema),
    defaultValues: {
      displayName: "",
      whatsAppNumber: "",
      educationQualification: "",
      subjectTaught: "",
      address: "",
      photoUrl: "",
    }
  });

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      getDoc(userDocRef).then(docSnap => {
        const dataToReset: Partial<TeacherProfileFormValues> = {
          displayName: user.displayName || "",
        };
        if (docSnap.exists()) {
          const userData = docSnap.data();
          dataToReset.whatsAppNumber = userData.whatsAppNumber || "";
          dataToReset.educationQualification = userData.educationQualification || "";
          dataToReset.subjectTaught = userData.subjectTaught || "";
          dataToReset.address = userData.address || "";
          dataToReset.photoUrl = userData.photoUrl || user.photoURL || "";
        }
        reset(dataToReset);
        setPhotoPreview(dataToReset.photoUrl || defaultPhotoPlaceholder);
      });
    }
  }, [user, reset, defaultPhotoPlaceholder]);


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
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      const currentPhotoUrlInForm = watch("photoUrl"); 
      setPhotoPreview(currentPhotoUrlInForm || defaultPhotoPlaceholder);
    }
  };


  const onSubmit: SubmitHandler<TeacherProfileFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    
    let finalPhotoUrlToSave = data.photoUrl;

    if (selectedFile) {
        try {
            const generatedDataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            });
            if (generatedDataUri.length > MAX_DATA_URI_SIZE_BYTES) {
                toast({
                    title: "Image Too Large to Save",
                    description: "The selected image is too large (over 1MB). Please use a smaller image. Your previous photo (if any) was kept.",
                    variant: "destructive",
                });
                // Do not update the URL if it's too large
            } else {
                finalPhotoUrlToSave = generatedDataUri;
            }
        } catch (error) {
            toast({ title: "Image Processing Error", description: "Could not process the image.", variant: "destructive" });
        }
    }


    try {
      const updatesToAuthUser: { displayName?: string } = {};
      if (data.displayName !== user.displayName) {
        updatesToAuthUser.displayName = data.displayName;
      }

      if (auth.currentUser && Object.keys(updatesToAuthUser).length > 0) {
        await updateAuthProfile(auth.currentUser, updatesToAuthUser);
      }

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { 
        displayName: data.displayName,
        whatsAppNumber: data.whatsAppNumber || null,
        educationQualification: data.educationQualification || null,
        subjectTaught: data.subjectTaught || null,
        address: data.address || null,
        photoUrl: finalPhotoUrlToSave,
       }, { merge: true });
      
      setUser(prevUser => {
        if (!prevUser) return null;
        return { 
          ...prevUser, 
          displayName: data.displayName,
          whatsAppNumber: data.whatsAppNumber || null,
          photoURL: finalPhotoUrlToSave || null,
        };
      });

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Teacher profile update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Teacher Profile</CardTitle>
        <CardDescription>Manage your account details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div>
            <Label htmlFor="photoUpload">Profile Photo</Label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <Image src={photoPreview} alt="Profile Preview" width={100} height={100} className="rounded-full object-cover border h-24 w-24" />
              ) : (
                <div className="flex items-center justify-center h-24 w-24 rounded-full border border-dashed bg-muted/50">
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <Input 
                id="photoUpload" 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Upload a photo. (Max 2MB file. Smaller images recommended).</p>
          </div>

          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" {...register("displayName")} />
            {errors.displayName && <p className="text-sm text-destructive mt-1">{errors.displayName.message}</p>}
          </div>
          
           <div>
            <Label htmlFor="educationQualification">Educational Qualification</Label>
            <Input id="educationQualification" {...register("educationQualification")} placeholder="e.g., M.Sc, B.Ed" />
            {errors.educationQualification && <p className="text-sm text-destructive mt-1">{errors.educationQualification.message}</p>}
          </div>
          
           <div>
            <Label htmlFor="subjectTaught">Subject Taught</Label>
            <Input id="subjectTaught" {...register("subjectTaught")} placeholder="e.g., Mathematics, Science" />
            {errors.subjectTaught && <p className="text-sm text-destructive mt-1">{errors.subjectTaught.message}</p>}
          </div>

          <div>
            <Label htmlFor="whatsAppNumber">WhatsApp Number (for notifications)</Label>
            <Input id="whatsAppNumber" {...register("whatsAppNumber")} placeholder="+91XXXXXXXXXX" />
            {errors.whatsAppNumber && <p className="text-sm text-destructive mt-1">{errors.whatsAppNumber.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">Enter with country code (e.g., +91 for India). This will be used for important notifications.</p>
          </div>
          
           <div>
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} placeholder="Enter your full address"/>
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email (cannot be changed)</Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted/50"/>
          </div>
          
          <div>
            <Label htmlFor="role">Role (cannot be changed)</Label>
            <Input id="role" value={user?.role || ""} disabled className="bg-muted/50"/>
          </div>

          {user?.role === 'teacher' && (
            <>
              <div>
                <Label htmlFor="grade">Assigned Grade (cannot be changed here)</Label>
                <Input id="grade" value={user?.grade || "N/A"} disabled className="bg-muted/50"/>
              </div>
              <div>
                <Label htmlFor="division">Assigned Division (cannot be changed here)</Label>
                <Input id="division" value={user?.division || "N/A"} disabled className="bg-muted/50"/>
              </div>
               <p className="text-xs text-muted-foreground">Assigned grade and division are managed by administrators.</p>
            </>
          )}
        
          <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
