
"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Assuming you have storage configured in firebase.ts
import type { StudentProfile } from "@/types";
import { Loader2, UploadCloud, UserCircle2, CalendarDays } from "lucide-react";
import Image from "next/image";

const religionOptions = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  motherName: z.string().optional(),
  dateOfBirth: z.string().optional().refine((val) => {
    if (!val) return true; // Optional field
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, "Invalid date format. Use YYYY-MM-DD"),
  gender: z.string().optional(),
  contactNumber: z.string().optional().refine(val => !val || /^\d{10}$/.test(val), "Must be 10 digits"),
  aadharCardNumber: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), "Must be 12 digits"),
  penNumber: z.string().optional(),
  grNumber: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  fullAddress: z.string().optional(),
  photoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function MySelfForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const defaultPhotoPlaceholder = "https://placehold.co/128x128.png?text=Student+Photo";

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        setIsFetchingProfile(true);
        const profileDocRef = doc(db, "studentProfiles", user.uid);
        const profileDoc = await getDoc(profileDocRef);
        

        if (profileDoc.exists()) {
          const data = profileDoc.data() as StudentProfile;
          reset({ 
            firstName: data.firstName || "",
            middleName: data.middleName || "",
            lastName: data.lastName || "",
            motherName: data.motherName || "",
            dateOfBirth: data.dateOfBirth || "",
            gender: data.gender || "",
            contactNumber: data.contactNumber || "",
            aadharCardNumber: data.aadharCardNumber || "",
            penNumber: data.penNumber || "",
            grNumber: data.grNumber || "",
            religion: data.religion || "",
            caste: data.caste || "",
            fullAddress: data.fullAddress || "",
            photoUrl: data.photoUrl || defaultPhotoPlaceholder, // Use placeholder if photoUrl is empty
          });
          setPhotoPreview(data.photoUrl || defaultPhotoPlaceholder);
        } else {
          // Pre-fill from auth if profile doesn't exist
          const nameParts = user.displayName?.split(" ") || [];
          reset({
            firstName: nameParts[0] || "",
            lastName: nameParts.length > 1 ? nameParts[nameParts.length -1] : "",
            motherName: "",
            dateOfBirth: "",
            gender: "",
            contactNumber: "",
            aadharCardNumber: "",
            penNumber: "",
            grNumber: "",
            religion: "",
            caste: "",
            fullAddress: "",
            photoUrl: defaultPhotoPlaceholder, // Default placeholder for new profiles
          });
          setPhotoPreview(defaultPhotoPlaceholder);
        }
        setIsFetchingProfile(false);
      };
      fetchProfile();
    }
  }, [user, reset, defaultPhotoPlaceholder]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const profileData: StudentProfile = {
        uid: user.uid,
        email: user.email || undefined,
        grade: user.grade || "", 
        division: user.division || "", 
        ...data,
        photoUrl: data.photoUrl === defaultPhotoPlaceholder ? "" : data.photoUrl || "",
      };

      await setDoc(doc(db, "studentProfiles", user.uid), profileData, { merge: true });

      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const watchedPhotoUrl = watch("photoUrl");
  useEffect(() => {
    if (watchedPhotoUrl && watchedPhotoUrl.startsWith('http')) {
      setPhotoPreview(watchedPhotoUrl);
    } else if (!watchedPhotoUrl) {
      setPhotoPreview(defaultPhotoPlaceholder);
    }
  }, [watchedPhotoUrl, defaultPhotoPlaceholder]);


  if (isFetchingProfile && !user) { 
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Loading your information...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">My Profile</CardTitle>
        <CardDescription>Keep your information up to date. Fields marked with * are required.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" {...register("middleName")} />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="motherName">Mother's Name</Label>
              <Input id="motherName" {...register("motherName")} />
              {errors.motherName && <p className="text-sm text-destructive mt-1">{errors.motherName.message}</p>}
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="text-sm text-destructive mt-1">{errors.dateOfBirth.message}</p>}
            </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <Label htmlFor="gender">Gender</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
            </div>
             <div>
              <Label htmlFor="photoUrl">Photo URL</Label>
              <Input 
                id="photoUrl" 
                {...register("photoUrl")} 
                placeholder={defaultPhotoPlaceholder}
                onChange={(e) => {
                  setValue("photoUrl", e.target.value);
                  if (e.target.value && e.target.value.startsWith('http')) {
                    setPhotoPreview(e.target.value);
                  } else {
                     setPhotoPreview(defaultPhotoPlaceholder); 
                  }
                }}
              />
               {errors.photoUrl && <p className="text-sm text-destructive mt-1">{errors.photoUrl.message}</p>}
              {photoPreview ? (
                  <Image src={photoPreview} alt="Profile Preview" width={128} height={128} className="mt-2 rounded-md object-cover h-32 w-32 border" data-ai-hint="profile photo"/>
              ) : (
                <div className="mt-2 flex items-center justify-center h-32 w-32 rounded-md border border-dashed bg-muted/50">
                  <UploadCloud className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Enter a direct URL to your photo. Actual file upload will be supported later.</p>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gradeDisplay">Grade</Label>
              <Input id="gradeDisplay" value={user?.grade || "N/A"} disabled className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="divisionDisplay">Division</Label>
              <Input id="divisionDisplay" value={user?.division || "N/A"} disabled className="bg-muted/50" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" {...register("contactNumber")} type="tel" placeholder="9876543210" />
              {errors.contactNumber && <p className="text-sm text-destructive mt-1">{errors.contactNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="aadharCardNumber">Aadhar Card Number</Label>
              <Input id="aadharCardNumber" {...register("aadharCardNumber")} placeholder="123456789012" />
              {errors.aadharCardNumber && <p className="text-sm text-destructive mt-1">{errors.aadharCardNumber.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="penNumber">PEN Number</Label>
              <Input id="penNumber" {...register("penNumber")} />
            </div>
            <div>
              <Label htmlFor="grNumber">G.R. Number</Label>
              <Input id="grNumber" {...register("grNumber")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="religion">Religion</Label>
               <Controller
                name="religion"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="religion">
                      <SelectValue placeholder="Select religion" />
                    </SelectTrigger>
                    <SelectContent>
                      {religionOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="caste">Caste (if any)</Label>
              <Input id="caste" {...register("caste")} />
            </div>
          </div>

          <div>
            <Label htmlFor="fullAddress">Full Address</Label>
            <Textarea id="fullAddress" {...register("fullAddress")} placeholder="123 Main St, Your City, Your State, PIN" />
          </div>

          <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isFetchingProfile}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

    
