
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeDivisionSelector } from "@/components/auth/GradeDivisionSelector";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { StudentProfile } from "@/types";
import { Loader2, UploadCloud, UserCircle, Briefcase, CalendarDays, Mail, Phone, Award, ShieldCheck, BookUser, Hash, Users, Edit, X } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { updateProfile as updateAuthProfile } from "firebase/auth";

const religionOptions = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"];
const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
const MAX_DATA_URI_SIZE_BYTES = 1000000; // Approx 1MB for Firestore field limit
const MAX_RAW_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB for initial client-side check

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  motherName: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  dateOfBirth: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, "Invalid date format. Use YYYY-MM-DD"),
  gender: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
  division: z.string().min(1, "Division is required"),
  contactNumber: z.string().optional().refine(val => !val || /^\d{10}$/.test(val), "Must be 10 digits"),
  aadharCardNumber: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), "Must be 12 digits"),
  penNumber: z.string().optional(),
  grNumber: z.string().optional(),
  religion: z.string().optional(),
  caste: z.string().optional(),
  fullAddress: z.string().optional(),
  photoUrl: z.string().optional(), 
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface MySelfFormProps {
  studentIdForEdit?: string;
  onSaveSuccess?: () => void;
  isTeacherEditing?: boolean;
}

export function MySelfForm({ studentIdForEdit, onSaveSuccess, isTeacherEditing = false }: MySelfFormProps) {
  const { user: loggedInUser, setUser: setAuthUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
        firstName: "",
        middleName: "",
        lastName: "",
        motherName: "",
        fatherOccupation: "",
        motherOccupation: "",
        dateOfBirth: "",
        gender: "",
        grade: "", 
        division: "", 
        contactNumber: "",
        aadharCardNumber: "",
        penNumber: "",
        grNumber: "",
        religion: "",
        caste: "",
        fullAddress: "",
        photoUrl: "",
    }
  });
  
  const defaultPhotoPlaceholder = isTeacherEditing && studentIdForEdit
    ? `https://placehold.co/128x128.png?text=Edit+Student`
    : `https://placehold.co/128x128.png?text=My+Photo`;

  useEffect(() => {
    const profileUidToFetch = studentIdForEdit || loggedInUser?.uid;

    if (profileUidToFetch) {
      const fetchProfile = async () => {
        setIsFetchingProfile(true);
        setPhotoPreview(null);
        setSelectedFile(null);

        const profileDocRef = doc(db, "studentProfiles", profileUidToFetch);
        const profileDoc = await getDoc(profileDocRef);
        
        const userDocRef = doc(db, "users", profileUidToFetch);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        let dataToReset: ProfileFormValues;

        if (profileDoc.exists()) {
          const data = profileDoc.data() as StudentProfile;
          dataToReset = { 
            firstName: data.firstName || "",
            middleName: data.middleName || "",
            lastName: data.lastName || "",
            motherName: data.motherName || "",
            fatherOccupation: data.fatherOccupation || "",
            motherOccupation: data.motherOccupation || "",
            dateOfBirth: data.dateOfBirth || "",
            gender: data.gender || "",
            grade: data.grade || userData.grade || "1",
            division: data.division || userData.division || "A",
            contactNumber: data.contactNumber || "",
            aadharCardNumber: data.aadharCardNumber || "",
            penNumber: data.penNumber || "",
            grNumber: data.grNumber || "",
            religion: data.religion || "",
            caste: data.caste || "",
            fullAddress: data.fullAddress || "",
            photoUrl: data.photoUrl || "", 
          };
          if (data.photoUrl) {
            setPhotoPreview(data.photoUrl);
          } else {
            setPhotoPreview(defaultPhotoPlaceholder);
          }
        } else {
          const nameParts = userData.displayName?.split(" ") || loggedInUser?.displayName?.split(" ") || [];
          dataToReset = {
            firstName: nameParts[0] || "",
            lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : "",
            grade: userData.grade || loggedInUser?.grade || "1",
            division: userData.division || loggedInUser?.division || "A",
            photoUrl: "",
            motherName: "",
            fatherOccupation: "",
            motherOccupation: "",
            dateOfBirth: "",
            gender: "",
            contactNumber: "",
            aadharCardNumber: "",
            penNumber: "",
            grNumber: "",
            religion: "",
            caste: "",
            fullAddress: "",
          };
          setPhotoPreview(defaultPhotoPlaceholder);
        }
        reset(dataToReset);
        setIsFetchingProfile(false);
      };
      fetchProfile();
    } else if (!isTeacherEditing) { 
        setIsFetchingProfile(false); 
        toast({title: "Error", description: "Could not load user information. Please ensure you are logged in.", variant: "destructive"});
    } else {
       setIsFetchingProfile(false); 
    }
  }, [studentIdForEdit, loggedInUser, reset, defaultPhotoPlaceholder, isTeacherEditing, toast]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > MAX_RAW_FILE_SIZE_BYTES) {
        toast({
          title: "Image File Too Large",
          description: `Please choose an image file smaller than ${MAX_RAW_FILE_SIZE_BYTES / 1024 / 1024}MB. This is a pre-check; a stricter limit applies when saving.`,
          variant: "destructive",
          duration: 7000,
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

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    const profileUidToSave = studentIdForEdit || loggedInUser?.uid;

    if (!profileUidToSave) {
      toast({ title: "Error", description: "User ID not found. Cannot save profile.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    let studentEmail = "";
    const userToUpdateAuth = auth.currentUser;

    if (isTeacherEditing || !loggedInUser?.email) { 
        const userDocRef = doc(db, "users", profileUidToSave);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            studentEmail = userDoc.data().email || "";
        }
    } else {
        studentEmail = loggedInUser?.email || "";
    }

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
            title: "Image Too Large for Profile",
            description: "The selected image is too large (over 1MB after encoding). Please use a smaller image. Your previous photo (if any) is kept.",
            variant: "destructive",
            duration: 7000,
          });
          // finalPhotoUrlToSave remains as data.photoUrl (the one loaded with the form)
        } else {
          finalPhotoUrlToSave = generatedDataUri; 
        }
      } catch (error) {
        console.error("Error processing image file:", error);
        toast({
          title: "Image Processing Error",
          description: "Could not process the selected image file. Your previous photo (if any) is kept.",
          variant: "destructive",
        });
      }
    } else if (data.photoUrl === "" && photoPreview === defaultPhotoPlaceholder) {
      finalPhotoUrlToSave = "";
    }
    
    try {
      const profileDataForFirestore: StudentProfile = {
        uid: profileUidToSave,
        email: studentEmail,
        ...data, 
        photoUrl: finalPhotoUrlToSave, 
      };
      
      const profileDocRef = doc(db, "studentProfiles", profileUidToSave);
      await setDoc(profileDocRef, profileDataForFirestore, { merge: true });

      const userDocRef = doc(db, "users", profileUidToSave);
      await updateDoc(userDocRef, {
        grade: data.grade,
        division: data.division,
        displayName: `${data.firstName} ${data.lastName || ''}`.trim()
      });

      if (!isTeacherEditing && userToUpdateAuth && userToUpdateAuth.uid === profileUidToSave) {
        const newDisplayName = `${data.firstName} ${data.lastName || ''}`.trim();
        if (userToUpdateAuth.displayName !== newDisplayName) {
            await updateAuthProfile(userToUpdateAuth, { displayName: newDisplayName });
            if (setAuthUser) {
              setAuthUser(prevUser => prevUser ? { ...prevUser, displayName: newDisplayName } : null);
            }
        }
      }

      toast({
        title: isTeacherEditing ? "Student Profile Updated" : "Profile Updated",
        description: "Information has been saved successfully.",
      });
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      if (error.code === 'permission-denied') {
        toast({
            title: "Permission Denied",
            description: "You do not have permission to save this profile. Please check Firestore rules.",
            variant: "destructive",
        });
      } else if (error.message && error.message.includes("longer than 1048487 bytes")) {
         toast({
            title: "Image Too Large for Database",
            description: "The selected image is too large to save (over 1MB encoded). Please use a smaller image. Your previous photo (if any) is kept.",
            variant: "destructive",
            duration: 7000,
          });
      } else {
        toast({
            title: "Update Failed",
            description: error.message || "Could not save profile. Please try again.",
            variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setSelectedFile(null); 
      if (finalPhotoUrlToSave) {
        setPhotoPreview(finalPhotoUrlToSave);
      } else {
        setPhotoPreview(defaultPhotoPlaceholder);
      }
    }
  };
  
  if (isFetchingProfile && !studentIdForEdit && !loggedInUser?.uid && !isTeacherEditing) { 
      return (
         <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader>
                <CardTitle>{isTeacherEditing ? "Edit Student Profile" : "My Profile"}</CardTitle>
                <CardDescription>Verifying user...</CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                 <Skeleton className="h-10 w-full" />
            </CardContent>
         </Card>
      )
  }

  if (isFetchingProfile) { 
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle>{isTeacherEditing ? "Edit Student Profile" : "My Profile"}</CardTitle>
          <CardDescription>Loading information...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-32 rounded-full self-center mb-4" />
          {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">
          {isTeacherEditing ? "Edit Student Profile" : "My Profile"}
        </CardTitle>
        <CardDescription>
            {isTeacherEditing ? "Modify the student's information below." : "Keep your information up to date. Fields marked with * are required."}
        </CardDescription>
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
              <Label htmlFor="fatherOccupation">Father's Occupation</Label>
              <Input id="fatherOccupation" {...register("fatherOccupation")} />
              {errors.fatherOccupation && <p className="text-sm text-destructive mt-1">{errors.fatherOccupation.message}</p>}
            </div>
            <div>
              <Label htmlFor="motherOccupation">Mother's Occupation</Label>
              <Input id="motherOccupation" {...register("motherOccupation")} />
              {errors.motherOccupation && <p className="text-sm text-destructive mt-1">{errors.motherOccupation.message}</p>}
            </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
             <div>
              <Label htmlFor="gender">Gender</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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
              <Label htmlFor="photoUpload">Profile Photo</Label>
              <Input 
                id="photoUpload" 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {photoPreview ? (
                  <Image src={photoPreview} alt="Profile Preview" width={128} height={128} className="mt-2 rounded-md object-cover h-32 w-32 border" data-ai-hint="profile photo"/>
              ) : (
                <div className="mt-2 flex items-center justify-center h-32 w-32 rounded-md border border-dashed bg-muted/50">
                  <UploadCloud className="h-12 w-12 text-muted-foreground" data-ai-hint="upload cloud icon" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Upload a photo from your device. (Max 2MB file. Smaller images &lt;1MB recommended for profile photo).</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
             <Label>Grade & Division *</Label>
              <Controller
                name="grade"
                control={control}
                render={({ field: gradeField }) => (
                  <Controller
                    name="division"
                    control={control}
                    render={({ field: divisionField }) => (
                      <GradeDivisionSelector
                        grade={gradeField.value || ""}
                        onGradeChange={gradeField.onChange}
                        division={divisionField.value || ""}
                        onDivisionChange={divisionField.onChange}
                        showDivision={true}
                      />
                    )}
                  />
                )}
              />
               {!isTeacherEditing && <p className="text-xs text-muted-foreground mt-1">Grade and Division are managed by the school.</p>}
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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
